"""Loads ProductData.json into PostgreSQL. Safe to run again and again (it updates, never duplicates)."""
from collections import Counter
from decimal import Decimal, InvalidOperation

from django.db import transaction

from core.states import STATE_NAMES

from .models import Category, Product, Store, Variant


def _need(obj, key, where):
    if obj.get(key) in (None, ""):
        raise ValueError(f"Missing '{key}' in {where}")
    return obj[key]


def _dec(value, where):
    try:
        return Decimal(str(value))
    except InvalidOperation:
        raise ValueError(f"Bad number '{value}' in {where}")


@transaction.atomic
def sync_catalog(data, prune=False):
    if not isinstance(data, dict):
        raise ValueError("ProductData.json must be an object with 'stores' and 'categories'.")
    stats = Counter()
    stores = {}

    for s in data.get("stores", []):
        slug = _need(s, "slug", "a store")
        if str(s.get("state_code", "")) not in STATE_NAMES:
            raise ValueError(f"Store '{slug}': state_code must be a GST state code such as '33'.")
        obj, created = Store.objects.update_or_create(slug=slug, defaults={
            "name": _need(s, "name", f"store {slug}"),
            "owner_email": _need(s, "owner_email", f"store {slug}"),
            "gstin": s.get("gstin", ""), "state_code": str(s["state_code"]),
            "address": s.get("address", ""), "pincode": s.get("pincode", ""),
            "phone": s.get("phone", ""), "is_active": True,
        })
        stores[slug] = obj
        stats["stores_created" if created else "stores_updated"] += 1

    seen_codes, seen_skus = set(), set()
    for order, c in enumerate(data.get("categories", [])):
        cslug = _need(c, "slug", "a category")
        category, _ = Category.objects.update_or_create(slug=cslug, defaults={
            "name": _need(c, "name", f"category {cslug}"), "image_url": c.get("image", ""), "sort_order": order})
        for p in c.get("products", []):
            code = _need(p, "code", f"category {cslug}")
            rate = _dec(p.get("gst_rate", 0), f"product {code}")
            if not 0 <= rate <= 40:
                raise ValueError(f"Product {code}: gst_rate must be between 0 and 40.")
            product, created = Product.objects.update_or_create(code=code, defaults={
                "category": category, "name": _need(p, "name", f"product {code}"),
                "description": p.get("description", ""), "image_url": p.get("image", ""),
                "hsn_code": str(p.get("hsn", "")), "gst_rate": rate, "is_active": True})
            seen_codes.add(code)
            stats["products_created" if created else "products_updated"] += 1

            for v in p.get("variants", []):
                sku = _need(v, "sku", f"product {code}")
                where = f"variant {sku}"
                store = stores.get(v.get("store")) or Store.objects.filter(slug=v.get("store")).first()
                if not store:
                    raise ValueError(f"{where}: unknown store '{v.get('store')}'")
                price, size = _dec(_need(v, "price", where), where), _dec(_need(v, "size", where), where)
                discount = int(v.get("discount_percent", 0))
                if price <= 0 or size <= 0 or not 0 <= discount <= 90:
                    raise ValueError(f"{where}: price/size must be positive and discount 0-90.")
                _, created = Variant.objects.update_or_create(sku=sku, defaults={
                    "product": product, "store": store, "brand": _need(v, "brand", where),
                    "pack_size": size, "unit": v.get("unit", "kg"), "price": price,
                    "discount_percent": discount, "stock": int(v.get("stock", 0)), "is_active": True})
                seen_skus.add(sku)
                stats["variants_created" if created else "variants_updated"] += 1

    if prune:  # hide (not delete) anything that is no longer in the file, so old orders stay intact
        stats["variants_hidden"] = Variant.objects.exclude(sku__in=seen_skus).filter(is_active=True).update(is_active=False)
        stats["products_hidden"] = Product.objects.exclude(code__in=seen_codes).filter(is_active=True).update(is_active=False)
    return dict(stats)
