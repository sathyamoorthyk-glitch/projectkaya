import hashlib
import hmac
import logging
from collections import defaultdict
from decimal import Decimal

import requests
from django.conf import settings
from django.core.files.base import ContentFile
from django.db import transaction
from django.db.models import F, Value
from django.db.models.functions import Greatest
from django.utils import timezone
from rest_framework.exceptions import APIException, ValidationError

from catalog.models import Variant
from core.mailer import send_mail_safe

from .models import BillLog, Order, OrderItem
from .pdf import build_bill_pdf, build_packing_pdf
from .tax import ZERO, q, split_inclusive

log = logging.getLogger(__name__)


class PaymentUnavailable(APIException):
    status_code = 503
    default_detail = "Online payment is not available right now. Please try again later."


@transaction.atomic
def create_orders(user, address, items):
    """Re-prices everything from the database (never trusts prices sent by the browser)."""
    wanted = defaultdict(int)
    for it in items:
        wanted[it["variant_id"]] += it["qty"]
    variants = {v.id: v for v in Variant.objects.select_related("product", "store").filter(
        id__in=wanted, is_active=True, product__is_active=True, store__is_active=True)}
    if len(variants) != len(wanted):
        raise ValidationError({"detail": "Some items in your cart are no longer available. Please review your cart."})

    by_store = defaultdict(list)
    for vid, qty in wanted.items():
        v = variants[vid]
        if v.stock < qty:
            raise ValidationError({"detail": f"Only {v.stock} left of {v.product.name} ({v.brand}, {v.pack_label})."})
        by_store[v.store].append((v, qty))

    orders = []
    for store, lines in by_store.items():
        intra = store.state_code == address.state_code
        order = Order.objects.create(
            user=user, store=store, intra_state=intra, ship_name=address.full_name, ship_phone=address.phone,
            ship_line1=address.line1, ship_line2=address.line2, ship_landmark=address.landmark,
            ship_city=address.city, ship_state_code=address.state_code, ship_pincode=address.pincode)
        sums = dict(taxable=ZERO, cgst=ZERO, sgst=ZERO, igst=ZERO, total=ZERO)
        for v, qty in lines:
            line_total = q(v.final_price * qty)
            t = split_inclusive(line_total, v.product.gst_rate, intra)
            OrderItem.objects.create(
                order=order, variant=v, product_code=v.product.code, name=v.product.name, brand=v.brand,
                pack=v.pack_label, hsn_code=v.product.hsn_code, gst_rate=v.product.gst_rate, qty=qty,
                unit_price=v.final_price, line_total=line_total, taxable_value=t["taxable"],
                cgst=t["cgst"], sgst=t["sgst"], igst=t["igst"])
            for k in ("taxable", "cgst", "sgst", "igst"):
                sums[k] += t[k]
            sums["total"] += line_total
        order.taxable_value, order.cgst, order.sgst = sums["taxable"], sums["cgst"], sums["sgst"]
        order.igst, order.total = sums["igst"], sums["total"]
        order.save()
        orders.append(order)
    return orders


def razorpay_create_order(total, receipt):
    if not (settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET):
        raise PaymentUnavailable()
    try:
        r = requests.post("https://api.razorpay.com/v1/orders",
                          auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET), timeout=15,
                          json={"amount": int(q(total) * 100), "currency": "INR", "receipt": receipt[:40]})
        r.raise_for_status()
        return r.json()["id"]
    except (requests.RequestException, KeyError, ValueError):
        log.exception("Razorpay order creation failed")
        raise PaymentUnavailable()


def valid_checkout_signature(rz_order_id, payment_id, signature):
    secret = settings.RAZORPAY_KEY_SECRET.encode()
    expected = hmac.new(secret, f"{rz_order_id}|{payment_id}".encode(), hashlib.sha256).hexdigest()
    return bool(signature) and hmac.compare_digest(expected, str(signature))


def valid_webhook_signature(body: bytes, signature: str):
    secret = settings.RAZORPAY_WEBHOOK_SECRET.encode()
    if not secret:
        return False
    return hmac.compare_digest(hmac.new(secret, body, hashlib.sha256).hexdigest(), signature or "")


def financial_year(dt):
    start = dt.year if dt.month >= 4 else dt.year - 1
    return f"{start}-{str(start + 1)[2:]}"


def mark_paid(rz_order_id, payment_id):
    """Idempotent: the browser callback and the Razorpay webhook may both call this."""
    newly_paid = []
    with transaction.atomic():
        orders = Order.objects.select_for_update().filter(razorpay_order_id=rz_order_id)
        for o in orders:
            if o.status != Order.Status.PENDING:
                continue
            now = timezone.now()
            o.status, o.razorpay_payment_id, o.paid_at = Order.Status.PAID, payment_id, now
            o.confirmation_no = f"KG{timezone.localtime(now):%y%m%d}-{o.pk:05d}"
            o.save()
            for it in o.items.filter(variant__isnull=False):
                Variant.objects.filter(pk=it.variant_id).update(stock=Greatest(F("stock") - it.qty, Value(0)))
            newly_paid.append(o)
    for o in newly_paid:
        try:
            finalize_order(o)
        except Exception:
            log.exception("Bill/email step failed for order %s (payment is safe)", o.pk)
    return list(Order.objects.filter(razorpay_order_id=rz_order_id))


def finalize_order(order):
    """After payment: create bill + packing list PDFs, save the bill log row, email customer and shop owner."""
    bill_no = f"KG/{financial_year(timezone.localtime(order.paid_at))}/{order.pk:06d}"
    bill_pdf, pack_pdf = build_bill_pdf(order, bill_no), build_packing_pdf(order)
    stem = bill_no.replace("/", "-")
    log_row = BillLog(order=order, bill_no=bill_no, store=order.store, customer_email=order.user.email,
                      payment_id=order.razorpay_payment_id, total=order.total)
    log_row.bill_pdf.save(f"{stem}-bill.pdf", ContentFile(bill_pdf), save=False)
    log_row.packing_pdf.save(f"{stem}-packing.pdf", ContentFile(pack_pdf), save=False)
    log_row.save()

    files = [(f"{stem}-bill.pdf", bill_pdf, "application/pdf"), (f"{stem}-packing-list.pdf", pack_pdf, "application/pdf")]
    facts = (f"Confirmation no: {order.confirmation_no}\nRazorpay payment reference: {order.razorpay_payment_id}\n"
             f"Store: {order.store.name}\nAmount paid: Rs. {order.total}\nBill no: {bill_no}")
    sent_customer = send_mail_safe(
        f"Payment received - order {order.confirmation_no}",
        f"Hi {order.ship_name},\n\nThank you for shopping with {settings.SHOP_NAME}. Your payment is confirmed.\n\n"
        f"{facts}\n\nYour bill and packing list are attached.", order.user.email, files)
    send_mail_safe(
        f"New paid order {order.confirmation_no} - Rs. {order.total}",
        f"A new order has been paid.\n\n{facts}\n\nCustomer: {order.ship_name} ({order.user.email}, {order.ship_phone})\n"
        f"Deliver to: {order.ship_line1}, {order.ship_city} - {order.ship_pincode}\n\nBill and packing list are attached.",
        order.store.owner_email, files)
    if sent_customer:
        log_row.emailed_at = timezone.now()
        log_row.save(update_fields=["emailed_at"])
