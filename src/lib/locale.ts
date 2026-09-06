// 语言路由辅助：所有页面内链都应经过这里，保证 /zh、/en 前缀一致。
import type { Locale } from "@/lib/i18n";

export const LOCALES: Locale[] = ["zh", "en"];

/** 给路径加上当前语言前缀，并保留 query / hash："/" -> "/zh"，"/models?q=x" -> "/zh/models?q=x" */
export function localePath(locale: Locale, path: string): string {
  const [pathname, rest = ""] = path.split("?");
  const suffix = pathname === "/" ? "" : pathname;
  const query = rest ? `?${rest}` : "";
  return `/${locale}${suffix}${query}`;
}

/** 去掉路径开头的语言段，供语言切换时保留当前页面："/en/relay/x" -> "/relay/x" */
export function stripLocalePath(pathname: string): string {
  return pathname.replace(/^\/(zh|en)(?=\/|$)/, "") || "/";
}

/** 判断字符串是否为本站支持的语言 */
export function isLocale(value: string): value is Locale {
  return value === "zh" || value === "en";
}
