export async function getOrders() {
  const response = await fetch("/api/admin/orders");

  if (!response.ok) {
    throw new Error("Failed to load orders");
  }

  const data = await response.json();

  return data.orders || [];
}
