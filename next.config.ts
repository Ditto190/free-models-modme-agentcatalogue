import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        // 首页固定跳 /zh。middleware（Vercel）与 next.config redirects 双保险：
        // EdgeOne Makers 不识别 middleware 时，只要其适配器走 Next 路由即会命中本规则。
        source: "/",
        destination: "/zh",
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        // 静态页面/文件兜底：先声明默认缓存，后面的具体端点规则再覆盖
        source: "/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, s-maxage=86400",
          },
        ],
      },
      {
        // JSON 数据端点：免费额度/价格会更新，不宜永久缓存。
        // 用较短 max-age，并保留 CDN 边缘缓存（s-maxage）。
        source: "/:file(api|models|catalog).json",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, s-maxage=86400",
          },
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
        ],
      },
      {
        source: "/llms.txt",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, s-maxage=86400",
          },
        ],
      },
      {
        source: "/llms-full.txt",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, s-maxage=86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
