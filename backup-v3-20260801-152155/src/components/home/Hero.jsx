function Hero() {
  return (
    <section className="overflow-hidden bg-zinc-950 text-white">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
        <div>
          <span className="inline-flex rounded-full border border-white/20 px-4 py-2 text-xs font-bold text-zinc-200">
            منتجات مختارة بعناية
          </span>

          <h1 className="mt-6 max-w-xl text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
            منتجات عملية تجعل يومك أسهل
          </h1>

          <p className="mt-5 max-w-lg text-base leading-8 text-zinc-300 sm:text-lg">
            اختار المنتج المناسب اطلبه في أقل من دقيقة وادفع عند الاستلام بعد وصوله إليك.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#products"
              className="rounded-xl bg-white px-7 py-4 text-sm font-black text-zinc-950 transition hover:bg-zinc-200"
            >
              تصفح المنتجات
            </a>

            <a
              href="#features"
              className="rounded-xl border border-white/30 px-7 py-4 text-sm font-black text-white transition hover:bg-white/10"
            >
              لماذا تختارنا
            </a>
          </div>
        </div>

        <div className="relative mx-auto aspect-square w-full max-w-md">
          <div className="absolute inset-0 rotate-6 rounded-[3rem] bg-gradient-to-br from-zinc-700 to-zinc-900" />
          <div className="absolute inset-5 flex -rotate-3 items-center justify-center rounded-[2.5rem] border border-white/10 bg-zinc-900 shadow-2xl">
            <div className="text-center">
              <div className="text-7xl">📦</div>
              <p className="mt-5 text-xl font-black">اطلب بسهولة</p>
              <p className="mt-2 text-sm text-zinc-400">وادفع عند الاستلام</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
