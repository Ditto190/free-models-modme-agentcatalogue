import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCatalog } from "@/lib/data";
import { LabDetail } from "@/components/lab-detail";
import { JsonLd } from "@/components/json-ld";
import { SITE_URL } from "@/lib/site";
import { isLocale, LOCALES, localePath } from "@/lib/locale";
import type { Locale } from "@/lib/i18n";

export function generateStaticParams() {
  const catalog = getCatalog();
  const providers = Array.from(
    new Set(Object.values(catalog.models).map((m) => m.provider)),
  );
  return LOCALES.flatMap((lang) => providers.map((p) => ({ lang, id: p })));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}): Promise<Metadata> {
  const { lang: langRaw, id } = await params;
  const lang = isLocale(langRaw) ? langRaw : "zh";
  return {
    metadataBase: new URL(SITE_URL),
    title: id,
    description:
      lang === "zh"
        ? `${id} 的模型列表与可免费使用的中转站。`
        : `Models from ${id} and relays that offer them for free.`,
    alternates: {
      canonical: `${SITE_URL}${localePath(lang, `/labs/${id}`)}`,
      languages: {
        zh: `${SITE_URL}${localePath("zh", `/labs/${id}`)}`,
        en: `${SITE_URL}${localePath("en", `/labs/${id}`)}`,
      },
    },
  };
}

export default async function LabPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang: langRaw, id } = await params;
  const lang: Locale = isLocale(langRaw) ? langRaw : "zh";
  const catalog = getCatalog();
  const models = Object.values(catalog.models).filter((m) => m.provider === id);
  if (models.length === 0) notFound();
  const modelsLabel = lang === "zh" ? "模型库" : "Models";
  const base = `${SITE_URL}${localePath(lang, "/")}`;

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: modelsLabel, item: `${base}/models` },
      {
        "@type": "ListItem",
        position: 2,
        name: id,
        item: `${base}/labs/${id}`,
      },
    ],
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <JsonLd data={breadcrumb} />
      <LabDetail provider={id} models={models} />
    </main>
  );
}
