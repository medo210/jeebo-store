import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, ExternalLink, Phone, RefreshCw, Search, Trash2 } from "lucide-react";
import { deleteOrder, getAdminOrders, updateOrder } from "../../api/admin";
import { ErrorBox, LoadingBox, Modal, PageHeader, StatusBadge } from "../../components/admin/AdminUI";

const statusOptions = [
  ["", "كل الحالات"],
  ["new", "جديد"],
  ["confirmed", "تم التأكيد"],
  ["shipped", "تم الشحن"],
  ["delivered", "تم التسليم"],
  ["cancelled", "ملغي"],
];

export default function Orders() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [draftStatus, setDraftStatus] = useState("new");
  const [notes, setNotes] = useState("");

  const query = useQuery({
    queryKey: ["admin-orders", search, status, page],
    queryFn: () => getAdminOrders({ search, status, page, limit: 20 }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateOrder(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      setSelected(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteOrder,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      setSelected(null);
    },
  });

  const orders = query.data?.orders || [];
  const pagination = query.data?.pagination;

  function openOrder(order) {
    setSelected(order);
    setDraftStatus(order.status);
    setNotes(order.notes || "");
  }

  function whatsappUrl(phone) {
    const clean = String(phone).replace(/\D/g, "");
    const egypt = clean.startsWith("0") ? `20${clean.slice(1)}` : clean;
    return `https://wa.me/${egypt}`;
  }

  if (query.isLoading) return <LoadingBox text="جاري تحميل الطلبات..." />;
  if (query.isError) return <ErrorBox message={query.error.message} onRetry={query.refetch} />;

  return (
    <div>
      <PageHeader
        title="إدارة الطلبات"
        description={`${pagination?.total || 0} طلب مسجل`}
        action={
          <button type="button" onClick={() => query.refetch()} className="flex items-center gap-2 rounded-xl border bg-white px-4 py-3 font-bold">
            <RefreshCw size={17} /> تحديث
          </button>
        }
      />

      <div className="mb-5 grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-[1fr_220px]">
        <label className="relative">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            placeholder="ابحث بالاسم أو الهاتف أو المنتج..."
            className="h-12 w-full rounded-xl border border-zinc-300 pr-11 pl-4 outline-none focus:border-zinc-950"
          />
        </label>
        <select
          value={status}
          onChange={(event) => { setStatus(event.target.value); setPage(1); }}
          className="h-12 rounded-xl border border-zinc-300 bg-white px-4 outline-none"
        >
          {statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-right text-sm">
            <thead className="bg-zinc-50 text-zinc-500">
              <tr>
                <th className="p-4">#</th><th className="p-4">العميل</th><th className="p-4">الهاتف</th>
                <th className="p-4">المنتج</th><th className="p-4">المحافظة</th>
                <th className="p-4">الإجمالي</th><th className="p-4">الحالة</th><th className="p-4">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t transition hover:bg-zinc-50">
                  <td className="p-4 font-black">{order.id}</td>
                  <td className="p-4 font-bold">{order.customer_name}</td>
                  <td className="p-4" dir="ltr">{order.phone}</td>
                  <td className="p-4">{order.product_name} × {order.quantity}</td>
                  <td className="p-4">{order.governorate}</td>
                  <td className="p-4 font-black">{order.total} جنيه</td>
                  <td className="p-4"><StatusBadge status={order.status} /></td>
                  <td className="p-4">
                    <button type="button" onClick={() => openOrder(order)} className="rounded-lg bg-zinc-950 px-4 py-2 font-bold text-white">
                      التفاصيل
                    </button>
                  </td>
                </tr>
              ))}
              {!orders.length && (
                <tr><td colSpan="8" className="p-14 text-center text-zinc-500">لا توجد طلبات مطابقة.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t p-4">
          <button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border px-4 py-2 font-bold disabled:opacity-40">
            السابق
          </button>
          <span className="text-sm font-bold">صفحة {pagination?.page} من {pagination?.pages}</span>
          <button disabled={page >= pagination?.pages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border px-4 py-2 font-bold disabled:opacity-40">
            التالي
          </button>
        </div>
      </div>

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={`تفاصيل الطلب #${selected?.id || ""}`}>
        {selected && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["العميل", selected.customer_name],
                ["الهاتف", selected.phone],
                ["المحافظة", selected.governorate],
                ["المنتج", `${selected.product_name} × ${selected.quantity}`],
                ["سعر الوحدة", `${selected.unit_price} جنيه`],
                ["الإجمالي", `${selected.total} جنيه`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-zinc-100 p-4">
                  <p className="text-xs font-bold text-zinc-500">{label}</p>
                  <p className="mt-1 font-black">{value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border p-4">
              <p className="text-xs font-bold text-zinc-500">العنوان</p>
              <p className="mt-2 leading-7">{selected.address}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <a href={`tel:${selected.phone}`} className="flex items-center justify-center gap-2 rounded-xl border px-4 py-3 font-bold">
                <Phone size={17} /> اتصال
              </a>
              <a href={whatsappUrl(selected.phone)} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white">
                <ExternalLink size={17} /> واتساب
              </a>
              <button type="button" onClick={() => navigator.clipboard.writeText(`${selected.customer_name}\n${selected.phone}\n${selected.governorate}\n${selected.address}`)} className="flex items-center justify-center gap-2 rounded-xl border px-4 py-3 font-bold">
                <Copy size={17} /> نسخ البيانات
              </button>
            </div>

            <label className="grid gap-2">
              <span className="font-bold">حالة الطلب</span>
              <select value={draftStatus} onChange={(event) => setDraftStatus(event.target.value)} className="h-12 rounded-xl border bg-white px-4">
                {statusOptions.slice(1).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="font-bold">ملاحظات الإدارة</span>
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows="4" className="rounded-xl border p-4" placeholder="اكتب أي ملاحظات عن الطلب..." />
            </label>

            {updateMutation.isError && <p className="text-sm font-bold text-red-700">{updateMutation.error.message}</p>}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                disabled={updateMutation.isPending}
                onClick={() => updateMutation.mutate({ id: selected.id, payload: { status: draftStatus, notes } })}
                className="flex-1 rounded-xl bg-zinc-950 px-5 py-3.5 font-black text-white disabled:opacity-60"
              >
                {updateMutation.isPending ? "جاري الحفظ..." : "حفظ التغييرات"}
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  if (confirm("هل أنت متأكد من حذف الطلب نهائيًا؟")) deleteMutation.mutate(selected.id);
                }}
                className="flex items-center justify-center gap-2 rounded-xl border border-red-300 px-5 py-3.5 font-bold text-red-700"
              >
                <Trash2 size={17} /> حذف
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
