from decimal import ROUND_HALF_UP, Decimal

from django.db import models

from core.states import STATES


class Store(models.Model):
    """A shop / supermarket. Its state decides CGST+SGST (same state) or IGST (other state)."""
    slug = models.SlugField(unique=True)
    name = models.CharField(max_length=150)
    owner_email = models.EmailField(help_text="Receives the bill and packing list for every paid order.")
    gstin = models.CharField("GSTIN", max_length=15, blank=True)
    state_code = models.CharField(max_length=2, choices=STATES)
    address = models.CharField(max_length=300, blank=True)
    pincode = models.CharField(max_length=6, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class Category(models.Model):
    """The cards on the Product page (Rice, Oil, Sugar ...)."""
    slug = models.SlugField(unique=True)
    name = models.CharField(max_length=100)
    image_url = models.CharField(max_length=300, blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "name"]
        verbose_name_plural = "categories"

    def __str__(self):
        return self.name


class Product(models.Model):
    """One product type, e.g. 'Basmati Rice'. Brands and pack sizes live in Variant."""
    code = models.CharField("Product ID", max_length=40, unique=True)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name="products")
    name = models.CharField(max_length=150)
    description = models.CharField(max_length=300, blank=True)
    image_url = models.CharField(max_length=300, blank=True)
    hsn_code = models.CharField("HSN", max_length=8, blank=True)
    gst_rate = models.DecimalField("GST %", max_digits=4, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["category__sort_order", "name"]

    def __str__(self):
        return f"{self.code} - {self.name}"


class Variant(models.Model):
    """What a store sells: one brand in one pack size, with its own price and stock."""
    UNITS = [("kg", "kg"), ("l", "litre"), ("pc", "piece")]
    sku = models.CharField(max_length=60, unique=True)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="variants")
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name="variants")
    brand = models.CharField(max_length=100)
    pack_size = models.DecimalField(max_digits=8, decimal_places=3, help_text="e.g. 0.25 for 250 g")
    unit = models.CharField(max_length=2, choices=UNITS, default="kg")
    price = models.DecimalField("Price incl. GST", max_digits=10, decimal_places=2)
    discount_percent = models.PositiveIntegerField(default=0)
    stock = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["brand", "unit", "pack_size"]

    @property
    def final_price(self):
        return (self.price * (100 - self.discount_percent) / 100).quantize(Decimal("0.01"), ROUND_HALF_UP)

    @property
    def pack_label(self):
        return f"{self.pack_size.normalize():f} {self.unit}"

    def __str__(self):
        return f"{self.product.name} / {self.brand} / {self.pack_label} @ {self.store.slug}"
