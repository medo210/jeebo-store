$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "Updating Orders API and UI..." -ForegroundColor Cyan

New-Item -ItemType Directory -Force -Path ".\functions\api\admin" | Out-Null
New-Item -ItemType Directory -Force -Path ".\src\pages\admin" | Out-Null

@'
function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const search = String(url.searchParams.get("search") || "").trim();
    const status = String(url.searchParams.get("status") || "").trim();
    const page = Math.max(Number.parseInt(url.searchParams.get("page") || "1", 10), 1);
    const limit = Math.min(Math.max(Number.parseInt(url.searchParams.get("limit") || "20", 10), 5), 100);
    const offset = (page - 1) * limit;

    const conditions = [];
    const values = [];

    if (search) {
      conditions.push(`(
        o.customer_name LIKE ? OR
        o.phone LIKE ? OR
        o.product_name LIKE ? OR
        o.governorate LIKE ? OR
        o.order_number LIKE ?
      )`);
      const q = `%${search}%`;
      values.push(q, q, q, q, q);
    }

    if (status) {
      conditions.push("o.status = ?");
      values.push(status);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [ordersResult, countResult] = await Promise.all([
      env.jeebo_db.prepare(`
        SELECT
          o.id,
          o.order_number,
          o.created_at,
          o.customer_name,
          o.phone,
          o.governorate,
          o.address,
          o.product_slug,
          o.product_name,
          o.quantity,
          o.unit_price,
          COALESCE(o.subtotal, o.unit_price * o.quantity) AS subtotal,
          COALESCE(o.shipping_cost, 0) AS shipping_cost,
          o.total,
          o.status,
          o.notes,
          COALESCE(p.image, '') AS product_image
        FROM orders o
        LEFT JOIN products p ON p.slug = o.product_slug
        ${where}
        ORDER BY o.id DESC
        LIMIT ? OFFSET ?
      `).bind(...values, limit, offset).all(),

      env.jeebo_db.prepare(`
        SELECT COUNT(*) AS total
        FROM orders o
        ${where}
      `).bind(...values).first(),
    ]);

    return json({
      success: true,
      orders: ordersResult.results || [],
      pagination: {
        page,
        limit,
        total: Number(countResult?.total || 0),
        pages: Math.max(Math.ceil(Number(countResult?.total || 0) / limit), 1),
      },
    });
  } catch (error) {
    console.error("Admin orders error:", error);
    return json({ success: false, message: "تعذر تحميل الطلبات." }, 500);
  }
}
'@ | Set-Content -Encoding utf8 ".\functions\api\admin\orders.js"

@'
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Copy,
  ExternalLink,
  Phone,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import {
  deleteOrder,
  getAdminOrders,
  getAdminProducts,
  updateOrder,
} from "../../api/admin";
import {
  ErrorBox,
  LoadingBox,
  Modal,
  PageHeader,
  StatusBadge,
} from "../../components/admin/AdminUI";

const statusOptions = [
  ["", "كل الحالات"],
  ["new", "جديد"],
  ["confirmed", "تم التأكيد"],
  ["shipped", "تم الشحن"],
  ["delivered", "تم التسليم"],
  ["cancelled", "ملغي"],
];

const governorates = [
  "القاهرة","الجيزة","الإسكندرية","الدقهلية","دمياط","الشرقية","الغربية",
  "المنوفية","القليوبية","البحيرة","كفر الشيخ","بورسعيد","الإسماعيلية",
  "السويس","الفيوم","بني سويف","المنيا","أسيوط","سوهاج","قنا",
  "الأقصر","أسوان","البحر الأحمر","الوادي الجديد","مطروح","شمال سيناء","جنوب سيناء"
];

function formatDate(value) {
  if (!value) return "—";

  try {
    const normalized = value.includes("T") ? value : value.replace(" ", "T");
    const date = new Date(normalized.endsWith("Z") ? normalized : `${normalized}Z`);

    return new Intl.DateTimeFormat("ar-EG", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Africa/Cairo",
    }).format(date);
  } catch {
    return value;
  }
}

export default function Orders() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(null);

  const query = useQuery({
    queryKey: ["admin-orders", search, status, page],
    queryFn: () => getAdminOrders({ search, status, page, limit: 20 }),
  });

  const productsQuery = useQuery({
    queryKey: ["admin-products"],
    queryFn: getAdminProducts,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateOrder(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      setSelected(null);
      setForm(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteOrder,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      setSelected(null);
      setForm(null);
    },
  });

  const orders = query.data?.orders || [];
  const pagination = query.data?.pagination;
  const products = productsQuery.data?.products || [];

  function openOrder(order) {
    setForm({
      customerName: order.customer_name || "",
      phone: order.phone || "",
      governorate: order.governorate || "",
      address: order.address || "",
      productSlug: order.product_slug || "",
      quantity: Number(order.quantity || 1),
      unitPrice: Number(order.unit_price || 0),
      status: order.status || "new",
      notes: order.notes || "",
    });

    setSelected({ ...order });
  }

  function whatsappUrl(phone) {
    const clean = String(phone).replace(/\D/g, "");
    const egypt = clean.startsWith("0") ? `20${clean.slice(1)}` : clean;
    return `https://wa.me/${egypt}`;
  }

  if (query.isLoading) {
    return <LoadingBox text="جاري تحميل الطلبات..." />;
  }

  if (query.isError) {
    return <ErrorBox message={query.error.message} onRetry={query.refetch} />;
  }

  return (
    <div>
      <PageHeader
        title="إدارة الطلبات"
        description={`${pagination?.total || 0} طلب مسجل`}
        action={
          <button
            type="button"
            onClick={() => query.refetch()}
            className="flex items-center gap-2 rounded-xl border bg-white px-4 py-3 font-bold"
          >
            <RefreshCw size={17} />
            تحديث
          </button>
        }
      />

      <div className="mb-5 grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-[1fr_220px]">
        <label className="relative">
          <Search
            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400"
            size={18}
          />

          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="ابحث بالاسم أو الهاتف أو رقم الطلب..."
            className="h-12 w-full rounded-xl border border-zinc-300 pr-11 pl-4 outline-none"
          />
        </label>

        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          className="h-12 rounded-xl border bg-white px-4"
        >
          {statusOptions.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1300px] text-right text-sm">
            <thead className="bg-zinc-50 text-zinc-500">
              <tr>
                <th className="p-4">رقم الطلب</th>
                <th className="p-4">التاريخ</th>
                <th className="p-4">العميل</th>
                <th className="p-4">المنتج</th>
                <th className="p-4">الهاتف</th>
                <th className="p-4">المحافظة</th>
                <th className="p-4">الشحن</th>
                <th className="p-4">الإجمالي</th>
                <th className="p-4">الحالة</th>
                <th className="p-4">إجراء</th>
              </tr>
            </thead>

            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t hover:bg-zinc-50">
                  <td className="p-4 font-black">
                    {order.order_number || `#${order.id}`}
                  </td>

                  <td className="p-4 text-xs">
                    {formatDate(order.created_at)}
                  </td>

                  <td className="p-4 font-bold">
                    {order.customer_name}
                  </td>

                  <td className="p-4">
                    <div className="flex min-w-[210px] items-center gap-3">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border bg-zinc-100">
                        {order.product_image ? (
                          <img
                            src={order.product_image}
                            alt={order.product_name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
                            بلا صورة
                          </div>
                        )}
                      </div>

                      <span>
                        {order.product_name} × {order.quantity}
                      </span>
                    </div>
                  </td>

                  <td className="p-4" dir="ltr">
                    {order.phone}
                  </td>

                  <td className="p-4">
                    {order.governorate}
                  </td>

                  <td className="p-4">
                    {Number(order.shipping_cost || 0)} جنيه
                  </td>

                  <td className="p-4 font-black">
                    {Number(order.total || 0)} جنيه
                  </td>

                  <td className="p-4">
                    <StatusBadge status={order.status} />
                  </td>

                  <td className="p-4">
                    <button
                      type="button"
                      disabled={productsQuery.isLoading}
                      onClick={() => openOrder(order)}
                      className="rounded-lg bg-zinc-950 px-4 py-2 font-bold text-white disabled:opacity-50"
                    >
                      تعديل
                    </button>
                  </td>
                </tr>
              ))}

              {!orders.length && (
                <tr>
                  <td
                    colSpan="10"
                    className="p-14 text-center text-zinc-500"
                  >
                    لا توجد طلبات مطابقة.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t p-4">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((value) => value - 1)}
            className="rounded-lg border px-4 py-2 font-bold disabled:opacity-40"
          >
            السابق
          </button>

          <span className="text-sm font-bold">
            صفحة {pagination?.page} من {pagination?.pages}
          </span>

          <button
            type="button"
            disabled={page >= pagination?.pages}
            onClick={() => setPage((value) => value + 1)}
            className="rounded-lg border px-4 py-2 font-bold disabled:opacity-40"
          >
            التالي
          </button>
        </div>
      </div>

      <Modal
        open={Boolean(selected && form)}
        onClose={() => {
          setSelected(null);
          setForm(null);
        }}
        title={`تعديل الطلب ${
          selected?.order_number || `#${selected?.id || ""}`
        }`}
        width="max-w-4xl"
      >
        {selected && form && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              updateMutation.mutate({
                id: selected.id,
                payload: form,
              });
            }}
            className="grid gap-4 sm:grid-cols-2"
          >
            <div className="flex items-center gap-4 rounded-xl bg-zinc-100 p-4 sm:col-span-2">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border bg-white">
                {selected.product_image ? (
                  <img
                    src={selected.product_image}
                    alt={selected.product_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-zinc-400">
                    بلا صورة
                  </div>
                )}
              </div>

              <div>
                <p className="font-black">
                  {selected.order_number || `#${selected.id}`}
                </p>
                <p className="mt-1 text-sm text-zinc-500">
                  {formatDate(selected.created_at)}
                </p>
              </div>
            </div>

            <label className="grid gap-2">
              <span className="font-bold">اسم العميل</span>
              <input
                required
                minLength="3"
                value={form.customerName}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    customerName: event.target.value,
                  }))
                }
                className="h-12 rounded-xl border px-4"
              />
            </label>

            <label className="grid gap-2">
              <span className="font-bold">رقم الهاتف</span>
              <input
                required
                dir="ltr"
                pattern="01[0125][0-9]{8}"
                value={form.phone}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    phone: event.target.value,
                  }))
                }
                className="h-12 rounded-xl border px-4 text-left"
              />
            </label>

            <label className="grid gap-2">
              <span className="font-bold">المحافظة</span>
              <select
                value={form.governorate}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    governorate: event.target.value,
                  }))
                }
                className="h-12 rounded-xl border bg-white px-4"
              >
                {governorates.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="font-bold">المنتج</span>
              <select
                value={form.productSlug}
                onChange={(event) => {
                  const product = products.find(
                    (item) => item.slug === event.target.value,
                  );

                  setForm((value) => ({
                    ...value,
                    productSlug: event.target.value,
                    unitPrice: product
                      ? Number(product.price)
                      : value.unitPrice,
                  }));
                }}
                className="h-12 rounded-xl border bg-white px-4"
              >
                {products.map((product) => (
                  <option key={product.id} value={product.slug}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="font-bold">الكمية</span>
              <input
                type="number"
                min="1"
                max="100"
                value={form.quantity}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    quantity: event.target.value,
                  }))
                }
                className="h-12 rounded-xl border px-4"
              />
            </label>

            <label className="grid gap-2">
              <span className="font-bold">سعر الوحدة</span>
              <input
                type="number"
                min="1"
                value={form.unitPrice}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    unitPrice: event.target.value,
                  }))
                }
                className="h-12 rounded-xl border px-4"
              />
            </label>

            <label className="grid gap-2">
              <span className="font-bold">حالة الطلب</span>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    status: event.target.value,
                  }))
                }
                className="h-12 rounded-xl border bg-white px-4"
              >
                {statusOptions.slice(1).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <div className="rounded-xl bg-zinc-100 p-4">
              <p className="text-xs font-bold text-zinc-500">
                المجموع بدون الشحن
              </p>
              <p className="mt-1 text-xl font-black">
                {Number(form.quantity || 0) *
                  Number(form.unitPrice || 0)}{" "}
                جنيه
              </p>
            </div>

            <label className="grid gap-2 sm:col-span-2">
              <span className="font-bold">العنوان بالتفصيل</span>
              <textarea
                required
                minLength="8"
                rows="3"
                value={form.address}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    address: event.target.value,
                  }))
                }
                className="rounded-xl border p-4"
              />
            </label>

            <label className="grid gap-2 sm:col-span-2">
              <span className="font-bold">ملاحظات الإدارة</span>
              <textarea
                rows="4"
                value={form.notes}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    notes: event.target.value,
                  }))
                }
                className="rounded-xl border p-4"
              />
            </label>

            <div className="grid gap-3 sm:col-span-2 sm:grid-cols-3">
              <a
                href={`tel:${form.phone}`}
                className="flex items-center justify-center gap-2 rounded-xl border px-4 py-3 font-bold"
              >
                <Phone size={17} />
                اتصال
              </a>

              <a
                href={whatsappUrl(form.phone)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white"
              >
                <ExternalLink size={17} />
                واتساب
              </a>

              <button
                type="button"
                onClick={() =>
                  navigator.clipboard.writeText(
                    `${form.customerName}\n${form.phone}\n${form.governorate}\n${form.address}`,
                  )
                }
                className="flex items-center justify-center gap-2 rounded-xl border px-4 py-3 font-bold"
              >
                <Copy size={17} />
                نسخ البيانات
              </button>
            </div>

            {updateMutation.isError && (
              <p className="font-bold text-red-700 sm:col-span-2">
                {updateMutation.error.message}
              </p>
            )}

            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="rounded-xl bg-zinc-950 px-5 py-4 font-black text-white sm:col-span-2 disabled:opacity-60"
            >
              {updateMutation.isPending
                ? "جاري الحفظ..."
                : "حفظ كل التعديلات"}
            </button>

            <button
              type="button"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (
                  confirm("هل أنت متأكد من حذف الطلب نهائيًا؟")
                ) {
                  deleteMutation.mutate(selected.id);
                }
              }}
              className="flex items-center justify-center gap-2 rounded-xl border border-red-300 px-5 py-3.5 font-bold text-red-700 sm:col-span-2"
            >
              <Trash2 size={17} />
              حذف الطلب نهائيًا
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
}
'@ | Set-Content -Encoding utf8 ".\src\pages\admin\Orders.jsx"

Write-Host "Building..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { throw "Build failed" }

Write-Host "Deploying..." -ForegroundColor Yellow
npx wrangler pages deploy dist --project-name jeebo-store --branch main
if ($LASTEXITCODE -ne 0) { throw "Deploy failed" }

Write-Host "Orders patch deployed successfully." -ForegroundColor Green
