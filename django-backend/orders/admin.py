from django.contrib import admin

from .models import BillLog, Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    can_delete = False
    readonly_fields = [f.name for f in OrderItem._meta.fields]


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("confirmation_no", "store", "user", "status", "total", "paid_at")
    list_filter = ("status", "store")
    search_fields = ("confirmation_no", "user__email", "razorpay_payment_id", "razorpay_order_id")
    inlines = [OrderItemInline]  # staff can move status Paid -> Packed -> Delivered here


@admin.register(BillLog)
class BillLogAdmin(admin.ModelAdmin):
    list_display = ("bill_no", "store", "customer_email", "total", "payment_id", "emailed_at", "created_at")
    list_filter = ("store",)
    search_fields = ("bill_no", "customer_email", "payment_id")
    readonly_fields = [f.name for f in BillLog._meta.fields]
