import type { Metadata } from "next";
import { getCatalog } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { AboutContent } from "@/components/about-content";
import { SITE_URL } from "@/lib/site";
import { isLocale, localePath } from "@/lib/locale";

const ABOUT_META = {
  zh: {
    title: "关于",
    description: "关于本站：只收录提供免费额度的 LLM 中转站与聚合网关，数据以 JSON 开放。",
  },
  en: {
    title: "About",
    description: "About Relay Free-Quota DB: LLM relays and gateways with a free tier, served as open JSON.",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : "zh";
  const path = localePath(locale, "/about");
  return {
    metadataBase: new URL(SITE_URL),
    title: ABOUT_META[locale].title,
    description: ABOUT_META[locale].description,
    alternates: {
      canonical: `${SITE_URL}${path}`,
      languages: { zh: `${SITE_URL}/zh/about`, en: `${SITE_URL}/en/about` },
    },
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  await params;
  const catalog = getCatalog();
  const relayCount = Object.keys(catalog.api).length;
  const modelCount = Object.keys(catalog.models).length;
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <PageHeader titleKey="about.title" />
      <AboutContent relayCount={relayCount} modelCount={modelCount} />
    </main>
  );
}
