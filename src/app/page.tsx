import { getCatalog } from "@/lib/data";
import { RelayList } from "@/components/relay-list";
import { PageHeader } from "@/components/page-header";
import { JsonLd } from "@/components/json-ld";
import { HomeStats } from "@/components/home-stats";
import { SITE_URL } from "@/lib/site";
import type { RelayCard } from "@/lib/types";

export default function Home() {
  const catalog = getCatalog();
  const relays = Object.values(catalog.api);
  const relayCount = relays.length;
  const modelCount = Object.keys(catalog.models).length;
  const freeRelayCount = relays.filter((r) => r.free_quota.available).length;

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
  }));

  const webSite = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "中转站免费额度库",
    alternateName: "Relay Free-Quota DB",
    url: SITE_URL,
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
      url: `${SITE_URL}/relay/${r.id}`,
    })),
  };

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-6">
      <JsonLd data={webSite} />
      <JsonLd data={itemList} />
      <PageHeader titleKey="nav.providers" descKey="site.tagline" />
      <HomeStats relayCount={relayCount} modelCount={modelCount} freeRelayCount={freeRelayCount} />
      <RelayList relays={relayCards} />
    </main>
  );
}