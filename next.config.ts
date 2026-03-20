import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  transpilePackages: [
    "react-native",
    "react-native-web",
    "react-native-svg",
    "react-native-svg-web",
    "lucide-react-native",
    "@campus-hub/shared",
  ],
  turbopack: {
    resolveAlias: {
      "react-native": "react-native-web",
      "react-native-svg": "react-native-svg-web",
    },
    resolveExtensions: [
      ".web.tsx",
      ".web.ts",
      ".web.js",
      ".tsx",
      ".ts",
      ".js",
      ".json",
    ],
  },
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "react-native$": "react-native-web",
      "react-native-svg": "react-native-svg-web",
      "@campus-hub/shared": path.resolve(__dirname, "packages/shared/src"),
    };
    config.resolve.extensions = [
      ".web.tsx",
      ".web.ts",
      ".web.js",
      ".tsx",
      ".ts",
      ".js",
      ...(config.resolve.extensions || []),
    ];
    return config;
  },
};

export default nextConfig;
