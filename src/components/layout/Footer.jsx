function Footer() {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950 text-zinc-300">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-10 text-center sm:px-6 md:flex-row md:items-center md:justify-between md:text-right">
        <div>
          <p className="text-xl font-black text-white">Jeebo</p>
          <p className="mt-1 text-sm text-zinc-400">
            منتجات عملية بأسعار مميزة
          </p>
        </div>

        <p className="text-sm text-zinc-500">
          جميع الحقوق محفوظة © {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}

export default Footer;
