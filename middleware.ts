// EdgeOne Makers 与 Next.js 双端兼容的边缘中间件（Edge 运行时）。
// - EdgeOne Makers 约定：项目根目录 middleware.ts，导出 middleware(context)，context 提供 { request, next, redirect, rewrite }，
//   在边缘节点、页面加载前拦截请求（EdgeOne 不执行 Next.js 自带的 middleware/proxy，故以此补齐语言跳转）。
// - Next.js 约定：root 或 src 下 middleware.ts 导出 middleware(request)，request 为 NextRequest。
// 两端入参形态不同，统一从入参派生标准 Request；未命中语言前缀时 307 跳到 /zh 或 /en。
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- 双平台框架边界，入参为 NextRequest 或 Makers context
export function middleware(input: any): Response | undefined {
  const makers =
    !(input instanceof Request) && typeof input.redirect === "function" ? input : null;
  const request: Request = makers ? makers.request : input;
  const { pathname } = new URL(request.url);

  // 数据端点、静态资源与元数据文件保持原样
  if (
    /^\/(api\.json|models\.json|catalog\.json|llms(-full)?\.txt|robots\.txt|sitemap\.xml|icon\.svg|opengraph-image|favicon\.ico|favicon\.svg|logos\/|_next\/)/.test(
      pathname,
    )
  ) {
    return makers ? makers.next() : undefined;
  }
  // 已带语言前缀的路径直接放行
  if (/^\/(zh|en)(\/|$)/.test(pathname)) {
    return makers ? makers.next() : undefined;
  }

  const locale = pickLocale(
    request.headers.get("cookie") ?? "",
    request.headers.get("accept-language") ?? "",
  );
  const path = pathname === "/" ? "" : pathname;
  // Next.js 端重定向上限 Response.redirect/NextResponse 均可，这里统一用标准 Response，
  // Location 用绝对 URL 以同时兼容两端的边缘运行时。
  return new Response(null, {
    status: 307,
    headers: {
      Location: new URL(`/${locale}${path}`, request.url).href,
      // 根路径按 Accept-Language/Cookie 选择语言，不能被 CDN 缓存成单一版本
      Vary: "Accept-Language, Cookie",
    },
  });
}

// 优先 Cookie 中的 locale，其次按 Accept-Language 判断
function pickLocale(cookieHeader: string, acceptLanguage: string): "zh" | "en" {
  const m = /(?:^|;\s*)locale=(zh|en)(?:;|$)/.exec(cookieHeader);
  if (m) return m[1] as "zh" | "en";
  return /(^|,)\s*en([-,;]|$)/i.test(acceptLanguage) ? "en" : "zh";
}