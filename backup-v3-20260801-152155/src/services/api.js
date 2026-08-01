export async function getProducts(signal) {
  const response = await fetch("/api/products", {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    signal,
  });

  if (!response.ok) {
    throw new Error("تعذر تحميل المنتجات");
  }

  const products = await response.json();

  return products.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: Number(product.price),
    oldPrice: Number(product.old_price),
    badge: product.badge,
    image: product.image,
    sortOrder: product.sort_order,
  }));
}

export async function getProduct(slug, signal) {
  const response = await fetch(
    `/api/products/${encodeURIComponent(slug)}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal,
    },
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error("تعذر تحميل المنتج");
  }

  const product = await response.json();

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: Number(product.price),
    oldPrice: Number(product.old_price),
    badge: product.badge,
    image: product.image,
    images: product.images || [product.image],
    sortOrder: product.sort_order,
  };
}
