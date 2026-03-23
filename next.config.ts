import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  transpilePackages: ["@campus-hub/engine", "@campus-hub/configurator"],
  turbopack: {
    root: path.resolve(__dirname, ".."),
  },
};

export default nextConfig;
