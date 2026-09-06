// 英文页显示文案：relay 免费额度/说明与 model 描述的中文源数据
// 保持为可读的自然语言，这里提供按 id 的英文覆盖，仅在 /en 渲染时使用。
import type { FreeQuotaType, Model, Relay } from "@/lib/types";
import type { Locale } from "@/lib/i18n";

type QuotaPartEn = {
  amount?: string;
  notes?: string;
};

type RelayEn = {
  quota?: {
    amount?: string;
    notes?: string;
    parts?: Partial<Record<FreeQuotaType, QuotaPartEn>>;
  };
  pricingNotes?: string;
};

const RELAY_EN: Record<string, RelayEn> = {
  agentrouter: {
    quota: {
      amount: "Signup credit: $50 / daily check-in: $25",
      notes: "Registration via LinuxDo or GitHub only. Daily check-in requires sign-out and sign-in again.",
      parts: {
        credit: { amount: "$50 signup credit" },
        daily_checkin: {
          amount: "$25 daily check-in",
          notes: "Daily check-in requires sign-out and sign-in again.",
        },
      },
    },
    pricingNotes: "Billed at official retail prices.",
  },
  anyrouter: {
    quota: {
      amount: "Signup credit: $50 / daily check-in: $25",
      notes: "Registration via LinuxDo or an education email is supported.",
      parts: {
        credit: { amount: "$50 signup credit" },
        daily_checkin: { amount: "$25 daily check-in" },
      },
    },
    pricingNotes: "Original upstream pricing with no markup.",
  },
  modelscope: {
    quota: {
      amount: "200 credits on registration and daily login",
      notes: "Complete community tasks to earn more credits.",
    },
  },
  traework: {
    quota: {
      amount: "Invite-registration credit (exact amount to verify)",
      notes: "AI coding workbench; register through the invite link. Free quota per the official site.",
    },
  },
  workbuddy: {
    quota: {
      amount: "Invite-registration credit (exact amount to verify)",
      notes: "AI assistant; register with the invite code. Free quota per the official site.",
    },
  },
  siliconflow: {
    quota: {
      amount: "14 RMB credit for new users (~20M tokens)",
      notes: "In partnership with Huawei Cloud, powered by Ascend inference.",
    },
    pricingNotes: "Billed at provider prices.",
  },
  ppio: {
    quota: {
      amount: "2 RMB after real-name verification / 15 RMB for new users",
      notes: "2 RMB is granted after real-name verification and 15 RMB on registration.",
    },
  },
  aiionly: {
    quota: {
      amount: "15 RMB credit via invite registration",
      notes: "Stable service aggregating popular domestic and global models.",
    },
  },
  "xiaomi-mimo": {
    quota: {
      amount: "Unlimited free calls during public beta",
      notes: "Based on Xiaomi MiMo open models, suited for AI coding.",
    },
  },
  "nvidia-mim": {
    quota: {
      amount: "Unlimited free calls for development/research (selected models)",
      notes: "Offers inference APIs for top open models such as GLM-4.7 and MiniMax 2.1.",
    },
  },
  groq: {
    quota: {
      amount: "Free tier with unlimited calls on several open models",
      notes: "The free tier covers selected open models (e.g. Llama 3.1 8B); paid models are metered.",
    },
    pricingNotes: "Usage outside the free tier is billed per token.",
  },
  "cloudflare-ai": {
    quota: {
      amount: "Daily free inference quota (~10,000 requests/day)",
      notes: "Workers AI provides ~10,000 inferences per day on the free tier. The OpenAI-compatible endpoint requires account_id.",
    },
  },
  opencode: {
    quota: {
      amount: "Free quota (exact amount to verify)",
      notes: "Open-source AI coding tool; free quota per the official site.",
    },
  },
};

const MODEL_DESCRIPTION_EN: Record<string, string> = {
  "openai/gpt-4o": "OpenAI multimodal flagship with unified text, image and audio reasoning.",
  "openai/gpt-4o-mini": "Cost-efficient small model for high-volume, frequent calls.",
  "openai/gpt-4.1": "Optimized for agents and long-context tasks.",
  "anthropic/claude-sonnet-4": "Balanced intelligence and speed; a workhorse for coding and agents.",
  "anthropic/claude-opus-4": "Anthropic's strongest model for reasoning and complex tasks.",
  "anthropic/claude-3.5-haiku": "Low-cost, fast model for lightweight tasks.",
  "google/gemini-2.5-flash": "Fast, low-cost multimodal model with long-context support.",
  "google/gemini-2.5-pro": "Google's flagship multimodal reasoning model.",
  "deepseek/deepseek-chat": "Open MoE model with strong Chinese and coding abilities.",
  "deepseek/deepseek-reasoner": "Open reasoning model strong at math and code.",
  "qwen/qwen-max": "Qwen flagship model with leading Chinese language ability.",
  "qwen/qwen-plus": "Balanced value-for-money Tongyi Qianwen model.",
  "qwen/qwen2.5-72b-instruct": "Open 72B-parameter instruction model.",
  "zhipu/glm-4-plus": "Zhipu GLM flagship model.",
  "zhipu/glm-4-flash": "Free and fast GLM model.",
  "moonshot/kimi-k2": "Moonshot's open MoE model with strong agent capabilities.",
  "xai/grok-2": "xAI multimodal model with real-time information support.",
  "meta/llama-3.1-70b": "Meta's open 70B-parameter multilingual model.",
  "meta/llama-3.1-8b": "Lightweight open model for edge and high-frequency scenarios.",
  "mistral/mistral-large": "Mistral's flagship closed-source model.",
  "minimax/abab6.5": "MiniMax general-purpose large model.",
};

export interface LocalizedQuotaTexts {
  amount?: string;
  notes?: string;
  parts: { type: FreeQuotaType; amount?: string; notes?: string }[];
  pricingNotes?: string;
}

export function localizedQuotaTexts(
  relay: Pick<Relay, "id" | "free_quota"> & { pricing?: Relay["pricing"] },
  locale: Locale,
): LocalizedQuotaTexts {
  const en = RELAY_EN[relay.id]?.quota;
  const pricingNotes = locale === "en" ? RELAY_EN[relay.id]?.pricingNotes : undefined;
  const fq = relay.free_quota;
  return {
    amount: locale === "en" && en?.amount ? en.amount : fq.amount,
    notes: locale === "en" && en?.notes ? en.notes : fq.notes,
    parts:
      fq.parts?.map((part) => {
        const enPart = en?.parts?.[part.type];
        return {
          type: part.type,
          amount: locale === "en" && enPart?.amount ? enPart.amount : part.amount,
          notes: locale === "en" && enPart?.notes ? enPart.notes : part.notes,
        };
      }) ?? [],
    pricingNotes:
      locale === "en" && pricingNotes ? pricingNotes : relay.pricing?.notes,
  };
}

export function localizedModelDescription(model: Model, locale: Locale): string | undefined {
  if (locale === "en") return MODEL_DESCRIPTION_EN[model.id] ?? model.description;
  return model.description;
}
