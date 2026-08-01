const j=(d,s=200)=>Response.json(d,{status:s,headers:{"Cache-Control":"no-store"}});
const c=(v,n)=>String(v??"").trim().slice(0,n);
const p=(v,f)=>{try{return JSON.parse(v||"")??f}catch{return f}};
function ship(s,g){if((s?.shipping_mode||"flat")==="free")return 0;if(s?.shipping_mode==="governorate"){const r=Number(p(s.governorate_rates,{})[g]);return Number.isFinite(r)&&r>=0?r:Number(s.flat_shipping||0)}return Number(s?.flat_shipping||0)}
export async function onRequestPost({request,env}){
 try{
  const b=await request.json(),name=c(b.customerName,100),phone=c(b.phone,20).replace(/\s+/g,""),gov=c(b.governorate,60),addr=c(b.address,300),slug=c(b.productSlug,100),qty=parseInt(b.quantity,10);
  if(name.length<3||!/^01[0125][0-9]{8}$/.test(phone)||!gov||addr.length<8||!slug||!Number.isInteger(qty)||qty<1||qty>10)return j({success:false,message:"راجع بيانات الطلب."},400);
  const [pr,s]=await Promise.all([env.jeebo_db.prepare("SELECT id,name,slug,price FROM products WHERE slug=? AND status=1 LIMIT 1").bind(slug).first(),env.jeebo_db.prepare("SELECT shipping_mode,flat_shipping,governorate_rates FROM settings WHERE id=1").first()]);
  if(!pr)return j({success:false,message:"المنتج غير متاح حاليًا."},404);
  const unit=Number(pr.price),sub=unit*qty,shipping=ship(s,gov),total=sub+shipping;
  const r=await env.jeebo_db.prepare(`INSERT INTO orders(customer_name,phone,governorate,address,product_id,product_slug,product_name,quantity,unit_price,subtotal,shipping_cost,total,status,ip,user_agent,referrer,utm_source,utm_medium,utm_campaign,fbclid,ttclid) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,'new',?,?,?,?,?,?,?,?)`).bind(name,phone,gov,addr,pr.id,pr.slug,pr.name,qty,unit,sub,shipping,total,c(request.headers.get("CF-Connecting-IP"),80),c(request.headers.get("User-Agent"),500),c(request.headers.get("Referer"),500),c(b.utmSource,150),c(b.utmMedium,150),c(b.utmCampaign,200),c(b.fbclid,300),c(b.ttclid,300)).run();
  const id=Number(r.meta.last_row_id),num=`JB-${new Date().toISOString().slice(0,10).replaceAll("-","")}-${String(id).padStart(6,"0")}`;
  await env.jeebo_db.prepare("UPDATE orders SET order_number=? WHERE id=?").bind(num,id).run();
  return j({success:true,message:"تم استلام طلبك بنجاح.",orderId:id,orderNumber:num,subtotal:sub,shippingCost:shipping,total},201)
 }catch(e){console.error(e);return j({success:false,message:"حصل خطأ أثناء تسجيل الطلب."},500)}
}