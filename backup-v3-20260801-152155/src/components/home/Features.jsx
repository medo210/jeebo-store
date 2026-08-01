const features = [
  {
    icon: "💵",
    title: "الدفع عند الاستلام",
    text: "لن تدفع شيئا قبل استلام طلبك."
  },
  {
    icon: "🚚",
    title: "شحن لكل المحافظات",
    text: "نوصل طلبك إلى باب منزلك."
  },
  {
    icon: "✅",
    title: "منتجات مختارة",
    text: "نختار المنتجات العملية ذات القيمة الحقيقية."
  },
  {
    icon: "☎️",
    title: "تأكيد سريع",
    text: "نتواصل معك لتأكيد بيانات الطلب."
  }
];

function Features() {
  return (
    <section id="features" className="scroll-mt-24 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-black text-zinc-950 sm:text-4xl">
            لماذا تطلب من Jeebo
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-zinc-200 p-6 text-center"
            >
              <div className="text-4xl">{feature.icon}</div>
              <h3 className="mt-4 text-lg font-black text-zinc-950">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                {feature.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Features;
