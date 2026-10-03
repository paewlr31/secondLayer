import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: root,
  devIndicators: false,
  serverExternalPackages: ["unpdf"],
};

export default nextConfig;
