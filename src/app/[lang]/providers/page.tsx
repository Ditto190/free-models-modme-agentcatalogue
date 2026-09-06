import { redirect } from "next/navigation";
import { isLocale, localePath } from "@/lib/locale";

// 中转站列表已移至首页（/），此路由保持兼容跳转
export default async function ProvidersPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  redirect(localePath(isLocale(lang) ? lang : "zh", "/"));
}
