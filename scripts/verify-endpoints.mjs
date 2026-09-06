#!/usr/bin/env node
// 构建产物校验：读取 .next 中静态生成的 JSON / llms 端点，
// 验证序列化后的形状与交叉引用（models.dev 兼容字段、available_on、llms 内容）。
// 在 `npm run build` 之后运行；CI 已串联执行。

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(currentDir, "..");
const bodyDir = path.join(root, ".next", "server", "app");
const errors = [];

function error(message) {
  errors.push(message);
}

function readJson(name) {
  const file = path.join(bodyDir, `${name}.body`);
  if (!fs.existsSync(file)) {
    throw new Error(`找不到静态端点产物 ${file}，请先运行 npm run build`);
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

let api;
let models;
let catalog;
let llms;
let llmsFull;

try {
  api = readJson("api.json");
  models = readJson("models.json");
  catalog = readJson("catalog.json");
  llms = fs.readFileSync(path.join(bodyDir, "llms.txt.body"), "utf8");
  llmsFull = fs.readFileSync(path.join(bodyDir, "llms-full.txt.body"), "utf8");
} catch (cause) {
  console.error(`✖ ${cause.message}`);
  process.exit(1);
}

// ---- 基本结构 ----
const relayEntries = Object.entries(api);
const modelEntries = Object.entries(models);

if (relayEntries.length === 0) error("api.json 没有任何中转站");
if (modelEntries.length === 0) error("models.json 没有任何模型");

// ---- api.json：relay 与内嵌 models 的一致性 ----
for (const [relayId, relay] of relayEntries) {
  if (relay.id !== relayId) error(`api.json: 顶层键 "${relayId}" 与 relay.id "${relay.id}" 不一致`);
  if (typeof relay.models !== "object" || relay.models === null) {
    error(`api.json: ${relayId} 缺少 models 对象`);
    continue;
  }

  const nested = Object.entries(relay.models);
  if (relay.model_count !== nested.length) {
    error(`api.json: ${relayId} 的 model_count 为 ${relay.model_count}，实际模型数为 ${nested.length}`);
  }

  for (const [modelId, serialized] of nested) {
    const global = models[modelId];
    if (!global) {
      error(`api.json: ${relayId} 内嵌模型 "${modelId}" 在 models.json 中不存在`);
      continue;
    }
    if (serialized.id !== modelId) {
      error(`api.json: ${relayId} 的模型键 "${modelId}" 与内嵌 id "${serialized.id}" 不一致`);
    }
    if (!global.available_on.includes(relayId)) {
      error(`api.json: ${relayId} 提供 "${modelId}"，但 models.json 的 available_on 未包含 ${relayId}`);
    }
    if (serialized.available_on.length !== global.available_on.length) {
      error(`api.json: ${relayId} 内嵌 "${modelId}" 的 available_on 与 models.json 不一致`);
    }
  }
}

// ---- models.json：available_on 反向引用与 models.dev 兼容字段 ----
for (const [modelId, model] of modelEntries) {
  if (model.id !== modelId) error(`models.json: 顶层键 "${modelId}" 与 model.id "${model.id}" 不一致`);
  if (!Array.isArray(model.available_on)) {
    error(`models.json: ${modelId} 缺少 available_on 数组`);
    continue;
  }
  for (const relayId of model.available_on) {
    const relay = api[relayId];
    if (!relay || !relay.models?.[modelId]) {
      error(`models.json: ${modelId} 声称 ${relayId} 提供，但 api.json 中没有对应条目`);
    }
  }
  if (Array.isArray(model.free_on)) {
    for (const relayId of model.free_on) {
      if (!model.available_on.includes(relayId)) {
        error(`models.json: ${modelId} 的 free_on 包含 ${relayId}，但 available_on 未包含该中转站`);
      }
      const relay = api[relayId];
      if (!relay || !relay.models?.[modelId]) {
        error(`models.json: ${modelId} 声称 ${relayId} 免费可用，但 api.json 中没有对应条目`);
      }
    }
  }

  // limit / cost 是 models.dev 兼容命名，必须与本站字段同步
  if (model.limit) {
    if (model.context != null && model.limit.context !== model.context) {
      error(`models.json: ${modelId} 的 limit.context 与 context 不一致`);
    }
    if (model.max_output != null && model.limit.output !== model.max_output) {
      error(`models.json: ${modelId} 的 limit.output 与 max_output 不一致`);
    }
  }
  if (model.cost) {
    if (model.price?.input != null && model.cost.input !== model.price.input) {
      error(`models.json: ${modelId} 的 cost.input 与 price.input 不一致`);
    }
    if (model.price?.output != null && model.cost.output !== model.price.output) {
      error(`models.json: ${modelId} 的 cost.output 与 price.output 不一致`);
    }
  }
}

// ---- catalog.json：应等于 api.json + models.json ----
if (!isDeepStrictEqual(catalog.api, api)) {
  error("catalog.json 的 api 与 api.json 不一致");
}
if (!isDeepStrictEqual(catalog.models, models)) {
  error("catalog.json 的 models 与 models.json 不一致");
}

// ---- llms.txt / llms-full.txt：应包含全部实体与当前数量 ----
if (!llms.includes(`## 模型（${modelEntries.length}）`)) {
  error(`llms.txt 缺少模型数量标题（${modelEntries.length}）`);
}
if (!llms.includes(`## 中转站（${relayEntries.length}）`)) {
  error(`llms.txt 缺少中转站数量标题（${relayEntries.length}）`);
}
for (const [relayId, relay] of relayEntries) {
  if (!llms.includes(`/relay/${relayId}`)) {
    error(`llms.txt 缺少中转站 ${relayId} 的链接`);
  }
  if (!llmsFull.includes(`### ${relay.name}（${relayId}）`)) {
    error(`llms-full.txt 缺少中转站小节 ${relayId}`);
  }
}
for (const [modelId] of modelEntries) {
  if (!llmsFull.includes(`### ${modelId}`)) {
    error(`llms-full.txt 缺少模型小节 ${modelId}`);
  }
}

console.log(
  `\n端点产物校验完成：${relayEntries.length} 家中转站 / ${modelEntries.length} 个模型，llms 文本已核对，${errors.length} 个错误。`,
);

if (errors.length > 0) {
  for (const message of errors) console.error(`✖ ${message}`);
  process.exit(1);
}

console.log("✓ 全部通过");
