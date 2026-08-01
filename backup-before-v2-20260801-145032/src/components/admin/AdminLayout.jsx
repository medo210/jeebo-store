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
