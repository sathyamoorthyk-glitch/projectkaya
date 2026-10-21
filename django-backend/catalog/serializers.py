from rest_framework import serializers

from .models import Category, Product, Variant


class VariantSerializer(serializers.ModelSerializer):
    store = serializers.CharField(source="store.slug")
    store_name = serializers.CharField(source="store.name")
    store_state = serializers.CharField(source="store.state_code")
    final_price = serializers.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        model = Variant
        fields = ["id", "sku", "store", "store_name", "store_state", "brand", "pack_size", "unit",
                  "price", "discount_percent", "final_price", "stock"]


class ProductSerializer(serializers.ModelSerializer):
    category = serializers.CharField(source="category.slug")
    category_name = serializers.CharField(source="category.name")
    variants = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ["id", "code", "name", "description", "image_url", "hsn_code", "gst_rate",
                  "category", "category_name", "variants"]

    def get_variants(self, obj):
        # active_variants is prepared by the view (prefetch), so no query per product
        return VariantSerializer(getattr(obj, "active_variants", []), many=True).data


class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Category
        fields = ["slug", "name", "image_url", "product_count"]
