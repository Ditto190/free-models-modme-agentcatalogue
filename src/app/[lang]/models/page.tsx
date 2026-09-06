import type { Metadata } from "next";
import { getCatalog } from "@/lib/data";
import { ModelList } from "@/components/model-list";
import { JsonLd } from "@/components/json-ld";
import { SITE_URL } from "@/lib/site";
import { isLocale, localePath } from "@/lib/locale";

const MODELS_META = {
  zh: {
    title: "模型库",
    description: "收录各中转站提供的模型规格，查看可在哪些中转站免费使用。",
    listName: "LLM 模型列表",
  },
  en: {
    title: "Models",
    description: "Model specs offered by indexed relays and which relays provide them for free.",
    listName: "LLM model list",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : "zh";
  return {
    metadataBase: new URL(SITE_URL),
    title: MODELS_META[locale].title,
    description: MODELS_META[locale].description,
    alternates: {
      canonical: `${SITE_URL}${localePath(locale, "/models")}`,
      languages: { zh: `${SITE_URL}/zh/models`, en: `${SITE_URL}/en/models` },
    },
  };
}

export default async function ModelsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : "zh";
  const catalog = getCatalog();
  const models = Object.values(catalog.models);

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: MODELS_META[locale].listName,
    itemListElement: models.map((m, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: m.name,
      url: `${SITE_URL}${localePath(locale, `/models/${m.id}`)}`,
    })),
  };

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-8">
      <JsonLd data={itemList} />
      <ModelList models={models} />
    </main>
  );
}
