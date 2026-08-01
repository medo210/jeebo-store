import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { createProduct, deleteProduct, getAdminProducts, updateProduct } from "../../api/admin";
import { ErrorBox, LoadingBox, Modal, PageHeader } from "../../components/admin/AdminUI";

const emptyForm = {
  name: "", slug: "", description: "", price: "", oldPrice: "",
  badge: "", image: "", status: true, sortOrder: 0,
};

export default function Products() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const query = useQuery({ queryKey: ["admin-products"], queryFn: getAdminProducts });

  const mutation = useMutation({
    mutationFn: (payload) => editing ? updateProduct(editing.id, payload) : createProduct(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      closeModal();
    },
  });

  const removeMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      await queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  function closeModal() {
    setEditing(null);
    setForm(emptyForm);
  }

  function openCreate() {
    setEditing({ mode: "create" });
    setForm(emptyForm);
  }

  function openEdit(product) {
    setEditing(product);
    setForm({
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: product.price,
      oldPrice: product.old_price,
      badge: product.badge || "",
      image: product.image || "",
      status: Boolean(product.status),
      sortOrder: product.sort_order || 0,
    });
  }

  function submit(event) {
    event.preventDefault();
    mutation.mutate(form);
  }

  if (query.isLoading) return <LoadingBox text="جاري تحميل المنتجات..." />;
  if (query.isError) return <ErrorBox message={query.error.message} onRetry={query.refetch} />;

  return (
    <div>
      <PageHeader
        title="إدارة المنتجات"
        description={`${query.data.products.length} منتج`}
        action={
          <button type="button" onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-zinc-950 px-5 py-3 font-black text-white">
            <Plus size={18} /> إضافة منتج
          </button>
        }
      />

      <div className="overflow-hidden rounded-2xl border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-right text-sm">
            <thead className="bg-zinc-50 text-zinc-500">
              <tr>
                <th className="p-4">الصورة</th><th className="p-4">المنتج</th><th className="p-4">الرابط</th>
                <th className="p-4">السعر</th><th className="p-4">الحالة</th><th className="p-4">الترتيب</th><th className="p-4">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {query.data.products.map((product) => (
                <tr key={product.id} className="border-t">
                  <td className="p-4">
                    <div className="h-14 w-14 overflow-hidden rounded-xl bg-zinc-100">
                      {product.image && <img src={product.image} alt="" className="h-full w-full object-cover" />}
                    </div>
                  </td>
                  <td className="p-4 font-black">{product.name}</td>
                  <td className="p-4" dir="ltr">/{product.slug}</td>
                  <td className="p-4 font-black">{product.price} جنيه</td>
                  <td className="p-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${product.status ? "bg-emerald-100 text-emerald-800" : "bg-zinc-200 text-zinc-600"}`}>
                      {product.status ? "مفعل" : "متوقف"}
                    </span>
                  </td>
                  <td className="p-4">{product.sort_order}</td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => openEdit(product)} className="rounded-lg border p-2.5" aria-label="تعديل"><Pencil size={17} /></button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("هل تريد حذف المنتج نهائيًا؟")) removeMutation.mutate(product.id);
                        }}
                        className="rounded-lg border border-red-200 p-2.5 text-red-700"
                        aria-label="حذف"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={Boolean(editing)} onClose={closeModal} title={editing?.mode === "create" ? "إضافة منتج" : "تعديل المنتج"} width="max-w-3xl">
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          {[
            ["name", "اسم المنتج", "text"],
            ["slug", "رابط المنتج بالإنجليزية", "text"],
            ["price", "السعر", "number"],
            ["oldPrice", "السعر قبل الخصم", "number"],
            ["badge", "شارة المنتج", "text"],
            ["image", "رابط الصورة", "text"],
            ["sortOrder", "ترتيب الظهور", "number"],
          ].map(([name, label, type]) => (
            <label key={name} className="grid gap-2">
              <span className="font-bold">{label}</span>
              <input
                type={type}
                required={["name", "slug", "price"].includes(name)}
                value={form[name]}
                onChange={(event) => setForm((value) => ({ ...value, [name]: event.target.value }))}
                className="h-12 rounded-xl border px-4 outline-none focus:border-zinc-950"
                dir={name === "slug" || name === "image" ? "ltr" : undefined}
              />
            </label>
          ))}

          <label className="grid gap-2 sm:col-span-2">
            <span className="font-bold">الوصف</span>
            <textarea
              required
              rows="5"
              value={form.description}
              onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))}
              className="rounded-xl border p-4 outline-none focus:border-zinc-950"
            />
          </label>

          <label className="flex items-center gap-3 rounded-xl bg-zinc-100 p-4 sm:col-span-2">
            <input
              type="checkbox"
              checked={form.status}
              onChange={(event) => setForm((value) => ({ ...value, status: event.target.checked }))}
            />
            <span className="font-bold">المنتج مفعل ويظهر في المتجر</span>
          </label>

          {mutation.isError && <p className="text-sm font-bold text-red-700 sm:col-span-2">{mutation.error.message}</p>}

          <button type="submit" disabled={mutation.isPending} className="rounded-xl bg-zinc-950 px-6 py-4 font-black text-white sm:col-span-2 disabled:opacity-60">
            {mutation.isPending ? "جاري الحفظ..." : "حفظ المنتج"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
