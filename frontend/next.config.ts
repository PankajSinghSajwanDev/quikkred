import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  // Keep file tracing inside this app when the repo has multiple lockfiles.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
