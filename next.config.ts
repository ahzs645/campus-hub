import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  transpilePackages: ["@firstform/campus-hub-engine", "@firstform/campus-hub-configurator"],
  turbopack: {
    resolveAlias: {
      "@firstform/campus-hub-engine/widgets": "./node_modules/@firstform/campus-hub-engine/src/widgets/index.ts",
      "@firstform/campus-hub-engine": "./node_modules/@firstform/campus-hub-engine/src/index.ts",
      "@firstform/campus-hub-configurator": "./node_modules/@firstform/campus-hub-configurator/src/index.ts",
    },
  },
};

export default nextConfig;
