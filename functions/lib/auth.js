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
  const x = new TextEncoder().encode(String(a ?? ""));
  const y = new TextEncoder().encode(String(b ?? ""));
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
export function requireAdmin(request, env) {
  const h = request.headers.get("authorization") || "";
  if (!h.startsWith("Basic ")) return unauthorized();
  try {
    const decoded = atob(h.slice(6));
    const i = decoded.indexOf(":");
    if (i < 0) return unauthorized();
    const user = decoded.slice(0, i);
    const pass = decoded.slice(i + 1);
    if (!env.ADMIN_USER || !env.ADMIN_PASSWORD ||
        !safeEqual(user, env.ADMIN_USER) ||
        !safeEqual(pass, env.ADMIN_PASSWORD)) return unauthorized();
    return null;
  } catch { return unauthorized(); }
}
