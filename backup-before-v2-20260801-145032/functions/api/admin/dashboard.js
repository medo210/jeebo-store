function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function onRequestGet({ env }) {
  try {
    const [summary, statuses, latest, topProducts] = await Promise.all([
      env.jeebo_db.prepare(`
        SELECT
          COUNT(*) AS total_orders,
          COALESCE(SUM(total), 0) AS total_value,
          SUM(CASE WHEN date(created_at) = date('now') THEN 1 ELSE 0 END) AS today_orders,
          COALESCE(SUM(CASE WHEN date(created_at) = date('now') THEN total ELSE 0 END), 0) AS today_value
        FROM orders
      `).first(),

      env.jeebo_db.prepare(`
        SELECT status, COUNT(*) AS total
        FROM orders
        GROUP BY status
      `).all(),

      env.jeebo_db.prepare(`
        SELECT id, order_number, customer_name, phone, product_name, total, status, created_at
        FROM orders
        ORDER BY id DESC
        LIMIT 6
      `).all(),

      env.jeebo_db.prepare(`
        SELECT product_name, SUM(quantity) AS units, COUNT(*) AS orders_count, SUM(total) AS value
        FROM orders
        GROUP BY product_name
        ORDER BY units DESC
        LIMIT 5
      `).all(),
    ]);

    return json({
      success: true,
      summary: {
        totalOrders: Number(summary?.total_orders || 0),
        totalValue: Number(summary?.total_value || 0),
        todayOrders: Number(summary?.today_orders || 0),
        todayValue: Number(summary?.today_value || 0),
      },
      statuses: statuses.results || [],
      latestOrders: latest.results || [],
      topProducts: topProducts.results || [],
    });
  } catch (error) {
    console.error(error);
    return json({ success: false, message: "تعذر تحميل لوحة التحكم." }, 500);
  }
}
