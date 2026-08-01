function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

const allowedStatuses = new Set([
  "new",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
]);

export async function onRequestPatch({ request, env, params }) {
  try {
    const id = Number.parseInt(params.id, 10);
    if (!Number.isInteger(id) || id < 1) {
      return json({ success: false, message: "رقم الطلب غير صحيح." }, 400);
    }

    const body = await request.json();
    const status = String(body.status || "").trim();
    const notes = String(body.notes || "").trim().slice(0, 1000);

    if (!allowedStatuses.has(status)) {
      return json({ success: false, message: "حالة الطلب غير صحيحة." }, 400);
    }

    const result = await env.jeebo_db
      .prepare("UPDATE orders SET status = ?, notes = ? WHERE id = ?")
      .bind(status, notes, id)
      .run();

    if (!result.meta.changes) {
      return json({ success: false, message: "الطلب غير موجود." }, 404);
    }

    return json({ success: true, message: "تم تحديث الطلب." });
  } catch (error) {
    console.error(error);
    return json({ success: false, message: "تعذر تحديث الطلب." }, 500);
  }
}

export async function onRequestDelete({ env, params }) {
  try {
    const id = Number.parseInt(params.id, 10);
    const result = await env.jeebo_db
      .prepare("DELETE FROM orders WHERE id = ?")
      .bind(id)
      .run();

    if (!result.meta.changes) {
      return json({ success: false, message: "الطلب غير موجود." }, 404);
    }

    return json({ success: true, message: "تم حذف الطلب." });
  } catch (error) {
    console.error(error);
    return json({ success: false, message: "تعذر حذف الطلب." }, 500);
  }
}
