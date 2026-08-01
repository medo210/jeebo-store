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
