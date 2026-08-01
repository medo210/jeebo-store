const json=(d,s=200)=>Response.json(d,{status:s,headers:{"Cache-Control":"no-store"}});
const clean=(v,n=500)=>String(v??"").trim().slice(0,n);
const imgs=v=>(Array.isArray(v)?v:[]).map(x=>clean(x,600)).filter(Boolean).slice(0,12);
export async function onRequestGet({env}) {
  const {results}=await env.jeebo_db.prepare(`SELECT id,name,slug,description,price,old_price,badge,image,images,status,sort_order
    FROM products ORDER BY sort_order ASC,id DESC`).all();
  return json({success:true,products:(results||[]).map(p=>{let a=[];try{a=JSON.parse(p.images||"[]")}catch{}return {...p,images:a};})});
}
export async function onRequestPost({request,env}) {
  try {
    const b=await request.json(), name=clean(b.name,150), slug=clean(b.slug,100).toLowerCase(),
      description=clean(b.description,3000), badge=clean(b.badge,60), images=imgs(b.images),
      image=images[0]||"", price=Number(b.price), oldPrice=Number(b.oldPrice||b.price),
      status=b.status?1:0, sortOrder=parseInt(b.sortOrder||0);
    if(!name||!/^[a-z0-9-]+$/.test(slug)||!description||price<=0)return json({success:false,message:"راجع بيانات المنتج."},400);
    const r=await env.jeebo_db.prepare(`INSERT INTO products(name,slug,description,price,old_price,badge,image,images,status,sort_order)
      VALUES(?,?,?,?,?,?,?,?,?,?)`).bind(name,slug,description,price,oldPrice,badge,image,JSON.stringify(images),status,sortOrder||0).run();
    return json({success:true,id:r.meta.last_row_id},201);
  } catch(e){console.error(e);return json({success:false,message:"تعذر إضافة المنتج أو الرابط مستخدم."},500);}
}
