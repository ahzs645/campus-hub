import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  transpilePackages: ["@firstform/campus-hub-engine", "@firstform/campus-hub-configurator"],
  turbopack: {},
};

export default nextConfig;
