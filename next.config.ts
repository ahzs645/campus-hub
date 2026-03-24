import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  transpilePackages: ["@firstform/campus-hub-engine", "@firstform/campus-hub-configurator", "@firstform/campus-hub-widget-sdk"],
  turbopack: {
    resolveAlias: {
      "@firstform/campus-hub-engine/widgets": "./packages/campus-hub-engine/src/widgets/index.ts",
      "@firstform/campus-hub-engine/src/*": "./packages/campus-hub-engine/src/*",
      "@firstform/campus-hub-engine": "./packages/campus-hub-engine/src/index.ts",
      "@firstform/campus-hub-configurator": "./packages/campus-hub-configurator/src/index.ts",
      "@firstform/campus-hub-widget-sdk": "./packages/campus-hub-widget-sdk/src/index.ts",
    },
  },
};

export default nextConfig;
