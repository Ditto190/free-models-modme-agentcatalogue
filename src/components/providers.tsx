"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { type Locale, type DictKey, translate } from "@/lib/i18n";
import { localePath, stripLocalePath } from "@/lib/locale";

type Theme = "dark" | "light";

interface AppCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  toggleLocale: () => void;
  t: (key: DictKey, vars?: Record<string, string | number>) => string;
  theme: Theme;
  toggleTheme: () => void;
}

const Ctx = createContext<AppCtx | null>(null);

function readStorage<T extends string>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    return (localStorage.getItem(key) as T) || fallback;
  } catch {
    return fallback;
  }
}

export function AppProvider({
  initialLocale = "zh",
  children,
}: {
  initialLocale?: Locale;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  // 语言由路由决定（/zh、/en），不走 localStorage，保证服务端渲染与 SEO 一致
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [theme, setThemeState] = useState<Theme>(() =>
    readStorage("theme", "dark" as Theme),
  );

  // 与 <html> 同步（layout 的防闪烁脚本已处理首帧，这里跟随后续切换）
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.classList.toggle("dark", theme === "dark");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", theme === "dark" ? "#09090b" : "#ffffff");
    }
  }, [locale, theme]);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem("locale", l);
      document.cookie = `locale=${l};max-age=31536000;path=/;samesite=lax`;
    } catch {
      /* 忽略 */
    }
    if (/^\/(zh|en)(?=\/|$)/.test(pathname)) {
      const search = typeof window === "undefined" ? "" : window.location.search;
      router.replace(`${localePath(l, stripLocalePath(pathname))}${search}`);
    }
  };
  const toggleLocale = () => setLocale(locale === "zh" ? "en" : "zh");
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setThemeState(next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* 忽略 */
    }
  };

  const t = (key: DictKey, vars?: Record<string, string | number>) =>
    translate(locale, key, vars);

  return (
    <Ctx.Provider value={{ locale, setLocale, toggleLocale, t, theme, toggleTheme }}>
      {children}
    </Ctx.Provider>
  );
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
