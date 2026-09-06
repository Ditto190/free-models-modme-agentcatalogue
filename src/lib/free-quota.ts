import type { Relay } from "@/lib/types";

/**
 * 判断某模型是否属于该中转站的免费额度覆盖范围。
 * - credit / token / daily_checkin：额度可用于 relay.models 中列出的模型；
 * - free_models / unlimited：如提供 free_quota.models 则以该清单为准，
 *   否则默认覆盖全部已列模型（数据维护者应尽量给部分免费的服务补 models 清单）。
 */
export function relayModelIsFree(
  relay: Pick<Relay, "free_quota" | "models">,
  modelId: string,
): boolean {
  const fq = relay.free_quota;
  if (!fq.available) return false;
  if (!relay.models[modelId]) return false;

  if (fq.type === "free_models" || fq.type === "unlimited") {
    if (fq.models && fq.models.length > 0) return fq.models.includes(modelId);
    return true;
  }

  return true;
}
