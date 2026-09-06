import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCatalog, getRelay, getRelays } from "@/lib/data";
import { RelayDetail } from "@/components/relay-detail";
import { JsonLd } from "@/components/json-ld";
import { relayOrgLd } from "@/lib/jsonld";
import { SITE_URL } from "@/lib/site";
import type { Model } from "@/lib/types";
import { isLocale, LOCALES, localePath } from "@/lib/locale";
import type { Locale } from "@/lib/i18n";

export function generateStaticParams() {
  return LOCALES.flatMap((lang) => getRelays().map((r) => ({ lang, id: r.id })));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}): Promise<Metadata> {
  const { lang: langRaw, id } = await params;
  const lang: Locale = isLocale(langRaw) ? langRaw : "zh";
  const relay = getRelay(id);
  if (!relay) return {};
  const fq = relay.free_quota;
  const desc =
    lang === "zh"
      ? fq.available && fq.amount
        ? `${relay.name}：${fq.amount}${fq.notes ? `，${fq.notes}` : ""}`
        : `${relay.name} 的免费额度、支持的模型与注册方式。`
      : fq.available && fq.amount
        ? `Free quota at ${relay.name}: ${fq.amount}. Sign up, supported models and API docs.`
        : `Free tier, supported models and signup for ${relay.name}.`;
  const url = `${SITE_URL}${localePath(lang, `/relay/${relay.id}`)}`;
  return {
    metadataBase: new URL(SITE_URL),
    title: relay.name,
    description: desc,
    alternates: {
      canonical: url,
      languages: {
        zh: `${SITE_URL}${localePath("zh", `/relay/${relay.id}`)}`,
        en: `${SITE_URL}${localePath("en", `/relay/${relay.id}`)}`,
      },
    },
    openGraph: {
      title: `${relay.name} · Relay Free-Quota DB`,
      description: desc,
      url,
      type: "website",
    },
  };
}

export default async function RelayPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang: langRaw, id } = await params;
  const lang = isLocale(langRaw) ? langRaw : "zh";
  const relay = getRelay(id);
  if (!relay) notFound();
  const catalog = getCatalog();
  const base = `${SITE_URL}${localePath(lang, "/")}`;
  const relaysLabel = lang === "zh" ? "中转站" : "Relays";

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: relaysLabel, item: base },
      {
        "@type": "ListItem",
        position: 2,
        name: relay.name,
        item: `${base}/relay/${relay.id}`,
      },
    ],
  };

  // 只内联本中转站在售模型的规格，避免全量 catalog 序列化
  const models: Record<string, Model> = {};
  for (const mid of Object.keys(relay.models)) {
    const m = catalog.models[mid];
    if (m) models[mid] = m;
  }

  return (
    <>
      <JsonLd data={breadcrumb} />
      <JsonLd data={relayOrgLd(relay, base)} />
      <RelayDetail relay={relay} models={models} />
    </>
  );
}
