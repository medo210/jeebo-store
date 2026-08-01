function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function onRequestGet({ env }) {
  try {
    const settings = await env.jeebo_db
      .prepare("SELECT * FROM settings WHERE id = 1")
      .first();

    return json({ success: true, settings });
  } catch (error) {
    console.error(error);
    return json({ success: false, message: "تعذر تحميل الإعدادات." }, 500);
  }
}

export async function onRequestPut({ request, env }) {
  try {
    const body = await request.json();

    const values = [
      String(body.storeName || "Jeebo").trim().slice(0, 100),
      String(body.whatsapp || "").trim().slice(0, 30),
      String(body.shippingNote || "").trim().slice(0, 300),
      String(body.metaPixel || "").trim().slice(0, 100),
      String(body.tiktokPixel || "").trim().slice(0, 100),
      String(body.telegramBotToken || "").trim().slice(0, 200),
      String(body.telegramChatId || "").trim().slice(0, 100),
    ];

    await env.jeebo_db.prepare(`
      UPDATE settings
      SET store_name = ?, whatsapp = ?, shipping_note = ?,
          meta_pixel = ?, tiktok_pixel = ?, telegram_bot_token = ?,
          telegram_chat_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `).bind(...values).run();

    return json({ success: true, message: "تم حفظ الإعدادات." });
  } catch (error) {
    console.error(error);
    return json({ success: false, message: "تعذر حفظ الإعدادات." }, 500);
  }
}
