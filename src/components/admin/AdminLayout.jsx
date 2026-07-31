import { NavLink, Outlet } from "react-router-dom";

const links = [
  { to: "/admin", label: "📊 Dashboard", end: true },
  { to: "/admin/orders", label: "🛒 Orders" },
  { to: "/admin/products", label: "📦 Products" },
  { to: "/admin/settings", label: "⚙ Settings" },
];

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-zinc-100" dir="rtl">
      <div className="flex">

        <aside className="sticky top-0 h-screen w-72 border-l bg-white">

          <div className="border-b p-6">
            <h1 className="text-3xl font-black">Jeebo</h1>
            <p className="mt-1 text-sm text-zinc-500">
              لوحة التحكم
            </p>
          </div>

          <nav className="space-y-2 p-4">
            {links.map((link) => (
              <NavLink
                key={link.to}
                end={link.end}
                to={link.to}
                className={({ isActive }) =>
                  `block rounded-xl px-4 py-3 font-bold transition ${
                    isActive
                      ? "bg-black text-white"
                      : "hover:bg-zinc-100"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

        </aside>

        <main className="min-h-screen flex-1 p-8">
          <Outlet />
        </main>

      </div>
    </div>
  );
}
