import { useState } from "react";
import { createOrder } from "../../services/orders";

const governorates = [
  "القاهرة",
  "الجيزة",
  "الإسكندرية",
  "الدقهلية",
  "دمياط",
  "الشرقية",
  "الغربية",
  "المنوفية",
  "القليوبية",
  "البحيرة",
  "كفر الشيخ",
  "بورسعيد",
  "الإسماعيلية",
  "السويس",
  "الفيوم",
  "بني سويف",
  "المنيا",
  "أسيوط",
  "سوهاج",
  "قنا",
  "الأقصر",
  "أسوان",
  "البحر الأحمر",
  "الوادي الجديد",
  "مطروح",
  "شمال سيناء",
  "جنوب سيناء",
];

function OrderForm({ product }) {
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [orderId, setOrderId] = useState(null);

  const total = product.price * quantity;

  async function handleSubmit(event) {
    event.preventDefault();

    const form = event.currentTarget;

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const formData = new FormData(form);

    setStatus("sending");
    setMessage("");

    try {
      const result = await createOrder({
        customerName: formData.get("customerName"),
        phone: formData.get("phone"),
        governorate: formData.get("governorate"),
        address: formData.get("address"),
        productSlug: product.slug,
        productName: product.name,
        quantity,
        unitPrice: product.price,
      });

      setOrderId(result.orderId);
      setStatus("success");
      form.reset();
      setQuantity(1);
    } catch (error) {
      console.error(error);
      setMessage(error.message || "تعذر تسجيل الطلب. حاول مرة أخرى.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div
        id="order-form"
        className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-center sm:p-8"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-3xl font-black text-white">
          ✓
        </div>

        <h3 className="mt-5 text-2xl font-black text-emerald-950">
          تم استلام طلبك بنجاح
        </h3>

        <p className="mt-3 leading-7 text-emerald-800">
          رقم طلبك:
          <strong className="mx-1 text-xl">#{orderId}</strong>
        </p>

        <p className="mt-2 text-sm leading-7 text-emerald-700">
          سنتواصل معك قريبا لتأكيد البيانات وتكلفة الشحن.
        </p>

        <button
          type="button"
          onClick={() => {
            setStatus("idle");
            setOrderId(null);
            setMessage("");
          }}
          className="mt-6 rounded-xl bg-emerald-950 px-6 py-3 text-sm font-black text-white"
        >
          عمل طلب آخر
        </button>
      </div>
    );
  }

  return (
    <form
      id="order-form"
      onSubmit={handleSubmit}
      className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7"
    >
      <div className="mb-6">
        <p className="text-sm font-bold text-zinc-500">أكمل بياناتك</p>

        <h2 className="mt-1 text-2xl font-black text-zinc-950">
          اطلب الآن والدفع عند الاستلام
        </h2>
      </div>

      <div className="grid gap-4">
        <label className="grid gap-2">
          <span className="text-sm font-bold text-zinc-800">
            الاسم بالكامل
          </span>

          <input
            type="text"
            name="customerName"
            required
            minLength="3"
            maxLength="100"
            autoComplete="name"
            placeholder="اكتب اسمك"
            className="h-13 rounded-xl border border-zinc-300 bg-white px-4 outline-none transition focus:border-zinc-950"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-bold text-zinc-800">
            رقم الموبايل
          </span>

          <input
            type="tel"
            name="phone"
            required
            inputMode="numeric"
            autoComplete="tel"
            pattern="01[0125][0-9]{8}"
            maxLength="11"
            placeholder="01xxxxxxxxx"
            title="اكتب رقم موبايل مصري صحيح مكون من 11 رقما"
            dir="ltr"
            className="h-13 rounded-xl border border-zinc-300 bg-white px-4 text-left outline-none transition focus:border-zinc-950"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-bold text-zinc-800">المحافظة</span>

          <select
            name="governorate"
            required
            defaultValue=""
            className="h-13 rounded-xl border border-zinc-300 bg-white px-4 outline-none transition focus:border-zinc-950"
          >
            <option value="" disabled>
              اختر المحافظة
            </option>

            {governorates.map((governorate) => (
              <option key={governorate} value={governorate}>
                {governorate}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-bold text-zinc-800">
            العنوان بالتفصيل
          </span>

          <textarea
            name="address"
            required
            minLength="8"
            maxLength="300"
            autoComplete="street-address"
            placeholder="المنطقة الشارع رقم المنزل وأقرب علامة مميزة"
            rows="3"
            className="resize-none rounded-xl border border-zinc-300 bg-white px-4 py-3 outline-none transition focus:border-zinc-950"
          />
        </label>

        <div className="grid gap-2">
          <span className="text-sm font-bold text-zinc-800">الكمية</span>

          <div className="flex h-13 items-center justify-between rounded-xl border border-zinc-300 px-3">
            <button
              type="button"
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              disabled={status === "sending"}
              aria-label="تقليل الكمية"
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-xl font-black disabled:opacity-50"
            >
              −
            </button>

            <strong className="text-lg">{quantity}</strong>

            <button
              type="button"
              onClick={() => setQuantity((value) => Math.min(10, value + 1))}
              disabled={status === "sending"}
              aria-label="زيادة الكمية"
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-950 text-xl font-black text-white disabled:opacity-50"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-zinc-100 p-4">
        <div className="flex items-center justify-between">
          <span className="font-bold text-zinc-600">الإجمالي</span>

          <strong className="text-2xl font-black text-zinc-950">
            {total} جنيه
          </strong>
        </div>

        <p className="mt-2 text-xs text-zinc-500">
          مصاريف الشحن يتم تأكيدها معك حسب المحافظة.
        </p>
      </div>

      {status === "error" && (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-6 text-red-800"
        >
          {message}
        </div>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="mt-5 w-full rounded-2xl bg-zinc-950 px-6 py-4 text-base font-black text-white transition hover:bg-zinc-800 disabled:cursor-wait disabled:opacity-60"
      >
        {status === "sending" ? "جاري تسجيل الطلب..." : "تأكيد الطلب الآن"}
      </button>

      <p className="mt-4 text-center text-xs leading-6 text-zinc-500">
        بالضغط على تأكيد الطلب سيتواصل معك فريقنا لتأكيد البيانات.
      </p>
    </form>
  );
}

export default OrderForm;
