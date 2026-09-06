import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LOCALES = ["zh", "en"] as const;

function hasLocalePrefix(pathname: string): boolean {
  return LOCALES.some((locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`));
}

function pickLocale(request: NextRequest): "zh" | "en" {
  const cookieLocale = request.cookies.get("locale")?.value;
  if (cookieLocale === "zh" || cookieLocale === "en") return cookieLocale;
  const accept = request.headers.get("accept-language") ?? "";
  return /(^|,)\s*en([-,;]|$)/i.test(accept) ? "en" : "zh";
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (hasLocalePrefix(pathname)) return NextResponse.next();

  const locale = pickLocale(request);
  const path = pathname === "/" ? "" : pathname;
  request.nextUrl.pathname = `/${locale}${path}`;
  request.nextUrl.search = search;
  const response = NextResponse.redirect(request.nextUrl);
  // 根路径根据 Accept-Language/Cookie 选择语言，不能被 CDN 缓存成单一版本
  response.headers.set("Vary", "Accept-Language, Cookie");
  return response;
}

export const config = {
  // 只处理页面路径；数据端点、静态资源和元数据文件保持原样
  matcher: [
    "/((?!api\\.json|models\\.json|catalog\\.json|llms(?:\\.txt|-full\\.txt)|_next/static|_next/image|icon\\.svg|opengraph-image|robots\\.txt|sitemap\\.xml|logos/).*)",
  ],
};
