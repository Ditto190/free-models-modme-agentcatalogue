import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCatalog } from "@/lib/data";
import { ModelDetail } from "@/components/model-detail";
import { JsonLd } from "@/components/json-ld";
import { SITE_URL } from "@/lib/site";
import type { RelayBrief } from "@/lib/types";
import { isLocale, LOCALES, localePath } from "@/lib/locale";
import type { Locale } from "@/lib/i18n";

export function generateStaticParams() {
  return LOCALES.flatMap((lang) =>
    Object.keys(getCatalog().models).map((id) => ({ lang, id: id.split("/") })),
  );
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; id: string[] }>;
}): Promise<Metadata> {
  const { lang: langRaw, id } = await params;
  const lang = isLocale(langRaw) ? langRaw : "zh";
  const model = getCatalog().models[id.join("/")];
  const modelPath = localePath(lang, `/models/${id.join("/")}`);
  return {
    metadataBase: new URL(SITE_URL),
    title: model?.name ?? (lang === "zh" ? "模型" : "Model"),
    description:
      lang === "zh"
        ? model?.description
        : model
          ? `Model specs for ${model.name} and the relays that offer it for free.`
          : undefined,
    alternates: {
      canonical: `${SITE_URL}${modelPath}`,
      languages: {
        zh: `${SITE_URL}${localePath("zh", `/models/${id.join("/")}`)}`,
        en: `${SITE_URL}${localePath("en", `/models/${id.join("/")}`)}`,
      },
    },
  };
}

export default async function ModelPage({
  params,
}: {
  params: Promise<{ lang: string; id: string[] }>;
}) {
  const { lang: langRaw, id } = await params;
  const lang: Locale = isLocale(langRaw) ? langRaw : "zh";
  const catalog = getCatalog();
  const model = catalog.models[id.join("/")];
  if (!model) notFound();
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
        name: model.provider,
        item: `${base}/labs/${model.provider}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: model.name,
        item: `${base}/models/${model.id}`,
      },
    ],
  };

  // 只内联可免费使用中转站的精简摘要，避免全量 catalog 序列化
  const relays: RelayBrief[] = (model.free_on ?? model.available_on)
    .map((rid) => catalog.api[rid])
    .filter((r) => !!r)
    .map(({ id, name, logo, free_quota }) => ({ id, name, logo, free_quota }));

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <JsonLd data={breadcrumb} />
      <ModelDetail model={model} relays={relays} />
    </main>
  );
}
