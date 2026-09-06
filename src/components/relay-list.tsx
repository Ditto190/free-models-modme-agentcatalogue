"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Search, SearchX } from "lucide-react";
import type { FreeQuotaType, RelayCard } from "@/lib/types";
import { useApp } from "@/components/providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProviderLogo, RelayLogo } from "@/components/logo";
import { FREE_VARIANT } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { useQueryParam, setQueryParam } from "@/lib/url";
import { SubmitRelayButton } from "@/components/submit-relay-button";
import type { DictKey } from "@/lib/i18n";
import { localePath } from "@/lib/locale";

const QUOTA_TYPES: FreeQuotaType[] = ["credit", "token", "daily_checkin", "free_models", "unlimited"];

/** 中转站列表行：桌面为表格行，移动端为卡片 */
function RelayRow({ relay }: { relay: RelayCard }) {
  const { t, locale } = useApp();
  const fq = relay.free_quota;
  const fType = fq.type as FreeQuotaType | undefined;
  const providers = relay.providers.slice(0, 3);
  const extra = relay.providers.length - providers.length;
  const note = fq.notes ?? relay.pricing.notes;

  return (
    <li className="group transition-colors hover:bg-accent/40 md:grid md:grid-cols-[1.2fr_1.3fr_1.5fr_1fr_0.6fr_1fr] md:items-center md:gap-4">
      {/* 中转站 */}
      <div className="flex min-w-0 items-center gap-3 px-4 py-3">
        <RelayLogo id={relay.id} name={relay.name} size={40} logo={relay.logo} />
        <div className="min-w-0">
          <Link
            href={localePath(locale, `/relay/${relay.id}`)}
            className="block truncate font-semibold text-foreground hover:underline"
          >
            {relay.name}
          </Link>
          <span className="hidden text-xs text-muted-foreground md:inline">
            {t("card.models", { n: relay.model_count })}
          </span>
        </div>
      </div>

      {/* 免费额度 */}
      <div className="px-4 pb-3 md:py-3">
        <span className="mb-1 text-xs text-muted-foreground md:hidden">{t("card.free")}</span>
        <div
          className={cn(
            "rounded-xl px-3 py-2 ring-1",
            fq.available
              ? "bg-emerald-500/5 ring-emerald-500/10"
              : "bg-muted ring-border",
          )}
        >
          {fq.available && fType && (
            <Badge variant={FREE_VARIANT[fType]} className="mb-1">
              {t(`free.${fType}` as DictKey)}
            </Badge>
          )}
          <div className="text-sm font-semibold leading-snug text-foreground">
            {fq.amount ?? t("card.viewDetail")}
          </div>
        </div>
      </div>

      {/* 说明 */}
      <div className="px-4 pb-3 md:py-3">
        <span className="mb-1 text-xs text-muted-foreground md:hidden">{t("providers.notes")}</span>
        <p className="line-clamp-2 text-sm text-muted-foreground">{note ?? "—"}</p>
      </div>

      {/* 支持厂商 */}
      <div className="px-4 pb-3 md:py-3">
        <span className="mb-1 text-xs text-muted-foreground md:hidden">{t("card.providers")}</span>
        <div className="flex flex-wrap items-center gap-2">
          {providers.map((p) => (
            <Link
              key={p}
              href={localePath(locale, `/labs/${p}`)}
              title={p}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ProviderLogo id={p} size={22} />
            </Link>
          ))}
          {extra > 0 && (
            <span className="rounded-lg bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">
              +{extra}
            </span>
          )}
        </div>
      </div>

      {/* 模型数（仅桌面） */}
      <div className="hidden text-sm text-muted-foreground md:block">{relay.model_count}</div>

      {/* 操作 */}
      <div className="flex items-center gap-2 px-4 pb-3 md:py-3">
        <Button asChild size="sm" className="flex-1">
          <Link href={localePath(locale, `/relay/${relay.id}`)}>{t("card.viewDetail")}</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <a href={relay.auth.signup} target="_blank" rel="noreferrer">
            {t("card.signup")}
          </a>
        </Button>
      </div>
    </li>
  );
}

/** 中转站（供应商）列表 */
export function RelayList({ relays }: { relays: RelayCard[] }) {
  const { t } = useApp();
  const query = useQueryParam("q");
  const typeFilter = useQueryParam("type");
  const regionFilter = useQueryParam("region");
  const providerFilter = useQueryParam("provider");
  const sortRaw = useQueryParam("sort");

  const regionOptions = useMemo(
    () => [...new Set(relays.flatMap((r) => r.region ?? []))].sort((a, b) => a.localeCompare(b)),
    [relays],
  );
  const providerOptions = useMemo(
    () => [...new Set(relays.flatMap((r) => r.providers))].sort((a, b) => a.localeCompare(b)),
    [relays],
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    let list = relays.filter((relay) => {
      if (typeFilter && relay.free_quota.type !== typeFilter) return false;
      const regions: string[] = relay.region ?? [];
      if (regionFilter && !regions.includes(regionFilter)) return false;
      if (providerFilter && !relay.providers.includes(providerFilter)) return false;
      if (!term) return true;
      const notes = relay.free_quota.notes ?? relay.pricing.notes ?? "";
      const haystack = [
        relay.id,
        relay.name,
        relay.providers.join(" "),
        relay.free_quota.amount ?? "",
        notes,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });

    if (sortRaw === "amount") {
      list = [...list].sort((a, b) => (b.free_quota.amount_usd ?? -1) - (a.free_quota.amount_usd ?? -1));
    } else if (sortRaw === "models") {
      list = [...list].sort((a, b) => b.model_count - a.model_count);
    } else if (sortRaw === "name") {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    }
    return list;
  }, [relays, query, typeFilter, regionFilter, providerFilter, sortRaw]);

  const hasFilters = Boolean(query || typeFilter || regionFilter || providerFilter || sortRaw);
  const clearFilters = () => {
    for (const key of ["q", "type", "region", "provider", "sort"]) setQueryParam(key, "");
  };

  return (
    <>
      <div className="mb-4 space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQueryParam("q", e.target.value)}
            placeholder={t("relays.search")}
            aria-label={t("relays.search")}
            type="search"
            className="h-11 w-full rounded-xl border border-border/60 bg-card pl-9 pr-3 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded-lg border border-border/60 bg-card px-2.5 py-2 text-sm shadow-sm">
            <select
              value={typeFilter}
              onChange={(e) => setQueryParam("type", e.target.value)}
              aria-label={t("relays.allTypes")}
              className="bg-transparent text-foreground focus:outline-none"
            >
              <option value="">{t("relays.allTypes")}</option>
              {QUOTA_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`free.${type}` as DictKey)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 rounded-lg border border-border/60 bg-card px-2.5 py-2 text-sm shadow-sm">
            <select
              value={regionFilter}
              onChange={(e) => setQueryParam("region", e.target.value)}
              aria-label={t("relays.allRegions")}
              className="bg-transparent text-foreground focus:outline-none"
            >
              <option value="">{t("relays.allRegions")}</option>
              {regionOptions.map((region) => (
                <option key={region} value={region}>
                  {t(`region.${region}` as DictKey)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 rounded-lg border border-border/60 bg-card px-2.5 py-2 text-sm shadow-sm">
            <select
              value={providerFilter}
              onChange={(e) => setQueryParam("provider", e.target.value)}
              aria-label={t("relays.allProviders")}
              className="bg-transparent text-foreground focus:outline-none"
            >
              <option value="">{t("relays.allProviders")}</option>
              {providerOptions.map((provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 rounded-lg border border-border/60 bg-card px-2.5 py-2 text-sm shadow-sm">
            <select
              value={sortRaw}
              onChange={(e) => setQueryParam("sort", e.target.value)}
              aria-label={t("models.sortBy")}
              className="bg-transparent text-foreground focus:outline-none"
            >
              <option value="">{t("relays.sortDefault")}</option>
              <option value="amount">{t("relays.sortAmount")}</option>
              <option value="models">{t("relays.sortModels")}</option>
              <option value="name">{t("relays.sortName")}</option>
            </select>
          </label>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {t("relays.clearFilters")}
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">{t("home.submitHint")}</p>
          <SubmitRelayButton />
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 p-10 text-center text-muted-foreground">
          <SearchX className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm">{t("relays.noResults")}</p>
        </div>
      ) : (
      <>
      <div className="hidden border-b border-border bg-card/80 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:grid md:grid-cols-[1.2fr_1.3fr_1.5fr_1fr_0.6fr_1fr] md:gap-4">
        <span>{t("providers.relays")}</span>
        <span>{t("card.free")}</span>
        <span>{t("providers.notes")}</span>
        <span>{t("card.providers")}</span>
        <span>{t("card.modelsCount")}</span>
        <span className="text-right">{t("card.viewDetail")}</span>
      </div>
      <ul className="divide-y divide-border">
        {filtered.map((r) => (
          <RelayRow key={r.id} relay={r} />
        ))}
      </ul>
      </>
      )}
      </div>
    </>
  );
}
