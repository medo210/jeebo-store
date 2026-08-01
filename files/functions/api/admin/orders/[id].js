const j=(d,s=200)=>Response.json(d,{status:s,headers:{"Cache-Control":"no-store"}});
const c=(v,n)=>String(v??"").trim().slice(0,n),p=(v,f)=>{try{return JSON.parse(v||"")??f}catch{return f}};
function ship(s,g){if((s?.shipping_mode||"flat")==="free")return 0;if(s?.shipping_mode==="governorate"){const r=Number(p(s.governorate_rates,{})[g]);return Number.isFinite(r)&&r>=0?r:Number(s.flat_shipping||0)}return Number(s?.flat_shipping||0)}
const states=new Set(["new","confirmed","shipped","delivered","cancelled"]);
export async function onRequestPatch({request,env,params}){
 try{
  const id=parseInt(params.id,10),b=await request.json(),name=c(b.customerName,100),phone=c(b.phone,20).replace(/\s+/g,""),gov=c(b.governorate,60),addr=c(b.address,300),slug=c(b.productSlug,100),qty=parseInt(b.quantity,10),price=Number(b.unitPrice),status=c(b.status,30),notes=c(b.notes,1000);
  if(!Number.isInteger(id)||name.length<3||!/^01[0125][0-9]{8}$/.test(phone)||!gov||addr.length<8||!slug||!Number.isInteger(qty)||qty<1||qty>100||!states.has(status))return j({success:false,message:"راجع بيانات الطلب."},400);
  const [pr,s]=await Promise.all([env.jeebo_db.prepare("SELECT id,name,slug,price FROM products WHERE slug=? LIMIT 1").bind(slug).first(),env.jeebo_db.prepare("SELECT shipping_mode,flat_shipping,governorate_rates FROM settings WHERE id=1").first()]);
  if(!pr)return j({success:false,message:"المنتج غير موجود."},404);
  const unit=Number.isFinite(price)&&price>0?price:Number(pr.price),sub=unit*qty,shipping=ship(s,gov),total=sub+shipping;
  const r=await env.jeebo_db.prepare(`UPDATE orders SET customer_name=?,phone=?,governorate=?,address=?,product_id=?,product_slug=?,product_name=?,quantity=?,unit_price=?,subtotal=?,shipping_cost=?,total=?,status=?,notes=? WHERE id=?`).bind(name,phone,gov,addr,pr.id,pr.slug,pr.name,qty,unit,sub,shipping,total,status,notes,id).run();
  if(!r.meta.changes)return j({success:false,message:"الطلب غير موجود."},404);
  return j({success:true,message:"تم تحديث الطلب.",subtotal:sub,shippingCost:shipping,total})
 }catch(e){console.error(e);return j({success:false,message:"تعذر تحديث الطلب."},500)}
}
export async function onRequestDelete({env,params}){const r=await env.jeebo_db.prepare("DELETE FROM orders WHERE id=?").bind(parseInt(params.id,10)).run();return r.meta.changes?j({success:true}):j({success:false,message:"الطلب غير موجود."},404)}