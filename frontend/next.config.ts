import type { NextConfig } from "next";

const productImageHosts = (process.env.PRODUCT_IMAGE_HOSTS ?? "via.placeholder.com")
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    remotePatterns: productImageHosts.map((hostname) => ({
      hostname,
      pathname: "/**",
      protocol: "https",
    })),
  },
};

export default nextConfig;
