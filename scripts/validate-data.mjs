#!/usr/bin/env node
// 数据一致性校验：在提交前 / CI 中运行 `npm run validate:data`。
// 通过 TypeScript transpile 直接读取 src/data/*.ts 的真实导出，
// 而不是用正则猜测数据，避免“构建通过但数据引用悬空”的问题。

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(currentDir, "..");
const require = createRequire(import.meta.url);
const ts = require("typescript");

const errors = [];
const warnings = [];
let checked = 0;

function error(msg) {
  errors.push(msg);
}

function warn(msg) {
  warnings.push(msg);
}

function check(condition, msg) {
  checked += 1;
  if (!condition) error(msg);
}

function loadDataModule(file) {
  const abs = path.join(root, file);
  const source = fs.readFileSync(abs, "utf8");
  const { outputText } = ts.transpileModule(source, {
    fileName: file,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });

  const mod = { exports: {} };
  new Function("exports", "module", "require", "__filename", "__dirname", outputText)(
    mod.exports,
    mod,
    require,
    abs,
    path.dirname(abs),
  );
  return mod.exports;
}

function findDuplicates(items) {
  const seen = new Set();
  const duplicates = new Set();
  for (const item of items) {
    if (seen.has(item)) duplicates.add(item);
    seen.add(item);
  }
  return [...duplicates];
}

const { relays } = loadDataModule("src/data/relays.ts");
const { models } = loadDataModule("src/data/models.ts");

check(Array.isArray(relays) && relays.length > 0, "src/data/relays.ts 未导出非空 relays 数组");
check(Array.isArray(models), "src/data/models.ts 未导出 models 数组");

if (!Array.isArray(relays) || !Array.isArray(models)) {
  for (const message of errors) console.error(`✖ ${message}`);
  process.exit(1);
}

const relayIds = relays.map((r) => r.id);
const modelIds = models.map((m) => m.id);
const modelById = new Map(models.map((m) => [m.id, m]));
const modelProviders = new Set(models.map((m) => m.provider));

for (const id of findDuplicates(relayIds)) {
  error(`relay id 重复：${id}`);
}
for (const id of findDuplicates(modelIds)) {
  error(`model id 重复：${id}`);
}

const FREE_TYPES = new Set(["credit", "token", "daily_checkin", "free_models", "unlimited"]);

for (const relay of relays) {
  const tag = relay.id || relay.name || "(无 id 的中转站)";
  check(typeof relay.id === "string" && relay.id.trim().length > 0, `${tag}: 缺少 id`);
  check(typeof relay.name === "string" && relay.name.trim().length > 0, `${tag}: 缺少 name`);
  check(typeof relay.url === "string" && /^https?:\/\//.test(relay.url), `${tag}: url 必须是以 http(s):// 开头的字符串`);
  check(typeof relay.api === "string" && relay.api.trim().length > 0, `${tag}: 缺少 api base`);
  check(typeof relay.openai_compatible === "boolean", `${tag}: openai_compatible 必须是布尔值`);

  // 本站收录标准：只有提供免费档的服务才能入库
  check(relay.free_quota?.available === true, `${tag}: free_quota.available 必须为 true（本站只收录有免费额度的中转站）`);
  check(
    !relay.free_quota?.type || FREE_TYPES.has(relay.free_quota.type),
    `${tag}: free_quota.type "${relay.free_quota?.type}" 不在 FreeQuotaType 内`,
  );
  if (Array.isArray(relay.free_quota?.parts)) {
    const partTypes = relay.free_quota.parts.map((part) => part.type);
    const partDupes = findDuplicates(partTypes);
    check(partDupes.length === 0, `${tag}: free_quota.parts 中存在重复额度类型：${partDupes.join(", ")}`);
    for (const part of relay.free_quota.parts) {
      check(FREE_TYPES.has(part.type), `${tag}: free_quota.parts 的额度类型 "${part.type}" 不合法`);
      check(typeof part.amount === "string" && part.amount.trim().length > 0, `${tag}: free_quota.parts（${part.type}）缺少 amount`);
      if (part.amount_usd != null) {
        check(Number.isFinite(part.amount_usd) && part.amount_usd >= 0, `${tag}: free_quota.parts（${part.type}）的 amount_usd 不是非负数字`);
      }
    }
  }

  // model_count 由构建期自动计算，源数据中应保持 0，禁止手填
  check(relay.model_count === 0, `${tag}: model_count 由 src/lib/data.ts 自动计算，请保持 0`);

  // providers 必须能在模型目录中找到对应规格，否则 /labs/{provider} 会 404
  check(Array.isArray(relay.providers), `${tag}: providers 必须是数组`);
  if (Array.isArray(relay.providers)) {
    const providerDupes = findDuplicates(relay.providers);
    check(providerDupes.length === 0, `${tag}: providers 存在重复项：${providerDupes.join(", ")}`);
    for (const provider of relay.providers) {
      check(
        modelProviders.has(provider),
        `${tag}: providers 中的 "${provider}" 没有对应 models.ts 模型规格（/labs/${provider} 会 404）。请先补模型规格，否则移除该值。`,
      );
    }
    // 已列模型的 relay，providers 应与模型目录中的厂商一一对应，
    // 否则列表筛选、厂商区展示与模型页会出现互相矛盾的信息。
    const listedProviders = new Set();
    for (const modelId of Object.keys(relay.models)) {
      const model = modelById.get(modelId);
      if (model) listedProviders.add(model.provider);
    }
    if (listedProviders.size > 0) {
      const declared = new Set(relay.providers);
      for (const provider of listedProviders) {
        check(
          declared.has(provider),
          `${tag}: 提供了 ${provider} 的模型，但 providers 缺少 "${provider}"`,
        );
      }
      for (const provider of declared) {
        check(
          listedProviders.has(provider),
          `${tag}: providers 声明了 "${provider}"，但 relay.models 中没有对应模型，请补模型或移除声明`,
        );
      }
    }
  }

  check(relay.models && typeof relay.models === "object", `${tag}: models 必须是对象`);
  if (relay.models && typeof relay.models === "object") {
    for (const [key, ref] of Object.entries(relay.models)) {
      check(modelById.has(key), `${tag}: 模型引用 "${key}" 未收录于 models.ts`);
      check(ref?.id === key, `${tag}: models 的键 "${key}" 与引用 id "${ref?.id}" 不一致`);
      check(typeof ref?.name === "string" && ref.name.trim().length > 0, `${tag}: 模型引用 "${key}" 缺少 name`);
    }
  }

  // 免费额度若声明了覆盖模型，最好指向模型目录中的真实模型；
  // 但中转站私有模型（如 anyrouter/free）可以不在全局目录中，只给出警告。
  if (Array.isArray(relay.free_quota?.models)) {
    for (const modelId of relay.free_quota.models) {
      if (!modelById.has(modelId)) {
        warn(`${tag}: free_quota.models 中的 "${modelId}" 未收录于 models.ts（若是中转站私有模型可忽略）`);
      }
    }
  }

  // logo 必须为本地资源；空字符串表示使用默认 monogram
  if (relay.logo) {
    check(!/^https?:\/\//.test(relay.logo), `${tag}: logo 必须是本地路径，禁止外链`);
    const logoFile = path.join(root, "public", relay.logo.replace(/^\/+/, ""));
    check(fs.existsSync(logoFile), `${tag}: logo 文件不存在：${relay.logo}`);
  }
}

// 模型目录的定位是“被中转站提供的规格”：没有 relay 引用的条目会
// 出现在模型库但与免费渠道脱节，提示维护者补关联或移出。
const relayLinkedModels = new Set();
for (const relay of relays) {
  for (const modelId of Object.keys(relay.models ?? {})) relayLinkedModels.add(modelId);
}
for (const model of models) {
  if (!relayLinkedModels.has(model.id)) {
    warn(`${model.id}: 未出现在任何中转站的 models 中（若计划收录请补关联，否则可移出目录）`);
  }
}

for (const model of models) {
  const parts = typeof model.id === "string" ? model.id.split("/") : [];
  check(parts.length >= 2, `${model.id || "(无 id 的模型)"}: model id 必须形如 "provider/model"`);
  check(model.provider === parts[0], `${model.id}: provider 字段 "${model.provider}" 与 id 前缀 "${parts[0]}" 不一致`);
  check(Array.isArray(model.available_on), `${model.id}: available_on 缺失或不是数组`);
  if (Array.isArray(model.available_on)) {
    check(
      model.available_on.length === 0,
      `${model.id}: available_on 由构建期 src/lib/data.ts 自动计算，源数据中请保持空数组`,
    );
  }
  if (model.release_date != null) {
    check(/^\d{4}-\d{2}(-\d{2})?$/.test(model.release_date), `${model.id}: release_date 应形如 "YYYY-MM" 或 "YYYY-MM-DD"`);
  }
  if (model.context != null) {
    check(Number.isFinite(model.context) && model.context > 0, `${model.id}: context 必须是正数`);
  }
  if (model.max_output != null) {
    check(Number.isFinite(model.max_output) && model.max_output > 0, `${model.id}: max_output 必须是正数`);
  }
}

console.log(
  `\n数据校验完成：${relays.length} 家中转站 / ${models.length} 个模型，共 ${checked} 项检查，${errors.length} 个错误，${warnings.length} 个警告。`,
);

if (errors.length > 0) {
  for (const message of errors) console.error(`✖ ${message}`);
  process.exit(1);
}

for (const message of warnings) console.warn(`⚠ ${message}`);
console.log("✓ 全部通过");
