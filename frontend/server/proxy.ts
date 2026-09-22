export const SERVICE_URLS = {
  cart: process.env.CART_SERVICE_URL || "http://localhost:8081",
  order: process.env.ORDER_SERVICE_URL || "http://localhost:8082",
  product: process.env.PRODUCT_SERVICE_URL || "http://localhost:8083",
} as const;

export type ServiceName = keyof typeof SERVICE_URLS;

export function resolveService(path: string): {
  target: string;
  service: ServiceName;
  upstreamPath: string;
} {
  const normalizedPath = path.startsWith("/api/") ? path.slice(4) : path;

  if (normalizedPath.startsWith("/customer/cart")) {
    return { target: SERVICE_URLS.cart, service: "cart", upstreamPath: normalizedPath };
  }
  if (normalizedPath.startsWith("/customer/checkout")) {
    return { target: SERVICE_URLS.order, service: "order", upstreamPath: normalizedPath };
  }
  if (normalizedPath.startsWith("/customer/orders")) {
    return { target: SERVICE_URLS.order, service: "order", upstreamPath: normalizedPath };
  }
  if (normalizedPath.startsWith("/catalog/products")) {
    return {
      target: SERVICE_URLS.product,
      service: "product",
      upstreamPath: normalizedPath.replace(/^\/catalog/, ""),
    };
  }
  if (normalizedPath.startsWith("/auth")) {
    return { target: SERVICE_URLS.cart, service: "cart", upstreamPath: normalizedPath };
  }
  return { target: SERVICE_URLS.product, service: "product", upstreamPath: normalizedPath };
}
