import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { AppProvider } from "@/components/providers";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { JsonLd } from "@/components/json-ld";
import { getCatalog } from "@/lib/data";
import { datasetLd } from "@/lib/jsonld";
import { SITE_URL } from "@/lib/site";
import { isLocale, LOCALES, localePath } from "@/lib/locale";
import type { Locale } from "@/lib/i18n";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_META: Record<
  Locale,
  { title: string; description: string; keywords: string[] }
> = {
  zh: {
    title: "中转站免费额度库 · Relay Free-Quota DB",
    description:
      "只收录提供免费额度的 LLM 中转站 / 聚合网关。OpenAI 兼容、免费额度明细、模型规格，数据以 JSON 开放可被 curl 取用，支持 LLM 与 AI 工具读取。",
    keywords: [
      "LLM",
      "中转站",
      "API",
      "免费额度",
      "OpenAI 兼容",
      "聚合网关",
      "大模型",
      "models.dev",
      "llms.txt",
    ],
  },
  en: {
    title: "Relay Free-Quota DB · LLM Free Tier Directory",
    description:
      "A directory of LLM relays and gateways that offer a free tier: free quota, OpenAI-compatible APIs, model specs, machine-readable JSON and llms.txt.",
    keywords: [
      "LLM",
      "relay",
      "API gateway",
      "free tier",
      "free quota",
      "OpenAI compatible",
      "models.dev",
      "llms.txt",
    ],
  },
};

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : "zh";
  const meta = SITE_META[locale];
  return {
    metadataBase: new URL(SITE_URL),
    title: meta.title,
    description: meta.description,
    applicationName: "Relay Free-Quota DB",
    keywords: meta.keywords,
    authors: [{ name: "Relay Free-Quota DB" }],
    creator: "Relay Free-Quota DB",
    alternates: {
      canonical: `${SITE_URL}/${locale}`,
      languages: {
        zh: `${SITE_URL}/zh`,
        en: `${SITE_URL}/en`,
      },
    },
    openGraph: {
      type: "website",
      locale: locale === "zh" ? "zh_CN" : "en_US",
      siteName: meta.title,
      title: meta.title,
      description: meta.description,
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
    },
    robots: { index: true, follow: true },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) return null;

  return (
    <html
      lang={lang}
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <meta name="theme-color" content="#09090b" />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('theme')||'dark';document.documentElement.classList.toggle('dark',t==='dark');}catch(e){}",
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <JsonLd data={datasetLd(getCatalog(), `${SITE_URL}${localePath(lang, "/")}`)} />
        <AppProvider initialLocale={lang}>
          <Header />
          <div className="flex-1">{children}</div>
          <Footer />
        </AppProvider>
      </body>
    </html>
  );
}
