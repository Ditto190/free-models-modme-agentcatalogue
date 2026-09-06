"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Copy, Check, Search, SearchX, X } from "lucide-react";
import type { Model } from "@/lib/types";
import { useApp } from "@/components/providers";
import { formatTokens } from "@/lib/format";
import { sortByReleaseDate } from "@/lib/sort";
import { useQueryParam, setQueryParam } from "@/lib/url";
import { cn } from "@/lib/utils";
import { localePath } from "@/lib/locale";
import { FeatureState } from "@/components/feature-state";

function matchesQuery(model: Model, q: string): boolean {
  const term = q.trim().toLowerCase();
  if (!term) return true;
  return (
    model.name.toLowerCase().includes(term) ||
    model.id.toLowerCase().includes(term) ||
    model.provider.toLowerCase().includes(term)
  );
}

function matchesFlags(
  model: Model,
  flags: { reasoning: boolean; tool: boolean; structured: boolean; openWeights: boolean },
): boolean {
  if (flags.reasoning && !model.reasoning) return false;
  if (flags.tool && !model.tool_call) return false;
  if (flags.structured && !model.structured_output) return false;
  if (flags.openWeights && !model.open_weights) return false;
  return true;
}

type ModelSort = "latest" | "name" | "context" | "price";

/** 模型库列表（支持 URL 查询参数搜索与即时过滤） */
export function ModelList({ models }: { models: Model[] }) {
  const { t, locale } = useApp();
  const query = useQueryParam("q");
  const providerFilter = useQueryParam("provider");
  const sortRaw = useQueryParam("sort") || "latest";
  const reasoningFilter = useQueryParam("reasoning") === "1";
  const toolFilter = useQueryParam("tool") === "1";
  const structuredFilter = useQueryParam("structured") === "1";
  const openWeightsFilter = useQueryParam("open") === "1";

  const allModels = useMemo(() => sortByReleaseDate(models), [models]);

  const [copied, setCopied] = useState<string | null>(null);

  const filtered = useMemo(
    () => {
      const flags = {
        reasoning: reasoningFilter,
        tool: toolFilter,
        structured: structuredFilter,
        openWeights: openWeightsFilter,
      };
      let list = allModels.filter(
        (m) =>
          matchesQuery(m, query) &&
          (!providerFilter || m.provider === providerFilter) &&
          matchesFlags(m, flags),
      );
      const sort = (sortRaw || "latest") as ModelSort;
      if (sort === "name") {
        list = [...list].sort((a, b) => a.name.localeCompare(b.name));
      } else if (sort === "context") {
        list = [...list].sort((a, b) => (b.context ?? 0) - (a.context ?? 0));
      } else if (sort === "price") {
        list = [...list].sort((a, b) => (a.price?.input ?? Infinity) - (b.price?.input ?? Infinity));
      } else {
        list = sortByReleaseDate(list);
      }
      return list;
    },
    [allModels, query, providerFilter, sortRaw, reasoningFilter, toolFilter, structuredFilter, openWeightsFilter],
  );

  const updateQuery = (value: string) => {
    setQueryParam("q", value.trim());
  };

  const providers = useMemo(
    () => [...new Set(models.map((m) => m.provider))].sort((a, b) => a.localeCompare(b)),
    [models],
  );

  const toggleFilter = (key: "reasoning" | "tool" | "structured" | "open") => {
    const active =
      key === "reasoning"
        ? reasoningFilter
        : key === "tool"
          ? toolFilter
          : key === "structured"
            ? structuredFilter
            : openWeightsFilter;
    setQueryParam(key, active ? "" : "1");
  };

  const hasFilters = Boolean(
    query || providerFilter || reasoningFilter || toolFilter || structuredFilter || openWeightsFilter || sortRaw !== "latest",
  );

  const clearFilters = () => {
    for (const key of ["q", "provider", "sort", "reasoning", "tool", "structured", "open"]) {
      setQueryParam(key, "");
    }
  };

  const copyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
    } catch {
      /* 忽略 */
    }
    setCopied(id);
    setTimeout(() => setCopied((c) => (c === id ? null : c)), 1200);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground text-balance">
          {t("models.title")}
        </h1>
        <p className="mt-1.5 text-base text-muted-foreground">{t("models.desc")}</p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => updateQuery(e.target.value)}
          placeholder={t("nav.search")}
          aria-label={t("nav.search")}
          inputMode="search"
          type="search"
          className="h-11 w-full rounded-xl border border-border/60 bg-card pl-9 pr-9 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {query && (
          <button
            type="button"
            onClick={() => updateQuery("")}
            aria-label={t("models.clearSearch")}
            className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* 筛选与排序 */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 rounded-lg border border-border/60 bg-card px-2.5 py-2 text-sm shadow-sm">
          <span className="text-xs text-muted-foreground">{t("models.provider")}</span>
          <select
            value={providerFilter}
            onChange={(e) => setQueryParam("provider", e.target.value)}
            aria-label={t("models.provider")}
            className="bg-transparent text-foreground focus:outline-none"
          >
            <option value="">{t("models.allProviders")}</option>
            {providers.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 rounded-lg border border-border/60 bg-card px-2.5 py-2 text-sm shadow-sm">
          <span className="text-xs text-muted-foreground">{t("models.sortBy")}</span>
          <select
            value={sortRaw}
            onChange={(e) => setQueryParam("sort", e.target.value)}
            aria-label={t("models.sortBy")}
            className="bg-transparent text-foreground focus:outline-none"
          >
            <option value="latest">{t("models.sortLatest")}</option>
            <option value="name">{t("models.sortName")}</option>
            <option value="context">{t("models.sortContext")}</option>
            <option value="price">{t("models.sortPrice")}</option>
          </select>
        </label>

        <button
          type="button"
          onClick={() => toggleFilter("reasoning")}
          aria-pressed={reasoningFilter}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition-colors",
            reasoningFilter
              ? "bg-emerald-500/15 text-emerald-700 ring-emerald-500/30 dark:text-emerald-400"
              : "bg-card text-muted-foreground ring-border hover:bg-accent",
          )}
        >
          {t("models.reasoning")}
        </button>
        <button
          type="button"
          onClick={() => toggleFilter("tool")}
          aria-pressed={toolFilter}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition-colors",
            toolFilter
              ? "bg-emerald-500/15 text-emerald-700 ring-emerald-500/30 dark:text-emerald-400"
              : "bg-card text-muted-foreground ring-border hover:bg-accent",
          )}
        >
          {t("models.toolCall")}
        </button>
        <button
          type="button"
          onClick={() => toggleFilter("structured")}
          aria-pressed={structuredFilter}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition-colors",
            structuredFilter
              ? "bg-emerald-500/15 text-emerald-700 ring-emerald-500/30 dark:text-emerald-400"
              : "bg-card text-muted-foreground ring-border hover:bg-accent",
          )}
        >
          {t("models.structured")}
        </button>
        <button
          type="button"
          onClick={() => toggleFilter("open")}
          aria-pressed={openWeightsFilter}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition-colors",
            openWeightsFilter
              ? "bg-emerald-500/15 text-emerald-700 ring-emerald-500/30 dark:text-emerald-400"
              : "bg-card text-muted-foreground ring-border hover:bg-accent",
          )}
        >
          {t("models.weights")}
        </button>

        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {t("models.clearFilters")}
          </button>
        )}
      </div>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {t("models.results", { n: filtered.length })}
      </p>

      {filtered.length === 0 ? (
        <div
          role="status"
          className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border/60 bg-card p-10 text-center text-muted-foreground shadow-sm"
        >
          <SearchX className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm">{t("models.noResults", { q: query.trim() || "…" })}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
          <div className="hidden border-b border-border bg-card/80 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:grid md:grid-cols-[2fr_0.8fr_0.7fr_0.8fr_0.55fr_0.55fr_0.7fr_1.2fr] md:gap-2">
            <span>{t("models.title")}</span>
            <span>{t("models.provider")}</span>
            <span>{t("models.context")}</span>
            <span className="hidden xl:block">{t("models.output")}</span>
            <span className="hidden xl:block">{t("models.reasoning")}</span>
            <span className="hidden xl:block">{t("models.toolCall")}</span>
            <span className="hidden xl:block">{t("models.weights")}</span>
            <span className="text-right">{t("models.availableOn")}</span>
          </div>

          <ul className="divide-y divide-border">
            {filtered.map((m) => {
              const shown = m.available_on.slice(0, 3);
              const extra = m.available_on.length - shown.length;
              return (
                <li
                  key={m.id}
                  className="grid grid-cols-1 gap-1 px-3 py-3 transition-colors hover:bg-accent/40 md:grid-cols-[2fr_0.8fr_0.7fr_0.8fr_0.55fr_0.55fr_0.7fr_1.2fr] md:items-center md:gap-2"
                >
                  {/* 模型名 + ID + 复制 */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={localePath(locale, `/models/${m.id}`)}
                        className="truncate font-medium text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {m.name}
                      </Link>
                      <button
                        type="button"
                        onClick={() => copyId(m.id)}
                        title={t("models.copyId")}
                        aria-label={t("models.copyId")}
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {copied === m.id ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{m.id}</div>
                  </div>

                  {/* 移动端规格摘要 */}
                  <div className="flex flex-wrap items-center gap-1 md:hidden">
                    {m.context != null && (
                      <span className="rounded bg-secondary/70 px-1.5 py-0.5 text-xs text-muted-foreground">
                        {t("models.context")} {formatTokens(m.context)}
                      </span>
                    )}
                    {m.reasoning && (
                      <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-xs text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-400">
                        {t("models.reasoning")}
                      </span>
                    )}
                    {m.tool_call && (
                      <span className="rounded bg-secondary/70 px-1.5 py-0.5 text-xs text-muted-foreground">
                        {t("models.toolCall")}
                      </span>
                    )}
                    {m.open_weights && (
                      <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-xs text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-400">
                        {t("models.open")}
                      </span>
                    )}
                  </div>

                  {/* 厂商 */}
                  <div className="hidden text-sm capitalize text-muted-foreground md:block">
                    <Link
                      href={localePath(locale, `/labs/${m.provider}`)}
                      className="rounded-md px-1.5 py-0.5 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {m.provider}
                    </Link>
                  </div>

                  {/* 上下文 */}
                  <div className="hidden text-sm text-muted-foreground md:block">
                    {formatTokens(m.context)}
                  </div>

                  {/* 输出长度 */}
                  <div className="hidden text-sm text-muted-foreground xl:block">
                    {formatTokens(m.max_output)}
                  </div>

                  {/* 推理 */}
                  <div className="hidden xl:block">
                    <FeatureState value={m.reasoning} />
                  </div>

                  {/* 工具调用 */}
                  <div className="hidden xl:block">
                    <FeatureState value={m.tool_call} />
                  </div>

                  {/* 权重 */}
                  <div className="hidden xl:block">
                    {m.open_weights === undefined ? (
                      <span
                        aria-label={t("detail.unknown")}
                        title={t("detail.unknown")}
                        className="text-xs text-muted-foreground/70"
                      >
                        ?
                      </span>
                    ) : m.open_weights ? (
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-500/25 dark:text-emerald-400">
                        {t("models.open")}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/70">{t("models.closed")}</span>
                    )}
                  </div>

                  {/* 可免费使用的中转站 */}
                  <div className="flex flex-wrap justify-start gap-1 md:justify-end">
                    {m.available_on.length === 0 ? (
                      <span className="text-xs text-muted-foreground/70">{t("models.noChannels")}</span>
                    ) : (
                      <>
                        {shown.map((rid) => (
                          <Link
                            key={rid}
                            href={localePath(locale, `/relay/${rid}`)}
                            className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-500/20 transition-colors hover:bg-emerald-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-emerald-400"
                          >
                            {rid}
                          </Link>
                        ))}
                        {extra > 0 && (
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                            +{extra}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
