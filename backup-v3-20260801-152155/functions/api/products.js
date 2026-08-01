const parse=(v,f)=>{try{const a=JSON.parse(v||"[]");return Array.isArray(a)&&a.length?a:(f?[f]:[])}catch{return f?[f]:[]}};
export async function onRequestGet({env}) {
  const {results}=await env.jeebo_db.prepare(`SELECT id,name,slug,description,price,old_price,badge,image,images,sort_order
    FROM products WHERE status=1 ORDER BY sort_order ASC,id DESC`).all();
  return Response.json((results||[]).map(p=>({...p,images:parse(p.images,p.image)})),
    {headers:{"Cache-Control":"public,max-age=60,s-maxage=300"}});
}
