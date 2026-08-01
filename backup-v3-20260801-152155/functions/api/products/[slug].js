const parse=(v,f)=>{try{const a=JSON.parse(v||"[]");return Array.isArray(a)&&a.length?a:(f?[f]:[])}catch{return f?[f]:[]}};
export async function onRequestGet({env,params}) {
  const p=await env.jeebo_db.prepare(`SELECT id,name,slug,description,price,old_price,badge,image,images,sort_order
    FROM products WHERE slug=? AND status=1 LIMIT 1`).bind(String(params.slug||"")).first();
  if(!p)return Response.json({success:false,message:"المنتج غير موجود."},{status:404});
  return Response.json({...p,images:parse(p.images,p.image)},{headers:{"Cache-Control":"public,max-age=60,s-maxage=300"}});
}
