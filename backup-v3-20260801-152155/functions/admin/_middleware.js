function unauthorized() {
  return new Response("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Jeebo Admin", charset="UTF-8"',
      "Cache-Control": "no-store",
    },
  });
}

function safeEqual(a, b) {
  const left = new TextEncoder().encode(String(a ?? ""));
  const right = new TextEncoder().encode(String(b ?? ""));

  if (left.byteLength !== right.byteLength) return false;

  let result = 0;

  for (let i = 0; i < left.byteLength; i += 1) {
    result |= left[i] ^ right[i];
  }

  return result === 0;
}

export async function onRequest(context) {
  const authorization =
    context.request.headers.get("authorization") || "";

  if (!authorization.startsWith("Basic ")) {
    return unauthorized();
  }

  try {
    const decoded = atob(authorization.slice(6));
    const separator = decoded.indexOf(":");

    if (separator === -1) {
      return unauthorized();
    }

    const username = decoded.slice(0, separator);
    const password = decoded.slice(separator + 1);

    if (
      !context.env.ADMIN_USER ||
      !context.env.ADMIN_PASSWORD ||
      !safeEqual(username, context.env.ADMIN_USER) ||
      !safeEqual(password, context.env.ADMIN_PASSWORD)
    ) {
      return unauthorized();
    }

    return context.next();
  } catch {
    return unauthorized();
  }
}
