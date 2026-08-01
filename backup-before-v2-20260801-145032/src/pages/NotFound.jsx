import { Link } from "react-router-dom";

function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5">
      <h1 className="text-5xl font-bold">404</h1>

      <p className="text-gray-600">
        الصفحة غير موجودة
      </p>

      <Link
        to="/"
        className="rounded-xl bg-black px-6 py-3 font-bold text-white"
      >
        الرجوع للرئيسية
      </Link>
    </main>
  );
}

export default NotFound;