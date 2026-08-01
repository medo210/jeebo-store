import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";

const Home = lazy(() => import("./pages/Home"));
const Product = lazy(() => import("./pages/Product"));
const NotFound = lazy(() => import("./pages/NotFound"));

const AdminLayout = lazy(
  () => import("./components/admin/AdminLayout")
);

const Dashboard = lazy(
  () => import("./pages/admin/Dashboard")
);

const Orders = lazy(
  () => import("./pages/admin/Orders")
);

const Products = lazy(
  () => import("./pages/admin/Products")
);

const Settings = lazy(
  () => import("./pages/admin/Settings")
);

function Loading() {
  return (
    <div
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-white"
    >
      <span className="text-sm font-bold text-zinc-500">
        جاري التحميل...
      </span>
    </div>
  );
}

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/products/:slug" element={<Product />} />

        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="orders" element={<Orders />} />
          <Route path="products" element={<Products />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default App;
