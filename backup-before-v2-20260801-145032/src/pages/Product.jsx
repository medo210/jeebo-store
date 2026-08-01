import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import ProductGallery from "../components/product/ProductGallery";
import OrderForm from "../components/product/OrderForm";
import { getProduct } from "../services/api";

const benefits = [
  {
    title: "الدفع عند الاستلام",
    description: "مش هتدفع أي مبلغ قبل وصول المنتج إليك.",
  },
  {
    title: "تأكيد الطلب هاتفيا",
    description: "نتواصل معك للتأكد من البيانات قبل الشحن.",
  },
  {
    title: "شحن لكل المحافظات",
    description: "توصيل سريع وآمن حتى باب المنزل.",
  },
  {
    title: "منتج مختار بعناية",
    description: "نهتم بالقيمة والجودة قبل إضافة أي منتج.",
  },
];

const reviews = [
  {
    name: "أحمد م.",
    text: "الطلب وصل كويس والتعامل كان محترم جدا.",
  },
  {
    name: "محمد ع.",
    text: "المنتج عملي والسعر مناسب مقارنة بالجودة.",
  },
  {
    name: "سارة أ.",
    text: "تم تأكيد الطلب بسرعة ووصل في الموعد.",
  },
];

const questions = [
  {
    question: "هل الدفع مقدم",
    answer: "لا الدفع عند استلام المنتج من مندوب الشحن.",
  },
  {
    question: "هل يوجد شحن لجميع المحافظات",
    answer: "نعم نوصل إلى جميع محافظات مصر ويتم تأكيد تكلفة الشحن معك.",
  },
  {
    question: "متى يتم تأكيد الطلب",
    answer: "يتواصل معك فريق التأكيد بعد تسجيل الطلب لمراجعة بياناتك.",
  },
];

function Stars() {
  return (
    <div
      className="flex items-center gap-1 text-amber-500"
      aria-label="تقييم المنتج 5 من 5"
    >
      <span>★</span>
      <span>★</span>
      <span>★</span>
      <span>★</span>
      <span>★</span>
    </div>
  );
}

function LoadingPage() {
  return (
    <div dir="rtl" className="min-h-screen bg-white">
      <Navbar />

      <main className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2">
        <div className="aspect-square animate-pulse rounded-3xl bg-zinc-200" />

        <div className="space-y-5 pt-5">
          <div className="h-7 w-28 animate-pulse rounded-full bg-zinc-200" />
          <div className="h-14 w-3/4 animate-pulse rounded bg-zinc-200" />
          <div className="h-5 w-full animate-pulse rounded bg-zinc-100" />
          <div className="h-5 w-4/5 animate-pulse rounded bg-zinc-100" />
          <div className="h-32 animate-pulse rounded-3xl bg-zinc-100" />
        </div>
      </main>
    </div>
  );
}

function ProductError({ notFound = false }) {
  return (
    <main
      dir="rtl"
      className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 text-center"
    >
      <p className="text-sm font-black text-zinc-500">
        {notFound ? "خطأ 404" : "تعذر التحميل"}
      </p>

      <h1 className="mt-2 text-4xl font-black text-zinc-950">
        {notFound ? "المنتج غير موجود" : "حصل خطأ أثناء تحميل المنتج"}
      </h1>

      <p className="mt-4 text-zinc-600">
        {notFound
          ? "قد يكون رابط المنتج تغير أو تم حذف المنتج."
          : "راجع اتصال الإنترنت وحاول مرة أخرى."}
      </p>

      <div className="mt-7 flex flex-wrap justify-center gap-3">
        {!notFound && (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-2xl border border-zinc-300 bg-white px-7 py-4 font-black"
          >
            إعادة المحاولة
          </button>
        )}

        <Link
          to="/"
          className="rounded-2xl bg-zinc-950 px-7 py-4 font-black text-white"
        >
          الرجوع للمتجر
        </Link>
      </div>
    </main>
  );
}

function Product() {
  const { slug } = useParams();

  const [product, setProduct] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    const controller = new AbortController();

    async function loadProduct() {
      setStatus("loading");

      try {
        const data = await getProduct(slug, controller.signal);

        if (!data) {
          setStatus("not-found");
          return;
        }

        setProduct(data);
        setStatus("success");
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error(error);
          setStatus("error");
        }
      }
    }

    loadProduct();

    return () => controller.abort();
  }, [slug]);

  if (status === "loading") {
    return <LoadingPage />;
  }

  if (status === "not-found") {
    return <ProductError notFound />;
  }

  if (status === "error" || !product) {
    return <ProductError />;
  }

  const discount =
    product.oldPrice > product.price
      ? Math.round(
          ((product.oldPrice - product.price) / product.oldPrice) * 100,
        )
      : 0;

  return (
    <div dir="rtl" className="min-h-screen bg-white text-zinc-950">
      <Navbar />

      <main className="pb-24 lg:pb-0">
        <div className="border-b border-zinc-200 bg-zinc-50">
          <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 text-xs text-zinc-500 sm:px-6 sm:text-sm">
            <Link to="/" className="transition hover:text-zinc-950">
              الرئيسية
            </Link>

            <span>/</span>

            <span className="truncate">{product.name}</span>
          </div>
        </div>

        <section className="mx-auto grid max-w-7xl gap-10 px-4 py-8 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:py-16">
          <ProductGallery product={product} />

          <div className="lg:pt-4">
            <div className="flex flex-wrap items-center gap-2">
              {product.badge && (
                <span className="rounded-full bg-zinc-950 px-3 py-1.5 text-xs font-black text-white">
                  {product.badge}
                </span>
              )}

              {discount > 0 && (
                <span className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-black text-red-700">
                  خصم {discount}%
                </span>
              )}
            </div>

            <h1 className="mt-5 text-3xl font-black leading-tight sm:text-5xl">
              {product.name}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Stars />
              <span className="text-sm font-bold text-zinc-500">4.9 من 5</span>
              <span className="text-sm text-zinc-300">|</span>
              <span className="text-sm font-bold text-zinc-500">
                أكثر من 100 طلب
              </span>
            </div>

            <p className="mt-6 max-w-xl text-base leading-8 text-zinc-600 sm:text-lg">
              {product.description}
            </p>

            <div className="mt-7 rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
              <p className="text-sm font-bold text-zinc-500">
                السعر بعد الخصم
              </p>

              <div className="mt-2 flex flex-wrap items-end gap-3">
                <strong className="text-4xl font-black">
                  {product.price} جنيه
                </strong>

                {product.oldPrice > product.price && (
                  <span className="pb-1 text-lg text-zinc-400 line-through">
                    {product.oldPrice} جنيه
                  </span>
                )}
              </div>

              {product.oldPrice > product.price && (
                <p className="mt-3 text-sm font-bold text-emerald-700">
                  وفرت {product.oldPrice - product.price} جنيه
                </p>
              )}
            </div>

            <a
              href="#order-form"
              className="mt-6 block w-full rounded-2xl bg-zinc-950 px-6 py-4 text-center text-base font-black text-white transition hover:bg-zinc-800"
            >
              اطلب الآن — الدفع عند الاستلام
            </a>

            <p className="mt-3 text-center text-xs leading-6 text-zinc-500">
              لن تدفع شيئا الآن سنتواصل معك لتأكيد الطلب.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {benefits.map((benefit) => (
                <div
                  key={benefit.title}
                  className="rounded-2xl border border-zinc-200 p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-sm font-black text-white">
                      ✓
                    </span>

                    <div>
                      <h2 className="font-black">{benefit.title}</h2>

                      <p className="mt-1 text-sm leading-6 text-zinc-500">
                        {benefit.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-zinc-200 bg-zinc-50 py-14 sm:py-20">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_460px]">
            <div>
              <p className="text-sm font-black text-zinc-500">تفاصيل المنتج</p>

              <h2 className="mt-2 text-3xl font-black sm:text-4xl">
                منتج عملي للاستخدام اليومي
              </h2>

              <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-600">
                تم اختيار هذا المنتج ليقدم لك فائدة حقيقية وسهولة في
                الاستخدام مع سعر مناسب وإمكانية الدفع بعد وصول الطلب.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {[
                  "سهل وسريع الاستخدام",
                  "تصميم عملي ومناسب",
                  "قيمة جيدة مقابل السعر",
                  "لا يحتاج دفعا مقدما",
                  "شحن إلى جميع المحافظات",
                  "تأكيد الطلب قبل الشحن",
                ].map((feature) => (
                  <div
                    key={feature}
                    className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-black text-emerald-800">
                      ✓
                    </span>

                    <span className="font-bold text-zinc-800">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <OrderForm product={product} />
          </div>
        </section>

        <section className="bg-white py-14 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="text-center">
              <p className="text-sm font-black text-zinc-500">آراء العملاء</p>

              <h2 className="mt-2 text-3xl font-black sm:text-4xl">
                ماذا قال عملاؤنا
              </h2>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {reviews.map((review) => (
                <article
                  key={review.name}
                  className="rounded-3xl border border-zinc-200 p-6"
                >
                  <Stars />

                  <p className="mt-5 leading-8 text-zinc-700">
                    “{review.text}”
                  </p>

                  <p className="mt-5 font-black">{review.name}</p>

                  <p className="mt-1 text-xs font-bold text-emerald-700">
                    عميل موثق
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-zinc-50 py-14 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <div className="text-center">
              <p className="text-sm font-black text-zinc-500">
                الأسئلة الشائعة
              </p>

              <h2 className="mt-2 text-3xl font-black sm:text-4xl">
                عندك استفسار
              </h2>
            </div>

            <div className="mt-9 space-y-3">
              {questions.map((item) => (
                <details
                  key={item.question}
                  className="group rounded-2xl border border-zinc-200 bg-white p-5"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-black">
                    <span>{item.question}</span>

                    <span className="text-2xl transition group-open:rotate-45">
                      +
                    </span>
                  </summary>

                  <p className="mt-4 border-t border-zinc-100 pt-4 leading-7 text-zinc-600">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white p-3 shadow-2xl lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-zinc-500">
              {product.name}
            </p>

            <p className="font-black">{product.price} جنيه</p>
          </div>

          <a
            href="#order-form"
            className="mr-auto rounded-xl bg-zinc-950 px-6 py-3 text-sm font-black text-white"
          >
            اطلب الآن
          </a>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default Product;
