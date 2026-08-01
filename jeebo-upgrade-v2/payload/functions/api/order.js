const json = (data, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const clean = (v, n) => String(v ?? "").trim().slice(0, n);
export async function onRequestPost({ request, env }) {
  try {
    const b = await request.json();
    const customerName = clean(b.customerName, 100);
    const phone = clean(b.phone, 20).replace(/\s+/g, "");
    const governorate = clean(b.governorate, 60);
    const address = clean(b.address, 300);
    const slug = clean(b.productSlug, 100);
    const quantity = Number.parseInt(b.quantity, 10);
    if (customerName.length < 3 || !/^01[0125][0-9]{8}$/.test(phone) ||
        !governorate || address.length < 8 || !slug ||
        !Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      return json({ success:false, message:"راجع بيانات الطلب." }, 400);
    }
    const product = await env.jeebo_db.prepare(
      "SELECT id,name,slug,price FROM products WHERE slug=? AND status=1 LIMIT 1"
    ).bind(slug).first();
    if (!product) return json({ success:false, message:"المنتج غير متاح." }, 404);
    const unitPrice = Number(product.price);
    const total = unitPrice * quantity;
    const result = await env.jeebo_db.prepare(`
      INSERT INTO orders (
        customer_name,phone,governorate,address,product_id,product_slug,product_name,
        quantity,unit_price,total,status,ip,user_agent,referrer,
        utm_source,utm_medium,utm_campaign,fbclid,ttclid
      ) VALUES (?,?,?,?,?,?,?,?,?,?,'new',?,?,?,?,?,?,?,?)
    `).bind(
      customerName, phone, governorate, address, product.id, product.slug, product.name,
      quantity, unitPrice, total,
      clean(request.headers.get("CF-Connecting-IP"),80),
      clean(request.headers.get("User-Agent"),500),
      clean(request.headers.get("Referer"),500),
      clean(b.utmSource,150), clean(b.utmMedium,150), clean(b.utmCampaign,200),
      clean(b.fbclid,300), clean(b.ttclid,300)
    ).run();
    const id = Number(result.meta.last_row_id);
    const d = new Date().toISOString().slice(0,10).replaceAll("-","");
    const orderNumber = `JB-${d}-${String(id).padStart(6,"0")}`;
    await env.jeebo_db.prepare("UPDATE orders SET order_number=? WHERE id=?").bind(orderNumber,id).run();
    return json({ success:true, message:"تم استلام طلبك بنجاح.", orderId:id, orderNumber }, 201);
  } catch (e) {
    console.error(e);
    return json({ success:false, message:"حصل خطأ أثناء تسجيل الطلب." }, 500);
  }
}
