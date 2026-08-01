const json=(d,s=200)=>Response.json(d,{status:s,headers:{"Cache-Control":"no-store"}});
const clean=(v,n=500)=>String(v??"").trim().slice(0,n);
export async function onRequestPatch({request,env,params}) {
  try {
    const id=parseInt(params.id),b=await request.json(),images=(Array.isArray(b.images)?b.images:[]).map(x=>clean(x,600)).filter(Boolean).slice(0,12),
      name=clean(b.name,150),slug=clean(b.slug,100).toLowerCase(),description=clean(b.description,3000),
      price=Number(b.price),oldPrice=Number(b.oldPrice||b.price),badge=clean(b.badge,60),status=b.status?1:0,sortOrder=parseInt(b.sortOrder||0);
    if(!id||!name||!/^[a-z0-9-]+$/.test(slug)||!description||price<=0)return json({success:false,message:"راجع بيانات المنتج."},400);
    const r=await env.jeebo_db.prepare(`UPDATE products SET name=?,slug=?,description=?,price=?,old_price=?,badge=?,
      image=?,images=?,status=?,sort_order=? WHERE id=?`).bind(name,slug,description,price,oldPrice,badge,images[0]||"",
      JSON.stringify(images),status,sortOrder||0,id).run();
    return r.meta.changes?json({success:true}):json({success:false,message:"المنتج غير موجود."},404);
  } catch(e){console.error(e);return json({success:false,message:"تعذر تعديل المنتج."},500);}
}
export async function onRequestDelete({env,params}) {
  const r=await env.jeebo_db.prepare("DELETE FROM products WHERE id=?").bind(parseInt(params.id)).run();
  return r.meta.changes?json({success:true}):json({success:false,message:"المنتج غير موجود."},404);
}
