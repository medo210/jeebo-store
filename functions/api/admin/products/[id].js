function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function clean(value, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}

export async function onRequestPatch({ request, env, params }) {
  try {
    const id = Number.parseInt(params.id, 10);
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

    if (!Number.isInteger(id) || !name || !/^[a-z0-9-]+$/.test(slug) || !description || price <= 0) {
      return json({ success: false, message: "راجع بيانات المنتج." }, 400);
    }

    const result = await env.jeebo_db.prepare(`
      UPDATE products
      SET name = ?, slug = ?, description = ?, price = ?, old_price = ?,
          badge = ?, image = ?, status = ?, sort_order = ?
      WHERE id = ?
    `).bind(
      name, slug, description, price, oldPrice, badge, image,
      status, Number.isFinite(sortOrder) ? sortOrder : 0, id
    ).run();

    if (!result.meta.changes) {
      return json({ success: false, message: "المنتج غير موجود." }, 404);
    }

    return json({ success: true, message: "تم تحديث المنتج." });
  } catch (error) {
    console.error(error);
    return json({ success: false, message: "تعذر تحديث المنتج." }, 500);
  }
}

export async function onRequestDelete({ env, params }) {
  try {
    const id = Number.parseInt(params.id, 10);
    const result = await env.jeebo_db
      .prepare("DELETE FROM products WHERE id = ?")
      .bind(id)
      .run();

    if (!result.meta.changes) {
      return json({ success: false, message: "المنتج غير موجود." }, 404);
    }

    return json({ success: true, message: "تم حذف المنتج." });
  } catch (error) {
    console.error(error);
    return json({ success: false, message: "تعذر حذف المنتج." }, 500);
  }
}
