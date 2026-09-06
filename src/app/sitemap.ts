import type { MetadataRoute } from "next";
import { getCatalog, getRelays } from "@/lib/data";
import { SITE_URL } from "@/lib/site";
import { LOCALES, localePath } from "@/lib/locale";

export default function sitemap(): MetadataRoute.Sitemap {
  const relays = getRelays();
  const modelIds = Object.keys(getCatalog().models);
  const providerIds = Array.from(
    new Set(Object.values(getCatalog().models).map((m) => m.provider)),
  );

  return LOCALES.flatMap((lang) => {
    const now = new Date().toISOString();
    const url = (path: string) => `${SITE_URL}${localePath(lang, path)}`;
    return [
      { url: url("/"), lastModified: now },
      { url: url("/about"), lastModified: now },
      ...relays.map((relay) => ({
        url: url(`/relay/${relay.id}`),
        lastModified: relay.updated_at,
      })),
      ...modelIds.map((id) => ({ url: url(`/models/${id}`), lastModified: now })),
      ...providerIds.map((id) => ({ url: url(`/labs/${id}`), lastModified: now })),
    ];
  });
}
