import { requireAdmin } from "../../lib/auth.js";
export async function onRequest(context) {
  const denied = requireAdmin(context.request, context.env);
  return denied || context.next();
}
