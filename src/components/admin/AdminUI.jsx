export function PageHeader({ title, description, action }) {
  return (
    <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-3xl font-black sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 text-sm text-zinc-500">{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function LoadingBox({ text = "جاري التحميل..." }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center text-zinc-500">
      {text}
    </div>
  );
}

export function ErrorBox({ message, onRetry }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-800">
      <p className="font-bold">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-4 rounded-xl bg-red-900 px-5 py-2.5 font-bold text-white">
          إعادة المحاولة
        </button>
      )}
    </div>
  );
}

export function StatusBadge({ status }) {
  const map = {
    new: ["جديد", "bg-amber-100 text-amber-800"],
    confirmed: ["تم التأكيد", "bg-emerald-100 text-emerald-800"],
    shipped: ["تم الشحن", "bg-blue-100 text-blue-800"],
    delivered: ["تم التسليم", "bg-violet-100 text-violet-800"],
    cancelled: ["ملغي", "bg-red-100 text-red-800"],
  };
  const [label, className] = map[status] || [status || "غير محدد", "bg-zinc-100 text-zinc-700"];
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${className}`}>{label}</span>;
}

export function Modal({ open, onClose, title, children, width = "max-w-2xl" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button type="button" aria-label="إغلاق" onClick={onClose} className="absolute inset-0 bg-black/50" />
      <section className={`relative max-h-[90vh] w-full overflow-y-auto rounded-3xl bg-white shadow-2xl ${width}`}>
        <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-5">
          <h2 className="text-xl font-black">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg border px-3 py-1.5 font-bold">×</button>
        </header>
        <div className="p-6">{children}</div>
      </section>
    </div>
  );
}
