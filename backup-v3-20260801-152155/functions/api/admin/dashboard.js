const json=(d,s=200)=>Response.json(d,{status:s,headers:{"Cache-Control":"no-store"}});
export async function onRequestGet({env}) {
  try {
    const [summary,statuses,latest,top,daily]=await Promise.all([
      env.jeebo_db.prepare(`SELECT COUNT(*) total_orders,COALESCE(SUM(total),0) total_value,
        SUM(CASE WHEN date(created_at)=date('now') THEN 1 ELSE 0 END) today_orders,
        COALESCE(SUM(CASE WHEN date(created_at)=date('now') THEN total ELSE 0 END),0) today_value FROM orders`).first(),
      env.jeebo_db.prepare("SELECT status,COUNT(*) total FROM orders GROUP BY status").all(),
      env.jeebo_db.prepare("SELECT id,order_number,customer_name,product_name,total,status FROM orders ORDER BY id DESC LIMIT 8").all(),
      env.jeebo_db.prepare("SELECT product_name,SUM(quantity) units,COUNT(*) orders_count FROM orders GROUP BY product_name ORDER BY units DESC LIMIT 5").all(),
      env.jeebo_db.prepare(`WITH RECURSIVE dates(day) AS (
        SELECT date('now','-6 day') UNION ALL SELECT date(day,'+1 day') FROM dates WHERE day<date('now')
      ) SELECT dates.day,COUNT(orders.id) orders_count,COALESCE(SUM(orders.total),0) value
      FROM dates LEFT JOIN orders ON date(orders.created_at)=dates.day GROUP BY dates.day ORDER BY dates.day`).all()
    ]);
    return json({success:true,summary:{totalOrders:+summary.total_orders||0,totalValue:+summary.total_value||0,
      todayOrders:+summary.today_orders||0,todayValue:+summary.today_value||0},
      statuses:statuses.results||[],latestOrders:latest.results||[],topProducts:top.results||[],daily:daily.results||[]});
  } catch(e){console.error(e);return json({success:false,message:"تعذر تحميل لوحة التحكم."},500);}
}
