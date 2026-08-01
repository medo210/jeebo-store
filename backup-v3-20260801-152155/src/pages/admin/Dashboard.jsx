import {useQuery} from "@tanstack/react-query";
import {getDashboard} from "../../api/admin";
import {ErrorBox,LoadingBox,PageHeader,StatusBadge} from "../../components/admin/AdminUI";
export default function Dashboard(){
 const q=useQuery({queryKey:["admin-dashboard"],queryFn:getDashboard});
 if(q.isLoading)return <LoadingBox/>; if(q.isError)return <ErrorBox message={q.error.message} onRetry={q.refetch}/>;
 const {summary,statuses,latestOrders,topProducts,daily}=q.data, m=Object.fromEntries(statuses.map(x=>[x.status,+x.total])),
 max=Math.max(...daily.map(x=>+x.orders_count),1), cards=[["إجمالي الطلبات",summary.totalOrders],["طلبات اليوم",summary.todayOrders],
 ["قيمة الطلبات",`${summary.totalValue} جنيه`],["مبيعات اليوم",`${summary.todayValue} جنيه`],["طلبات جديدة",m.new||0],["تم التسليم",m.delivered||0]];
 return <div><PageHeader title="لوحة التحكم" description="إحصائيات المتجر وآخر الطلبات."/>
 <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cards.map(([l,v])=><div key={l} className="rounded-2xl border bg-white p-6"><p className="text-sm font-bold text-zinc-500">{l}</p><p className="mt-3 text-3xl font-black">{v}</p></div>)}</div>
 <div className="mt-6 rounded-2xl border bg-white p-6"><h2 className="text-xl font-black">الطلبات خلال 7 أيام</h2><div className="mt-6 flex h-52 items-end gap-3">
 {daily.map(x=><div key={x.day} className="flex h-full flex-1 flex-col justify-end"><b className="mb-2 text-center text-xs">{x.orders_count}</b><div className="rounded-t-lg bg-zinc-950" style={{height:`${Math.max((+x.orders_count/max)*100,+x.orders_count?8:2)}%`}}/><small className="mt-2 text-center">{x.day.slice(5)}</small></div>)}</div></div>
 <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]"><div className="overflow-hidden rounded-2xl border bg-white"><h2 className="border-b p-5 text-xl font-black">أحدث الطلبات</h2><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-right text-sm"><thead className="bg-zinc-50"><tr><th className="p-4">#</th><th className="p-4">العميل</th><th className="p-4">المنتج</th><th className="p-4">الإجمالي</th><th className="p-4">الحالة</th></tr></thead><tbody>{latestOrders.map(o=><tr className="border-t" key={o.id}><td className="p-4">{o.order_number||o.id}</td><td className="p-4">{o.customer_name}</td><td className="p-4">{o.product_name}</td><td className="p-4">{o.total} جنيه</td><td className="p-4"><StatusBadge status={o.status}/></td></tr>)}</tbody></table></div></div>
 <div className="rounded-2xl border bg-white"><h2 className="border-b p-5 text-xl font-black">أفضل المنتجات</h2>{topProducts.map((p,i)=><div className="flex justify-between border-b p-5" key={p.product_name}><b>{i+1}. {p.product_name}</b><span>{p.units} قطعة</span></div>)}</div></div></div>;
}
