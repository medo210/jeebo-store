function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function cleanText(value, maxLength) {
  return String(value ?? "").trim().slice(0, maxLength);
}

export async function onRequestPost({ request, env }) {
  try {
    const contentType = request.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      return json(
        {
          success: false,
          message: "نوع البيانات غير صحيح.",
        },
        415,
      );
    }

    const body = await request.json();

    const customerName = cleanText(body.customerName, 100);
    const phone = cleanText(body.phone, 20).replace(/\s+/g, "");
    const governorate = cleanText(body.governorate, 60);
    const address = cleanText(body.address, 300);
    const productSlug = cleanText(body.productSlug, 100);
    const productName = cleanText(body.productName, 150);

    const quantity = Number.parseInt(body.quantity, 10);
    const unitPrice = Number(body.unitPrice);

    if (
      customerName.length < 3 ||
      !/^01[0125][0-9]{8}$/.test(phone) ||
      !governorate ||
      address.length < 8 ||
      !productSlug ||
      !productName ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 10 ||
      !Number.isFinite(unitPrice) ||
      unitPrice <= 0
    ) {
      return json(
        {
          success: false,
          message: "راجع بيانات الطلب واكتبها بشكل صحيح.",
        },
        400,
      );
    }

    const total = unitPrice * quantity;

    const result = await env.jeebo_db
      .prepare(
        `INSERT INTO orders (
          customer_name,
          phone,
          governorate,
          address,
          product_slug,
          product_name,
          quantity,
          unit_price,
          total,
          status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')`,
      )
      .bind(
        customerName,
        phone,
        governorate,
        address,
        productSlug,
        productName,
        quantity,
        unitPrice,
        total,
      )
      .run();

    return json(
      {
        success: true,
        message: "تم استلام طلبك بنجاح.",
        orderId: result.meta.last_row_id,
      },
      201,
    );
  } catch (error) {
    console.error("Order API error:", error);

    return json(
      {
        success: false,
        message: "حصل خطأ أثناء تسجيل الطلب. حاول مرة أخرى.",
      },
      500,
    );
  }
}

export function onRequestGet() {
  return json(
    {
      success: false,
      message: "الطريقة غير مسموحة.",
    },
    405,
  );
}
