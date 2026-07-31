import { Link } from "react-router-dom";

function Navbar() {
  return (
    <>
      <div className="bg-zinc-950 px-4 py-2 text-center text-xs font-bold text-white sm:text-sm">
        شحن سريع لجميع المحافظات — الدفع عند الاستلام
      </div>

      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="text-2xl font-black tracking-tight text-zinc-950">
            Jeebo
          </Link>

          <nav className="flex items-center gap-5 text-sm font-bold text-zinc-700">
            <a href="#products" className="transition hover:text-black">
              المنتجات
            </a>
            <a href="#features" className="hidden transition hover:text-black sm:block">
              لماذا Jeebo
            </a>
          </nav>
        </div>
      </header>
    </>
  );
}

export default Navbar;
