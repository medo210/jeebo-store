const json=(d,s=200)=>Response.json(d,{status:s,headers:{"Cache-Control":"no-store"}});
export async function onRequestGet({request,env}) {
  try {
    const u=new URL(request.url), search=(u.searchParams.get("search")||"").trim(),
      status=(u.searchParams.get("status")||"").trim(),
      page=Math.max(parseInt(u.searchParams.get("page")||"1"),1),
      limit=Math.min(Math.max(parseInt(u.searchParams.get("limit")||"20"),5),100),
      offset=(page-1)*limit, c=[], v=[];
    if(search){c.push("(customer_name LIKE ? OR phone LIKE ? OR product_name LIKE ? OR governorate LIKE ?)"); const q=`%${search}%`;v.push(q,q,q,q);}
    if(status){c.push("status=?");v.push(status);}
    const where=c.length?`WHERE ${c.join(" AND ")}`:"";
    const [rows,count]=await Promise.all([
      env.jeebo_db.prepare(`SELECT id,order_number,created_at,customer_name,phone,governorate,address,
        product_id,product_slug,product_name,quantity,unit_price,total,status,notes
        FROM orders ${where} ORDER BY id DESC LIMIT ? OFFSET ?`).bind(...v,limit,offset).all(),
      env.jeebo_db.prepare(`SELECT COUNT(*) total FROM orders ${where}`).bind(...v).first()
    ]);
    const total=Number(count?.total||0);
    return json({success:true,orders:rows.results||[],pagination:{page,limit,total,pages:Math.max(Math.ceil(total/limit),1)}});
  } catch(e){console.error(e);return json({success:false,message:"تعذر تحميل الطلبات."},500);}
}
