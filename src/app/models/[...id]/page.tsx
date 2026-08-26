import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCatalog } from "@/lib/data";
import { ModelDetail } from "@/components/model-detail";
import { JsonLd } from "@/components/json-ld";
import { SITE_URL } from "@/lib/site";
import type { RelayBrief } from "@/lib/types";

export function generateStaticParams() {
  return Object.keys(getCatalog().models).map((id) => ({ id: id.split("/") }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string[] }>;
}): Promise<Metadata> {
  const { id } = await params;
  const model = getCatalog().models[id.join("/")];
  return {
    title: model?.name ?? "模型",
    description: model?.description,
    alternates: { canonical: `${SITE_URL}/models/${id.join("/")}` },
  };
}

export default async function ModelPage({ params }: { params: Promise<{ id: string[] }> }) {
  const { id } = await params;
  const catalog = getCatalog();
  const model = catalog.models[id.join("/")];
  if (!model) notFound();

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "模型库", item: `${SITE_URL}/models` },
      {
        "@type": "ListItem",
        position: 2,
        name: model.provider,
        item: `${SITE_URL}/labs/${model.provider}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: model.name,
        item: `${SITE_URL}/models/${model.id}`,
      },
    ],
  };

  // 只内联可免费使用中转站的精简摘要，避免全量 catalog 序列化
  const relays: RelayBrief[] = model.available_on
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
