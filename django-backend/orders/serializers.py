from rest_framework import serializers

from users.models import Address

from .models import Order, OrderItem


class CheckoutItem(serializers.Serializer):
    variant_id = serializers.IntegerField()
    qty = serializers.IntegerField(min_value=1, max_value=50)


class CheckoutSerializer(serializers.Serializer):
    address_id = serializers.IntegerField()
    items = CheckoutItem(many=True, allow_empty=False)

    def validate_address_id(self, value):
        try:
            return Address.objects.get(pk=value, user=self.context["request"].user)  # only your own address
        except Address.DoesNotExist:
            raise serializers.ValidationError("Address not found.")


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ["product_code", "name", "brand", "pack", "hsn_code", "gst_rate", "qty", "unit_price", "line_total"]


class OrderSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source="store.name")
    items = OrderItemSerializer(many=True)
    has_bill = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = ["id", "confirmation_no", "status", "store_name", "items", "taxable_value", "cgst", "sgst", "igst",
                  "total", "intra_state", "razorpay_order_id", "razorpay_payment_id", "paid_at", "created_at",
                  "ship_name", "ship_phone", "ship_line1", "ship_line2", "ship_city", "ship_state_code",
                  "ship_pincode", "has_bill"]

    def get_has_bill(self, obj):
        return hasattr(obj, "bill")
