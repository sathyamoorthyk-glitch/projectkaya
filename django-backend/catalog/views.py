import json

from django.db.models import Count, Prefetch, Q
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.generics import ListAPIView, RetrieveAPIView, get_object_or_404
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Category, Product, Store, Variant
from .serializers import CategorySerializer, ProductSerializer
from .sync import sync_catalog


def products_queryset(store_slug=None):
    variants = Variant.objects.filter(is_active=True, store__is_active=True).select_related("store")
    if store_slug:
        variants = variants.filter(store__slug=store_slug)
    return (Product.objects.filter(is_active=True, variants__in=variants).distinct()
            .select_related("category")
            .prefetch_related(Prefetch("variants", queryset=variants, to_attr="active_variants")))


class PublicView:
    permission_classes = [AllowAny]
    authentication_classes = []


class CategoryList(PublicView, ListAPIView):
    serializer_class = CategorySerializer
    pagination_class = None

    def get_queryset(self):
        return (Category.objects
                .annotate(product_count=Count("products", filter=Q(products__is_active=True), distinct=True))
                .filter(product_count__gt=0))


class CategoryDetail(PublicView, APIView):
    """The 'More' page: every product type in the category with all brands and pack sizes."""
    def get(self, request, slug):
        category = get_object_or_404(Category, slug=slug)
        products = products_queryset(request.query_params.get("store")).filter(category=category)
        return Response({
            "category": {"slug": category.slug, "name": category.name, "image_url": category.image_url},
            "products": ProductSerializer(products, many=True).data,
        })


class ProductDetail(PublicView, RetrieveAPIView):
    serializer_class = ProductSerializer

    def get_queryset(self):
        return products_queryset(self.request.query_params.get("store"))


class SearchView(PublicView, APIView):
    def get(self, request):
        q = request.query_params.get("q", "").strip()
        if len(q) < 2:
            return Response([])
        qs = products_queryset().filter(
            Q(name__icontains=q) | Q(code__iexact=q) | Q(category__name__icontains=q)
            | Q(variants__brand__icontains=q)
        ).distinct()[:30]
        return Response(ProductSerializer(qs, many=True).data)


class StoreList(PublicView, APIView):
    def get(self, request):
        stores = Store.objects.filter(is_active=True)
        return Response([{"slug": s.slug, "name": s.name, "state_code": s.state_code,
                          "address": s.address} for s in stores])


class SyncView(APIView):
    """Staff only. Body = the contents of ProductData.json. Query ?prune=1 hides items missing from it."""
    permission_classes = [IsAdminUser]

    def post(self, request):
        try:
            data = request.data if isinstance(request.data, dict) else json.loads(request.body)
            stats = sync_catalog(data, prune=request.query_params.get("prune") == "1")
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)})
        return Response(stats)
