from django.conf import settings
from django.db import models

from catalog.models import Store, Variant
from core.states import STATES


class Order(models.Model):
    """One order per store. A checkout with items from 2 shops creates 2 orders, each with its own bill."""
    class Status(models.TextChoices):
        PENDING = "pending", "Awaiting payment"
        PAID = "paid", "Paid"
        PACKED = "packed", "Packed"
        DELIVERED = "delivered", "Delivered"
        CANCELLED = "cancelled", "Cancelled"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="orders")
    store = models.ForeignKey(Store, on_delete=models.PROTECT, related_name="orders")
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    confirmation_no = models.CharField(max_length=20, unique=True, null=True, blank=True)

    # delivery address copied at checkout (later edits to the saved address must not change old bills)
    ship_name = models.CharField(max_length=150)
    ship_phone = models.CharField(max_length=15)
    ship_line1 = models.CharField(max_length=200)
    ship_line2 = models.CharField(max_length=200, blank=True)
    ship_landmark = models.CharField(max_length=120, blank=True)
    ship_city = models.CharField(max_length=100)
    ship_state_code = models.CharField(max_length=2, choices=STATES)
    ship_pincode = models.CharField(max_length=6)

    intra_state = models.BooleanField(help_text="True = CGST+SGST, False = IGST")
    taxable_value = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    cgst = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    sgst = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    igst = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    razorpay_order_id = models.CharField(max_length=40, blank=True, db_index=True)
    razorpay_payment_id = models.CharField(max_length=40, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Order {self.pk} ({self.confirmation_no or self.status})"


class OrderItem(models.Model):
    """A snapshot of what was bought, so the bill never changes when prices change later."""
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    variant = models.ForeignKey(Variant, on_delete=models.SET_NULL, null=True, blank=True)
    product_code = models.CharField(max_length=40)
    name = models.CharField(max_length=150)
    brand = models.CharField(max_length=100)
    pack = models.CharField(max_length=20)
    hsn_code = models.CharField(max_length=8, blank=True)
    gst_rate = models.DecimalField(max_digits=4, decimal_places=2)
    qty = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, help_text="After discount, incl. GST")
    line_total = models.DecimalField(max_digits=12, decimal_places=2)
    taxable_value = models.DecimalField(max_digits=12, decimal_places=2)
    cgst = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    sgst = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    igst = models.DecimalField(max_digits=12, decimal_places=2, default=0)


class BillLog(models.Model):
    """The separate bill register: one row per bill, with the PDFs and the email status."""
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name="bill")
    bill_no = models.CharField(max_length=40, unique=True)
    store = models.ForeignKey(Store, on_delete=models.PROTECT)
    customer_email = models.EmailField()
    payment_id = models.CharField(max_length=40)
    total = models.DecimalField(max_digits=12, decimal_places=2)
    bill_pdf = models.FileField(upload_to="invoices/")
    packing_pdf = models.FileField(upload_to="invoices/")
    emailed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.bill_no
