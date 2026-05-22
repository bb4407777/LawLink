/** @type {import('next').NextConfig} */
const nextConfig = {
  // typedRoutes 等 Stage 2 路由稳定后再开启
  experimental: {
    typedRoutes: false
  }
};

export default nextConfig;
