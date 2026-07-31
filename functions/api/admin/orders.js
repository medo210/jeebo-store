export async function onRequestGet({ env }) {
  try {

    const { results } = await env.jeebo_db
      .prepare(`
        SELECT
          id,
          order_number,
          customer_name,
          phone,
          governorate,
          address,
          product_name,
          quantity,
          total,
          status,
          created_at
        FROM orders
        ORDER BY id DESC
      `)
      .all();

    return Response.json({
      success: true,
      orders: results
    });

  } catch (e) {

    console.error(e);

    return Response.json({
      success:false,
      message:"Database Error"
    },{status:500});

  }
}
