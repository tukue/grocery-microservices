export const SERVICE_URLS = {
  cart: process.env.CART_SERVICE_URL || "http://localhost:8081",
  order: process.env.ORDER_SERVICE_URL || "http://localhost:8082",
  product: process.env.PRODUCT_SERVICE_URL || "http://localhost:8083",
} as const;

export type ServiceName = keyof typeof SERVICE_URLS;

export function resolveService(path: string): {
  target: string;
  service: ServiceName;
} {
  if (path.startsWith("/api/customer/cart")) {
    return { target: SERVICE_URLS.cart, service: "cart" };
  }
  if (path.startsWith("/api/customer/checkout")) {
    return { target: SERVICE_URLS.order, service: "order" };
  }
  if (path.startsWith("/api/customer/orders")) {
    return { target: SERVICE_URLS.order, service: "order" };
  }
  if (path.startsWith("/api/catalog/products")) {
    return { target: SERVICE_URLS.product, service: "product" };
  }
  if (path.startsWith("/api/auth")) {
    return { target: SERVICE_URLS.cart, service: "cart" };
  }
  return { target: SERVICE_URLS.product, service: "product" };
}
