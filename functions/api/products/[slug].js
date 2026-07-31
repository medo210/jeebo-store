function json(data, status = 200, cache = "public, max-age=60") {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": cache,
    },
  });
}

export async function onRequestGet({ params, env }) {
  try {
    const slug = String(params.slug ?? "").trim();

    if (!slug) {
      return json(
        {
          success: false,
          message: "رابط المنتج غير صحيح.",
        },
        400,
        "no-store",
      );
    }

    const product = await env.jeebo_db
      .prepare(
        `SELECT
          id,
          name,
          slug,
          description,
          price,
          old_price,
          badge,
          image,
          sort_order
        FROM products
        WHERE slug = ? AND status = 1
        LIMIT 1`,
      )
      .bind(slug)
      .first();

    if (!product) {
      return json(
        {
          success: false,
          message: "المنتج غير موجود.",
        },
        404,
        "no-store",
      );
    }

    return json(product);
  } catch (error) {
    console.error("Product API error:", error);

    return json(
      {
        success: false,
        message: "تعذر تحميل المنتج.",
      },
      500,
      "no-store",
    );
  }
}
