const json=(d,s=200)=>Response.json(d,{status:s,headers:{"Cache-Control":"no-store"}});
const clean=(v,n)=>String(v??"").trim().slice(0,n);
const allowed=new Set(["new","confirmed","shipped","delivered","cancelled"]);
export async function onRequestPatch({request,env,params}) {
  try {
    const id=parseInt(params.id), b=await request.json();
    const customerName=clean(b.customerName,100), phone=clean(b.phone,20).replace(/\s+/g,""),
      governorate=clean(b.governorate,60), address=clean(b.address,300),
      productSlug=clean(b.productSlug,100), quantity=parseInt(b.quantity),
      requestedPrice=Number(b.unitPrice), status=clean(b.status,30), notes=clean(b.notes,1000);
    if(!Number.isInteger(id)||customerName.length<3||!/^01[0125][0-9]{8}$/.test(phone)||
       !governorate||address.length<8||!productSlug||!Number.isInteger(quantity)||quantity<1||
       quantity>100||!allowed.has(status)) return json({success:false,message:"راجع بيانات الطلب."},400);
    const p=await env.jeebo_db.prepare("SELECT id,name,slug,price FROM products WHERE slug=? LIMIT 1").bind(productSlug).first();
    if(!p)return json({success:false,message:"المنتج غير موجود."},404);
    const unitPrice=Number.isFinite(requestedPrice)&&requestedPrice>0?requestedPrice:Number(p.price);
    const total=unitPrice*quantity;
    const r=await env.jeebo_db.prepare(`UPDATE orders SET customer_name=?,phone=?,governorate=?,address=?,
      product_id=?,product_slug=?,product_name=?,quantity=?,unit_price=?,total=?,status=?,notes=? WHERE id=?`)
      .bind(customerName,phone,governorate,address,p.id,p.slug,p.name,quantity,unitPrice,total,status,notes,id).run();
    if(!r.meta.changes)return json({success:false,message:"الطلب غير موجود."},404);
    return json({success:true,message:"تم تحديث الطلب."});
  } catch(e){console.error(e);return json({success:false,message:"تعذر تحديث الطلب."},500);}
}
export async function onRequestDelete({env,params}) {
  const id=parseInt(params.id);
  const r=await env.jeebo_db.prepare("DELETE FROM orders WHERE id=?").bind(id).run();
  return r.meta.changes?json({success:true}):json({success:false,message:"الطلب غير موجود."},404);
}
