import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  transpilePackages: [
    "@firstform/campus-hub-engine",
    "@firstform/campus-hub-configurator",
    "@firstform/campus-hub-widget-sdk",
    "@firstform/campus-hub-widgets-time",
    "@firstform/campus-hub-widgets-media",
    "@firstform/campus-hub-widgets-campus",
    "@firstform/campus-hub-widgets-environment",
    "@firstform/campus-hub-widgets-info",
    "@firstform/campus-hub-widgets-fun",
    "@firstform/campus-hub-widgets-transit",
    "@firstform/campus-hub-widgets-utility",
  ],
  turbopack: {
    resolveAlias: {
      "@firstform/campus-hub-engine/widgets": "./packages/campus-hub-engine/src/widgets/index.ts",
      "@firstform/campus-hub-engine/src/*": "./packages/campus-hub-engine/src/*",
      "@firstform/campus-hub-engine": "./packages/campus-hub-engine/src/index.ts",
      "@firstform/campus-hub-configurator": "./packages/campus-hub-configurator/src/index.ts",
      "@firstform/campus-hub-widget-sdk": "./packages/campus-hub-widget-sdk/src/index.ts",
      "@firstform/campus-hub-widgets-time": "./packages/campus-hub-widgets/packages/time/src/index.ts",
      "@firstform/campus-hub-widgets-media": "./packages/campus-hub-widgets/packages/media/src/index.ts",
      "@firstform/campus-hub-widgets-campus": "./packages/campus-hub-widgets/packages/campus/src/index.ts",
      "@firstform/campus-hub-widgets-environment": "./packages/campus-hub-widgets/packages/environment/src/index.ts",
      "@firstform/campus-hub-widgets-info": "./packages/campus-hub-widgets/packages/info/src/index.ts",
      "@firstform/campus-hub-widgets-fun": "./packages/campus-hub-widgets/packages/fun/src/index.ts",
      "@firstform/campus-hub-widgets-transit": "./packages/campus-hub-widgets/packages/transit/src/index.ts",
      "@firstform/campus-hub-widgets-utility": "./packages/campus-hub-widgets/packages/utility/src/index.ts",
    },
  },
};

export default nextConfig;
