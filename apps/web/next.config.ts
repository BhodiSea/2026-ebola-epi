import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  headers() {
    return [
      {
        source: "/embed/:path*",
        headers: [{ key: "X-Frame-Options", value: "" }],
      },
    ];
  },
};

export default nextConfig;
