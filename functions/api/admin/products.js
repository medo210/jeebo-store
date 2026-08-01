function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function clean(value, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}

export async function onRequestGet({ env }) {
  try {
    const { results } = await env.jeebo_db.prepare(`
      SELECT id, name, slug, description, price, old_price, badge, image,
             status, sort_order, created_at
      FROM products
      ORDER BY sort_order ASC, id DESC
    `).all();

    return json({ success: true, products: results || [] });
  } catch (error) {
    console.error(error);
    return json({ success: false, message: "تعذر تحميل المنتجات." }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();

    const name = clean(body.name, 150);
    const slug = clean(body.slug, 100).toLowerCase();
    const description = clean(body.description, 2000);
    const badge = clean(body.badge, 60);
    const image = clean(body.image, 500);
    const price = Number(body.price);
    const oldPrice = Number(body.oldPrice || body.price);
    const status = body.status ? 1 : 0;
    const sortOrder = Number.parseInt(body.sortOrder || "0", 10);

    if (!name || !/^[a-z0-9-]+$/.test(slug) || !description || price <= 0) {
      return json({ success: false, message: "راجع بيانات المنتج." }, 400);
    }

    const result = await env.jeebo_db.prepare(`
      INSERT INTO products
      (name, slug, description, price, old_price, badge, image, status, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      name, slug, description, price, oldPrice, badge, image,
      status, Number.isFinite(sortOrder) ? sortOrder : 0
    ).run();

    return json({
      success: true,
      message: "تمت إضافة المنتج.",
      id: result.meta.last_row_id,
    }, 201);
  } catch (error) {
    console.error(error);
    const message = String(error?.message || "").includes("UNIQUE")
      ? "رابط المنتج مستخدم من قبل."
      : "تعذر إضافة المنتج.";
    return json({ success: false, message }, 500);
  }
}
