"use client";

import Link from "next/link";
import { SearchX } from "lucide-react";
import { useApp } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { localePath } from "@/lib/locale";

export function NotFoundContent() {
  const { t, locale } = useApp();
  return (
    <main className="mx-auto flex max-w-4xl flex-col items-center justify-center gap-3 px-4 py-24 text-center">
      <SearchX className="h-12 w-12 text-muted-foreground/50" aria-hidden="true" />
      <h1 className="text-3xl font-bold tracking-tight text-foreground">{t("notFound.title")}</h1>
      <p className="text-sm text-muted-foreground">{t("notFound.body")}</p>
      <Button asChild className="mt-2">
        <Link href={localePath(locale, "/")}>{t("notFound.backHome")}</Link>
      </Button>
    </main>
  );
}
