$ErrorActionPreference = "Stop"

Write-Host "=== Jeebo Admin Full Setup ===" -ForegroundColor Cyan

# Ensure folders
$folders = @(
  ".\src\api",
  ".\src\components\admin",
  ".\src\pages\admin",
  ".\functions\api\admin",
  ".\functions\api\admin\orders",
  ".\functions\api\admin\products"
)
foreach ($folder in $folders) {
  New-Item -ItemType Directory -Force -Path $folder | Out-Null
}

# -------------------------
# Database upgrades (remote)
# -------------------------
Write-Host "Preparing D1 tables..." -ForegroundColor Yellow

npx wrangler d1 execute jeebo-db --remote --command="CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY CHECK (id = 1), store_name TEXT NOT NULL DEFAULT 'Jeebo', whatsapp TEXT DEFAULT '', shipping_note TEXT DEFAULT 'مصاريف الشحن يتم تأكيدها حسب المحافظة', meta_pixel TEXT DEFAULT '', tiktok_pixel TEXT DEFAULT '', telegram_bot_token TEXT DEFAULT '', telegram_chat_id TEXT DEFAULT '', updated_at TEXT DEFAULT CURRENT_TIMESTAMP); INSERT OR IGNORE INTO settings (id, store_name) VALUES (1, 'Jeebo');"

npx wrangler d1 execute jeebo-db --remote --command="CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at); CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status); CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(phone); CREATE INDEX IF NOT EXISTS idx_products_status_sort ON products(status, sort_order);"

# -------------------------
# API: Dashboard
# -------------------------
@'
function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function onRequestGet({ env }) {
  try {
    const [summary, statuses, latest, topProducts] = await Promise.all([
      env.jeebo_db.prepare(`
        SELECT
          COUNT(*) AS total_orders,
          COALESCE(SUM(total), 0) AS total_value,
          SUM(CASE WHEN date(created_at) = date('now') THEN 1 ELSE 0 END) AS today_orders,
          COALESCE(SUM(CASE WHEN date(created_at) = date('now') THEN total ELSE 0 END), 0) AS today_value
        FROM orders
      `).first(),

      env.jeebo_db.prepare(`
        SELECT status, COUNT(*) AS total
        FROM orders
        GROUP BY status
      `).all(),

      env.jeebo_db.prepare(`
        SELECT id, order_number, customer_name, phone, product_name, total, status, created_at
        FROM orders
        ORDER BY id DESC
        LIMIT 6
      `).all(),

      env.jeebo_db.prepare(`
        SELECT product_name, SUM(quantity) AS units, COUNT(*) AS orders_count, SUM(total) AS value
        FROM orders
        GROUP BY product_name
        ORDER BY units DESC
        LIMIT 5
      `).all(),
    ]);

    return json({
      success: true,
      summary: {
        totalOrders: Number(summary?.total_orders || 0),
        totalValue: Number(summary?.total_value || 0),
        todayOrders: Number(summary?.today_orders || 0),
        todayValue: Number(summary?.today_value || 0),
      },
      statuses: statuses.results || [],
      latestOrders: latest.results || [],
      topProducts: topProducts.results || [],
    });
  } catch (error) {
    console.error(error);
    return json({ success: false, message: "تعذر تحميل لوحة التحكم." }, 500);
  }
}
'@ | Set-Content -Encoding utf8 .\functions\api\admin\dashboard.js

# -------------------------
# API: Orders list
# -------------------------
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
        customer_name LIKE ? OR
        phone LIKE ? OR
        product_name LIKE ? OR
        governorate LIKE ? OR
        CAST(id AS TEXT) LIKE ?
      )`);
      const q = `%${search}%`;
      values.push(q, q, q, q, q);
    }

    if (status) {
      conditions.push("status = ?");
      values.push(status);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [orders, count] = await Promise.all([
      env.jeebo_db
        .prepare(`
          SELECT
            id, order_number, created_at, customer_name, phone,
            governorate, address, product_slug, product_name,
            quantity, unit_price, total, status, notes,
            utm_source, utm_medium, utm_campaign
          FROM orders
          ${where}
          ORDER BY id DESC
          LIMIT ? OFFSET ?
        `)
        .bind(...values, limit, offset)
        .all(),

      env.jeebo_db
        .prepare(`SELECT COUNT(*) AS total FROM orders ${where}`)
        .bind(...values)
        .first(),
    ]);

    return json({
      success: true,
      orders: orders.results || [],
      pagination: {
        page,
        limit,
        total: Number(count?.total || 0),
        pages: Math.max(Math.ceil(Number(count?.total || 0) / limit), 1),
      },
    });
  } catch (error) {
    console.error(error);
    return json({ success: false, message: "تعذر تحميل الطلبات." }, 500);
  }
}
'@ | Set-Content -Encoding utf8 .\functions\api\admin\orders.js

# -------------------------
# API: Update/Delete order
# -------------------------
@'
function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

const allowedStatuses = new Set([
  "new",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
]);

export async function onRequestPatch({ request, env, params }) {
  try {
    const id = Number.parseInt(params.id, 10);
    if (!Number.isInteger(id) || id < 1) {
      return json({ success: false, message: "رقم الطلب غير صحيح." }, 400);
    }

    const body = await request.json();
    const status = String(body.status || "").trim();
    const notes = String(body.notes || "").trim().slice(0, 1000);

    if (!allowedStatuses.has(status)) {
      return json({ success: false, message: "حالة الطلب غير صحيحة." }, 400);
    }

    const result = await env.jeebo_db
      .prepare("UPDATE orders SET status = ?, notes = ? WHERE id = ?")
      .bind(status, notes, id)
      .run();

    if (!result.meta.changes) {
      return json({ success: false, message: "الطلب غير موجود." }, 404);
    }

    return json({ success: true, message: "تم تحديث الطلب." });
  } catch (error) {
    console.error(error);
    return json({ success: false, message: "تعذر تحديث الطلب." }, 500);
  }
}

export async function onRequestDelete({ env, params }) {
  try {
    const id = Number.parseInt(params.id, 10);
    const result = await env.jeebo_db
      .prepare("DELETE FROM orders WHERE id = ?")
      .bind(id)
      .run();

    if (!result.meta.changes) {
      return json({ success: false, message: "الطلب غير موجود." }, 404);
    }

    return json({ success: true, message: "تم حذف الطلب." });
  } catch (error) {
    console.error(error);
    return json({ success: false, message: "تعذر حذف الطلب." }, 500);
  }
}
'@ | Set-Content -Encoding utf8 -LiteralPath '.\functions\api\admin\orders\[id].js'

# -------------------------
# API: Products list/create
# -------------------------
@'
function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function clean(value, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}

export async function onRequestGet({ env }) {
  try {
    const { results } = await env.jeebo_db.prepare(`
      SELECT id, name, slug, description, price, old_price, badge, image,
             status, sort_order, created_at
      FROM products
      ORDER BY sort_order ASC, id DESC
    `).all();

    return json({ success: true, products: results || [] });
  } catch (error) {
    console.error(error);
    return json({ success: false, message: "تعذر تحميل المنتجات." }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();

    const name = clean(body.name, 150);
    const slug = clean(body.slug, 100).toLowerCase();
    const description = clean(body.description, 2000);
    const badge = clean(body.badge, 60);
    const image = clean(body.image, 500);
    const price = Number(body.price);
    const oldPrice = Number(body.oldPrice || body.price);
    const status = body.status ? 1 : 0;
    const sortOrder = Number.parseInt(body.sortOrder || "0", 10);

    if (!name || !/^[a-z0-9-]+$/.test(slug) || !description || price <= 0) {
      return json({ success: false, message: "راجع بيانات المنتج." }, 400);
    }

    const result = await env.jeebo_db.prepare(`
      INSERT INTO products
      (name, slug, description, price, old_price, badge, image, status, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      name, slug, description, price, oldPrice, badge, image,
      status, Number.isFinite(sortOrder) ? sortOrder : 0
    ).run();

    return json({
      success: true,
      message: "تمت إضافة المنتج.",
      id: result.meta.last_row_id,
    }, 201);
  } catch (error) {
    console.error(error);
    const message = String(error?.message || "").includes("UNIQUE")
      ? "رابط المنتج مستخدم من قبل."
      : "تعذر إضافة المنتج.";
    return json({ success: false, message }, 500);
  }
}
'@ | Set-Content -Encoding utf8 .\functions\api\admin\products.js

# -------------------------
# API: Product update/delete
# -------------------------
@'
function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function clean(value, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}

export async function onRequestPatch({ request, env, params }) {
  try {
    const id = Number.parseInt(params.id, 10);
    const body = await request.json();

    const name = clean(body.name, 150);
    const slug = clean(body.slug, 100).toLowerCase();
    const description = clean(body.description, 2000);
    const badge = clean(body.badge, 60);
    const image = clean(body.image, 500);
    const price = Number(body.price);
    const oldPrice = Number(body.oldPrice || body.price);
    const status = body.status ? 1 : 0;
    const sortOrder = Number.parseInt(body.sortOrder || "0", 10);

    if (!Number.isInteger(id) || !name || !/^[a-z0-9-]+$/.test(slug) || !description || price <= 0) {
      return json({ success: false, message: "راجع بيانات المنتج." }, 400);
    }

    const result = await env.jeebo_db.prepare(`
      UPDATE products
      SET name = ?, slug = ?, description = ?, price = ?, old_price = ?,
          badge = ?, image = ?, status = ?, sort_order = ?
      WHERE id = ?
    `).bind(
      name, slug, description, price, oldPrice, badge, image,
      status, Number.isFinite(sortOrder) ? sortOrder : 0, id
    ).run();

    if (!result.meta.changes) {
      return json({ success: false, message: "المنتج غير موجود." }, 404);
    }

    return json({ success: true, message: "تم تحديث المنتج." });
  } catch (error) {
    console.error(error);
    return json({ success: false, message: "تعذر تحديث المنتج." }, 500);
  }
}

export async function onRequestDelete({ env, params }) {
  try {
    const id = Number.parseInt(params.id, 10);
    const result = await env.jeebo_db
      .prepare("DELETE FROM products WHERE id = ?")
      .bind(id)
      .run();

    if (!result.meta.changes) {
      return json({ success: false, message: "المنتج غير موجود." }, 404);
    }

    return json({ success: true, message: "تم حذف المنتج." });
  } catch (error) {
    console.error(error);
    return json({ success: false, message: "تعذر حذف المنتج." }, 500);
  }
}
'@ | Set-Content -Encoding utf8 -LiteralPath '.\functions\api\admin\products\[id].js'

# -------------------------
# API: Settings
# -------------------------
@'
function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function onRequestGet({ env }) {
  try {
    const settings = await env.jeebo_db
      .prepare("SELECT * FROM settings WHERE id = 1")
      .first();

    return json({ success: true, settings });
  } catch (error) {
    console.error(error);
    return json({ success: false, message: "تعذر تحميل الإعدادات." }, 500);
  }
}

export async function onRequestPut({ request, env }) {
  try {
    const body = await request.json();

    const values = [
      String(body.storeName || "Jeebo").trim().slice(0, 100),
      String(body.whatsapp || "").trim().slice(0, 30),
      String(body.shippingNote || "").trim().slice(0, 300),
      String(body.metaPixel || "").trim().slice(0, 100),
      String(body.tiktokPixel || "").trim().slice(0, 100),
      String(body.telegramBotToken || "").trim().slice(0, 200),
      String(body.telegramChatId || "").trim().slice(0, 100),
    ];

    await env.jeebo_db.prepare(`
      UPDATE settings
      SET store_name = ?, whatsapp = ?, shipping_note = ?,
          meta_pixel = ?, tiktok_pixel = ?, telegram_bot_token = ?,
          telegram_chat_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `).bind(...values).run();

    return json({ success: true, message: "تم حفظ الإعدادات." });
  } catch (error) {
    console.error(error);
    return json({ success: false, message: "تعذر حفظ الإعدادات." }, 500);
  }
}
'@ | Set-Content -Encoding utf8 .\functions\api\admin\settings.js

# -------------------------
# Frontend API client
# -------------------------
@'
async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "حدث خطأ غير متوقع.");
  }

  return data;
}

export function getDashboard() {
  return request("/api/admin/dashboard");
}

export function getAdminOrders({ search = "", status = "", page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams({
    search,
    status,
    page: String(page),
    limit: String(limit),
  });
  return request(`/api/admin/orders?${params}`);
}

export function updateOrder(id, payload) {
  return request(`/api/admin/orders/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteOrder(id) {
  return request(`/api/admin/orders/${id}`, { method: "DELETE" });
}

export function getAdminProducts() {
  return request("/api/admin/products");
}

export function createProduct(payload) {
  return request("/api/admin/products", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateProduct(id, payload) {
  return request(`/api/admin/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteProduct(id) {
  return request(`/api/admin/products/${id}`, { method: "DELETE" });
}

export function getSettings() {
  return request("/api/admin/settings");
}

export function saveSettings(payload) {
  return request("/api/admin/settings", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
'@ | Set-Content -Encoding utf8 .\src\api\admin.js

# -------------------------
# Admin Layout
# -------------------------
@'
import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  BarChart3,
  Box,
  LayoutDashboard,
  Menu,
  Settings,
  ShoppingCart,
  Store,
  X,
} from "lucide-react";

const links = [
  { to: "/admin", label: "لوحة التحكم", icon: LayoutDashboard, end: true },
  { to: "/admin/orders", label: "الطلبات", icon: ShoppingCart },
  { to: "/admin/products", label: "المنتجات", icon: Box },
  { to: "/admin/settings", label: "الإعدادات", icon: Settings },
];

export default function AdminLayout() {
  const [open, setOpen] = useState(false);

  return (
    <div dir="rtl" className="min-h-screen bg-zinc-100 text-zinc-950">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-4 top-4 z-40 rounded-xl border bg-white p-3 shadow-sm lg:hidden"
        aria-label="فتح القائمة"
      >
        <Menu size={20} />
      </button>

      {open && (
        <button
          type="button"
          aria-label="إغلاق القائمة"
          className="fixed inset-0 z-40 bg-black/35 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside className={`fixed inset-y-0 right-0 z-50 w-72 border-l border-zinc-200 bg-white transition-transform lg:translate-x-0 ${
        open ? "translate-x-0" : "translate-x-full"
      }`}>
        <div className="flex h-20 items-center justify-between border-b px-6">
          <div>
            <div className="flex items-center gap-2">
              <Store size={23} />
              <strong className="text-2xl font-black">Jeebo</strong>
            </div>
            <p className="mt-1 text-xs text-zinc-500">لوحة إدارة المتجر</p>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="lg:hidden">
            <X />
          </button>
        </div>

        <nav className="space-y-2 p-4">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3.5 font-bold transition ${
                  isActive ? "bg-zinc-950 text-white" : "text-zinc-700 hover:bg-zinc-100"
                }`
              }
            >
              <Icon size={19} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 inset-x-0 border-t p-4 text-xs text-zinc-500">
          Jeebo Admin v1.0
        </div>
      </aside>

      <main className="min-h-screen p-4 pt-20 sm:p-6 sm:pt-20 lg:mr-72 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
'@ | Set-Content -Encoding utf8 .\src\components\admin\AdminLayout.jsx

# -------------------------
# Shared Admin UI
# -------------------------
@'
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
'@ | Set-Content -Encoding utf8 .\src\components\admin\AdminUI.jsx

# -------------------------
# Dashboard page
# -------------------------
@'
import { useQuery } from "@tanstack/react-query";
import { getDashboard } from "../../api/admin";
import { ErrorBox, LoadingBox, PageHeader, StatusBadge } from "../../components/admin/AdminUI";

const money = new Intl.NumberFormat("ar-EG");

export default function Dashboard() {
  const query = useQuery({ queryKey: ["admin-dashboard"], queryFn: getDashboard });

  if (query.isLoading) return <LoadingBox />;
  if (query.isError) return <ErrorBox message={query.error.message} onRetry={query.refetch} />;

  const { summary, statuses, latestOrders, topProducts } = query.data;
  const statusMap = Object.fromEntries(statuses.map((item) => [item.status, Number(item.total)]));

  const cards = [
    ["إجمالي الطلبات", summary.totalOrders],
    ["طلبات اليوم", summary.todayOrders],
    ["قيمة الطلبات", `${money.format(summary.totalValue)} جنيه`],
    ["مبيعات اليوم", `${money.format(summary.todayValue)} جنيه`],
    ["طلبات جديدة", statusMap.new || 0],
    ["تم التسليم", statusMap.delivered || 0],
  ];

  return (
    <div>
      <PageHeader title="لوحة التحكم" description="ملخص سريع لأداء المتجر والطلبات." />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(([label, value]) => (
          <article key={label} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-zinc-500">{label}</p>
            <p className="mt-3 text-3xl font-black">{value}</p>
          </article>
        ))}
      </section>

      <section className="mt-7 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="overflow-hidden rounded-2xl border bg-white">
          <div className="border-b p-5"><h2 className="text-xl font-black">أحدث الطلبات</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-right text-sm">
              <thead className="bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="p-4">#</th><th className="p-4">العميل</th><th className="p-4">المنتج</th>
                  <th className="p-4">الإجمالي</th><th className="p-4">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {latestOrders.map((order) => (
                  <tr key={order.id} className="border-t">
                    <td className="p-4 font-bold">{order.id}</td>
                    <td className="p-4">{order.customer_name}</td>
                    <td className="p-4">{order.product_name}</td>
                    <td className="p-4">{money.format(order.total)} جنيه</td>
                    <td className="p-4"><StatusBadge status={order.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border bg-white">
          <div className="border-b p-5"><h2 className="text-xl font-black">أفضل المنتجات</h2></div>
          <div className="divide-y">
            {topProducts.map((product, index) => (
              <div key={product.product_name} className="flex items-center justify-between p-5">
                <div>
                  <p className="font-black">{index + 1}. {product.product_name}</p>
                  <p className="mt-1 text-xs text-zinc-500">{product.orders_count} طلب</p>
                </div>
                <strong>{product.units} قطعة</strong>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
'@ | Set-Content -Encoding utf8 .\src\pages\admin\Dashboard.jsx

# -------------------------
# Orders page
# -------------------------
@'
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
'@ | Set-Content -Encoding utf8 .\src\pages\admin\Orders.jsx

# -------------------------
# Products page
# -------------------------
@'
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
'@ | Set-Content -Encoding utf8 .\src\pages\admin\Products.jsx

# -------------------------
# Settings page
# -------------------------
@'
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
'@ | Set-Content -Encoding utf8 .\src\pages\admin\Settings.jsx

# Remove old component if present to avoid confusion
Remove-Item .\src\components\admin\OrdersTable.jsx -Force -ErrorAction SilentlyContinue

# Build
Write-Host "Building project..." -ForegroundColor Yellow
npm run build

Write-Host ""
Write-Host "=== Admin setup completed successfully ===" -ForegroundColor Green
Write-Host "Run: npx wrangler pages dev dist" -ForegroundColor Cyan
Write-Host "Open: http://127.0.0.1:8788/admin" -ForegroundColor Cyan
