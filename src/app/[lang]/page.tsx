import { getCatalog } from "@/lib/data";
import { RelayList } from "@/components/relay-list";
import { PageHeader } from "@/components/page-header";
import { JsonLd } from "@/components/json-ld";
import { HomeStats } from "@/components/home-stats";
import { SITE_URL } from "@/lib/site";
import type { RelayCard } from "@/lib/types";
import { isLocale, localePath } from "@/lib/locale";

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : "zh";
  const catalog = getCatalog();
  const relays = Object.values(catalog.api);
  const relayCount = relays.length;
  const models = Object.values(catalog.models);
  const modelCount = models.length;
  const freeModelCount = models.filter((m) => m.available_on.length > 0).length;

  // 列表行只用到少量字段，去掉嵌套 models 可显著减小页面 payload
  const relayCards: RelayCard[] = relays.map((r) => ({
    id: r.id,
    name: r.name,
    logo: r.logo,
    free_quota: r.free_quota,
    pricing: r.pricing,
    providers: r.providers,
    model_count: r.model_count,
    auth: r.auth,
    region: r.region,
  }));

  const webSite = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "中转站免费额度库",
    alternateName: "Relay Free-Quota DB",
    url: `${SITE_URL}${localePath(locale, "/")}`,
    description: "只收录提供免费额度的 LLM 中转站 / 聚合网关，数据以 JSON 开放。",
  };
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "中转站列表",
    itemListElement: relays.map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: r.name,
      url: `${SITE_URL}${localePath(locale, `/relay/${r.id}`)}`,
    })),
  };

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-6">
      <JsonLd data={webSite} />
      <JsonLd data={itemList} />
      <PageHeader titleKey="nav.providers" descKey="site.tagline" />
      <HomeStats relayCount={relayCount} modelCount={modelCount} freeModelCount={freeModelCount} />
      <RelayList relays={relayCards} />
    </main>
  );
}
