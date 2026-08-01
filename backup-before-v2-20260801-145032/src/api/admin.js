async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "حدث خطأ غير متوقع.");
  }

  return data;
}

export function getDashboard() {
  return request("/api/admin/dashboard");
}

export function getAdminOrders({ search = "", status = "", page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams({
    search,
    status,
    page: String(page),
    limit: String(limit),
  });
  return request(`/api/admin/orders?${params}`);
}

export function updateOrder(id, payload) {
  return request(`/api/admin/orders/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteOrder(id) {
  return request(`/api/admin/orders/${id}`, { method: "DELETE" });
}

export function getAdminProducts() {
  return request("/api/admin/products");
}

export function createProduct(payload) {
  return request("/api/admin/products", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateProduct(id, payload) {
  return request(`/api/admin/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteProduct(id) {
  return request(`/api/admin/products/${id}`, { method: "DELETE" });
}

export function getSettings() {
  return request("/api/admin/settings");
}

export function saveSettings(payload) {
  return request("/api/admin/settings", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
