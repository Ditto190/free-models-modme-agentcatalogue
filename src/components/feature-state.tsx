"use client";

import { CheckCircle2, Minus } from "lucide-react";
import { useApp } from "@/components/providers";

/** 模型能力三态：true=支持，false=不支持，undefined=未知 */
export function FeatureState({ value }: { value?: boolean }) {
  const { t } = useApp();
  if (value === undefined) {
    return (
      <span
        aria-label={t("detail.unknown")}
        title={t("detail.unknown")}
        className="inline-flex h-4 w-4 items-center justify-center text-xs text-muted-foreground/70"
      >
        ?
      </span>
    );
  }
  if (value) {
    return (
      <CheckCircle2
        aria-label={t("detail.yes")}
        className="h-4 w-4 text-emerald-600 dark:text-emerald-500"
      />
    );
  }
  return <Minus aria-label={t("detail.no")} className="h-4 w-4 text-muted-foreground/40" />;
}
