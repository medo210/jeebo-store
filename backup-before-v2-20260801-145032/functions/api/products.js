export async function onRequestGet({ env }) {
  try {
    const { results } = await env.jeebo_db
      .prepare(`
        SELECT
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
        WHERE status = 1
        ORDER BY sort_order ASC
      `)
      .all();

    return Response.json(results, {
      headers: {
        "Cache-Control": "public, max-age=60"
      }
    });

  } catch (err) {
    console.error(err);

    return Response.json(
      {
        error: "Database Error"
      },
      {
        status: 500
      }
    );
  }
}
