import { useEffect, useState } from "react";
import ProductCard from "../common/ProductCard";
import { getProducts } from "../../services/api";

function ProductSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <div className="aspect-square animate-pulse bg-zinc-200" />
      <div className="space-y-4 p-5">
        <div className="h-6 w-2/3 animate-pulse rounded bg-zinc-200" />
        <div className="h-4 w-full animate-pulse rounded bg-zinc-100" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-zinc-100" />
        <div className="h-12 animate-pulse rounded-xl bg-zinc-200" />
      </div>
    </div>
  );
}

function FeaturedProducts() {
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      try {
        const data = await getProducts(controller.signal);
        setProducts(data);
        setStatus("success");
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error(error);
          setStatus("error");
        }
      }
    }

    loadProducts();

    return () => controller.abort();
  }, []);

  return (
    <section
      id="products"
      className="scroll-mt-24 bg-zinc-50 py-16 sm:py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <p className="text-sm font-black text-zinc-500">
            اختياراتنا لك
          </p>

          <h2 className="mt-2 text-3xl font-black text-zinc-950 sm:text-4xl">
            المنتجات الأكثر طلبا
          </h2>
        </div>

        {status === "loading" && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <ProductSkeleton />
            <ProductSkeleton />
            <ProductSkeleton />
          </div>
        )}

        {status === "error" && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="font-black text-red-900">
              تعذر تحميل المنتجات حاليا
            </p>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-xl bg-red-900 px-6 py-3 text-sm font-black text-white"
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {status === "success" && products.length === 0 && (
          <p className="text-center text-zinc-500">
            لا توجد منتجات متاحة حاليا.
          </p>
        )}

        {status === "success" && products.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default FeaturedProducts;
