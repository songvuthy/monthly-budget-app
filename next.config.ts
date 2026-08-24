import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfkit reads its font (.afm) files from disk at runtime using relative
  // paths. If Next bundles it into the server chunk, those paths break.
  // Keeping it external makes Next require it normally from node_modules.
  serverExternalPackages: ["pdfkit", "firebase-admin"],
};

export default nextConfig;
