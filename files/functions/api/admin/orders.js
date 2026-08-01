const j=(d,s=200)=>Response.json(d,{status:s,headers:{"Cache-Control":"no-store"}});
export async function onRequestGet({request,env}){
 try{
  const u=new URL(request.url),search=(u.searchParams.get("search")||"").trim(),status=(u.searchParams.get("status")||"").trim(),page=Math.max(parseInt(u.searchParams.get("page")||"1",10),1),limit=20,offset=(page-1)*limit,conds=[],vals=[];
  if(search){conds.push("(o.customer_name LIKE ? OR o.phone LIKE ? OR o.product_name LIKE ? OR o.governorate LIKE ? OR o.order_number LIKE ?)");const q=`%${search}%`;vals.push(q,q,q,q,q)}
  if(status){conds.push("o.status=?");vals.push(status)}
  const w=conds.length?`WHERE ${conds.join(" AND ")}`:"";
  const [a,b]=await Promise.all([
   env.jeebo_db.prepare(`SELECT o.id,o.order_number,o.created_at,o.customer_name,o.phone,o.governorate,o.address,o.product_slug,o.product_name,o.quantity,o.unit_price,o.subtotal,o.shipping_cost,o.total,o.status,o.notes,COALESCE(p.image,'') product_image FROM orders o LEFT JOIN products p ON p.slug=o.product_slug ${w} ORDER BY o.id DESC LIMIT ? OFFSET ?`).bind(...vals,limit,offset).all(),
   env.jeebo_db.prepare(`SELECT COUNT(*) total FROM orders o ${w}`).bind(...vals).first()
  ]);
  const total=Number(b?.total||0);return j({success:true,orders:a.results||[],pagination:{page,limit,total,pages:Math.max(Math.ceil(total/limit),1)}})
 }catch(e){console.error(e);return j({success:false,message:"تعذر تحميل الطلبات."},500)}
}