import json

from django.conf import settings
from django.db import transaction
from django.http import FileResponse
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Order
from .serializers import CheckoutSerializer, OrderSerializer
from .services import (create_orders, mark_paid, razorpay_create_order, valid_checkout_signature,
                       valid_webhook_signature)


def paid_orders(user):
    return (Order.objects.filter(user=user).exclude(status=Order.Status.PENDING)
            .select_related("store").prefetch_related("items"))


class CheckoutView(APIView):
    """Step 1 of payment: create the orders (one per store) and ONE Razorpay order for the whole total."""
    def post(self, request):
        s = CheckoutSerializer(data=request.data, context={"request": request})
        s.is_valid(raise_exception=True)
        address = s.validated_data["address_id"]
        with transaction.atomic():  # if Razorpay fails, the pending orders are rolled back too
            orders = create_orders(request.user, address, s.validated_data["items"])
            total = sum(o.total for o in orders)
            rz_id = razorpay_create_order(total, f"KG-{orders[0].pk}")
            for o in orders:
                o.razorpay_order_id = rz_id
                o.save(update_fields=["razorpay_order_id"])
        return Response({
            "razorpay_key_id": settings.RAZORPAY_KEY_ID,   # public key only; the secret never leaves the server
            "razorpay_order_id": rz_id,
            "amount_paise": int(total * 100),
            "total": total,
            "store_count": len(orders),
        })


class VerifyPaymentView(APIView):
    """Step 2: the browser reports success; we verify Razorpay's signature before trusting it."""
    def post(self, request):
        rid = request.data.get("razorpay_order_id", "")
        pid = request.data.get("razorpay_payment_id", "")
        if not valid_checkout_signature(rid, pid, request.data.get("razorpay_signature", "")):
            raise ValidationError({"detail": "Payment verification failed. If money was deducted, it will be reconciled automatically."})
        if not Order.objects.filter(razorpay_order_id=rid, user=request.user).exists():
            raise NotFound("Order not found.")
        mark_paid(rid, pid)
        return Response(OrderSerializer(paid_orders(request.user).filter(razorpay_order_id=rid), many=True).data)


class RazorpayWebhookView(APIView):
    """Safety net: confirms payment even if the customer closes the browser right after paying."""
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        if not valid_webhook_signature(request.body, request.headers.get("X-Razorpay-Signature", "")):
            return Response(status=400)
        try:
            body = json.loads(request.body)
            if body.get("event") in ("payment.captured", "order.paid"):
                pay = body["payload"]["payment"]["entity"]
                mark_paid(pay["order_id"], pay["id"])
        except (ValueError, KeyError, TypeError):
            return Response(status=400)
        return Response({"ok": True})


class OrderList(APIView):
    def get(self, request):
        qs = paid_orders(request.user)
        rid = request.query_params.get("razorpay_order_id")
        if rid:
            qs = qs.filter(razorpay_order_id=rid)
        return Response(OrderSerializer(qs, many=True).data)


class PdfDownload(APIView):
    kind = "bill"

    def get(self, request, pk):
        order = Order.objects.filter(pk=pk, user=request.user).select_related("bill").first()
        if not order or not hasattr(order, "bill"):
            raise NotFound("Not available yet.")
        f = order.bill.bill_pdf if self.kind == "bill" else order.bill.packing_pdf
        name = f"{order.bill.bill_no.replace('/', '-')}-{self.kind}.pdf"
        return FileResponse(f.open("rb"), content_type="application/pdf", as_attachment=True, filename=name)


class BillDownload(PdfDownload):
    kind = "bill"


class PackingDownload(PdfDownload):
    kind = "packing"
