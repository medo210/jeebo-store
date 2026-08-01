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
        customer_name LIKE ? OR
        phone LIKE ? OR
        product_name LIKE ? OR
        governorate LIKE ? OR
        CAST(id AS TEXT) LIKE ?
      )`);
      const q = `%${search}%`;
      values.push(q, q, q, q, q);
    }

    if (status) {
      conditions.push("status = ?");
      values.push(status);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [orders, count] = await Promise.all([
      env.jeebo_db
        .prepare(`
          SELECT
            id, order_number, created_at, customer_name, phone,
            governorate, address, product_slug, product_name,
            quantity, unit_price, total, status, notes,
            utm_source, utm_medium, utm_campaign
          FROM orders
          ${where}
          ORDER BY id DESC
          LIMIT ? OFFSET ?
        `)
        .bind(...values, limit, offset)
        .all(),

      env.jeebo_db
        .prepare(`SELECT COUNT(*) AS total FROM orders ${where}`)
        .bind(...values)
        .first(),
    ]);

    return json({
      success: true,
      orders: orders.results || [],
      pagination: {
        page,
        limit,
        total: Number(count?.total || 0),
        pages: Math.max(Math.ceil(Number(count?.total || 0) / limit), 1),
      },
    });
  } catch (error) {
    console.error(error);
    return json({ success: false, message: "تعذر تحميل الطلبات." }, 500);
  }
}
