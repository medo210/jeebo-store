export async function onRequestGet({ env }) {
  try {
    const total =
      await env.jeebo_db
        .prepare("SELECT COUNT(*) total FROM orders")
        .first();

    const today =
      await env.jeebo_db
        .prepare("SELECT COUNT(*) total FROM orders WHERE date(created_at)=date('now')")
        .first();

    const stats =
      await env.jeebo_db
        .prepare(`
          SELECT
            status,
            COUNT(*) total
          FROM orders
          GROUP BY status
        `)
        .all();

    return Response.json({
      success:true,
      totalOrders:Number(total.total),
      todayOrders:Number(today.total),
      statuses:stats.results
    });

  } catch(err){

    console.error(err);

    return Response.json({
      success:false
    },{status:500});

  }
}
