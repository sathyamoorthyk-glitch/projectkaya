from django.contrib import admin

from .models import Category, Product, Store, Variant


@admin.register(Store)
class StoreAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "state_code", "owner_email", "is_active")


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "sort_order")
    prepopulated_fields = {"slug": ("name",)}


class VariantInline(admin.TabularInline):
    model = Variant
    extra = 0


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "category", "hsn_code", "gst_rate", "is_active")
    list_filter = ("category", "is_active")
    search_fields = ("code", "name")
    inlines = [VariantInline]


@admin.register(Variant)
class VariantAdmin(admin.ModelAdmin):
    list_display = ("sku", "product", "brand", "pack_size", "unit", "store", "price", "discount_percent", "stock", "is_active")
    list_filter = ("store", "unit", "is_active")
    search_fields = ("sku", "brand", "product__name")
