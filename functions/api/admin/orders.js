function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const search = String(url.searchParams.get("search") || "").trim();
    const status = String(url.searchParams.get("status") || "").trim();
    const page = Math.max(Number.parseInt(url.searchParams.get("page") || "1", 10), 1);
    const limit = Math.min(Math.max(Number.parseInt(url.searchParams.get("limit") || "20", 10), 5), 100);
    const offset = (page - 1) * limit;

    const conditions = [];
    const values = [];

    if (search) {
      conditions.push(`(
        o.customer_name LIKE ? OR
        o.phone LIKE ? OR
        o.product_name LIKE ? OR
        o.governorate LIKE ? OR
        o.order_number LIKE ?
      )`);
      const q = `%${search}%`;
      values.push(q, q, q, q, q);
    }

    if (status) {
      conditions.push("o.status = ?");
      values.push(status);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [ordersResult, countResult] = await Promise.all([
      env.jeebo_db.prepare(`
        SELECT
          o.id,
          o.order_number,
          o.created_at,
          o.customer_name,
          o.phone,
          o.governorate,
          o.address,
          o.product_slug,
          o.product_name,
          o.quantity,
          o.unit_price,
          COALESCE(o.subtotal, o.unit_price * o.quantity) AS subtotal,
          COALESCE(o.shipping_cost, 0) AS shipping_cost,
          o.total,
          o.status,
          o.notes,
          COALESCE(p.image, '') AS product_image
        FROM orders o
        LEFT JOIN products p ON p.slug = o.product_slug
        ${where}
        ORDER BY o.id DESC
        LIMIT ? OFFSET ?
      `).bind(...values, limit, offset).all(),

      env.jeebo_db.prepare(`
        SELECT COUNT(*) AS total
        FROM orders o
        ${where}
      `).bind(...values).first(),
    ]);

    return json({
      success: true,
      orders: ordersResult.results || [],
      pagination: {
        page,
        limit,
        total: Number(countResult?.total || 0),
        pages: Math.max(Math.ceil(Number(countResult?.total || 0) / limit), 1),
      },
    });
  } catch (error) {
    console.error("Admin orders error:", error);
    return json({ success: false, message: "تعذر تحميل الطلبات." }, 500);
  }
}
