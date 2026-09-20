import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  images: {
    // صور المنتجات التجريبية SVG محلية — next/image يتطلب هذا الإذن صراحة
    dangerouslyAllowSVG: true,
    contentDispositionType: "inline",
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default config;
