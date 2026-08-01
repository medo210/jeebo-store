import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getSettings, saveSettings } from "../../api/admin";
import { ErrorBox, LoadingBox, PageHeader } from "../../components/admin/AdminUI";

export default function Settings() {
  const query = useQuery({ queryKey: ["admin-settings"], queryFn: getSettings });
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (query.data?.settings) {
      const s = query.data.settings;
      setForm({
        storeName: s.store_name || "Jeebo",
        whatsapp: s.whatsapp || "",
        shippingNote: s.shipping_note || "",
        metaPixel: s.meta_pixel || "",
        tiktokPixel: s.tiktok_pixel || "",
        telegramBotToken: s.telegram_bot_token || "",
        telegramChatId: s.telegram_chat_id || "",
      });
    }
  }, [query.data]);

  const mutation = useMutation({ mutationFn: saveSettings });

  if (query.isLoading || !form) return <LoadingBox text="جاري تحميل الإعدادات..." />;
  if (query.isError) return <ErrorBox message={query.error.message} onRetry={query.refetch} />;

  const fields = [
    ["storeName", "اسم المتجر", "text"],
    ["whatsapp", "رقم واتساب", "text"],
    ["metaPixel", "Meta Pixel ID", "text"],
    ["tiktokPixel", "TikTok Pixel ID", "text"],
    ["telegramBotToken", "Telegram Bot Token", "password"],
    ["telegramChatId", "Telegram Chat ID", "text"],
  ];

  return (
    <div>
      <PageHeader title="الإعدادات" description="إعدادات المتجر والتتبع والإشعارات." />

      <form
        onSubmit={(event) => { event.preventDefault(); mutation.mutate(form); }}
        className="max-w-3xl rounded-2xl border bg-white p-6 sm:p-8"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          {fields.map(([name, label, type]) => (
            <label key={name} className="grid gap-2">
              <span className="font-bold">{label}</span>
              <input
                type={type}
                value={form[name]}
                onChange={(event) => setForm((value) => ({ ...value, [name]: event.target.value }))}
                className="h-12 rounded-xl border px-4 outline-none focus:border-zinc-950"
                dir={name === "storeName" ? undefined : "ltr"}
              />
            </label>
          ))}

          <label className="grid gap-2 sm:col-span-2">
            <span className="font-bold">ملاحظة الشحن</span>
            <textarea
              rows="4"
              value={form.shippingNote}
              onChange={(event) => setForm((value) => ({ ...value, shippingNote: event.target.value }))}
              className="rounded-xl border p-4 outline-none focus:border-zinc-950"
            />
          </label>
        </div>

        {mutation.isSuccess && <p className="mt-5 rounded-xl bg-emerald-50 p-4 font-bold text-emerald-800">تم حفظ الإعدادات بنجاح.</p>}
        {mutation.isError && <p className="mt-5 rounded-xl bg-red-50 p-4 font-bold text-red-800">{mutation.error.message}</p>}

        <button type="submit" disabled={mutation.isPending} className="mt-6 w-full rounded-xl bg-zinc-950 px-6 py-4 font-black text-white disabled:opacity-60">
          {mutation.isPending ? "جاري الحفظ..." : "حفظ الإعدادات"}
        </button>
      </form>
    </div>
  );
}
