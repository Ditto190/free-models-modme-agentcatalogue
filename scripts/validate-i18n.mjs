#!/usr/bin/env node
// i18n 校验：中英字典必须同 key；未使用 key 与动态前缀不一致会提示。
// 运行 `npm run validate:i18n`（CI 中位于 validate:data 之后）。

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(currentDir, "..");
const require = createRequire(import.meta.url);
const ts = require("typescript");

function loadI18n() {
  const abs = path.join(root, "src/lib/i18n.ts");
  const source = fs.readFileSync(abs, "utf8");
  const { outputText } = ts.transpileModule(source, {
    fileName: abs,
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
  return mod.exports.dictionaries;
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry.name) && !full.endsWith("i18n.ts")) out.push(full);
  }
  return out;
}

const { zh, en } = loadI18n();
const zhKeys = Object.keys(zh);
const enKeys = Object.keys(en);
const errors = [];
const warnings = [];

for (const key of zhKeys) if (!enKeys.includes(key)) errors.push(`zh 存在但 en 缺少：${key}`);
for (const key of enKeys) if (!zhKeys.includes(key)) errors.push(`en 存在但 zh 缺少：${key}`);

const source = walk(path.join(root, "src"))
  .map((file) => fs.readFileSync(file, "utf8"))
  .join("\n");
const used = new Set();

for (const match of source.matchAll(/t\(\s*"([^"]+)"/g)) used.add(match[1]);
for (const match of source.matchAll(/t\(\s*`([^`]+)`/g)) {
  const template = match[1];
  const prefix = template.slice(0, template.indexOf("${") === -1 ? template.length : template.indexOf("${"));
  if (prefix.includes(".") && template.includes("${")) {
    for (const key of zhKeys) if (key.startsWith(prefix)) used.add(key);
  } else if (!template.includes("${")) {
    used.add(template);
  }
}

// 常量中直接书写的 key（如 LanguageSelect 的 labelKey）按字面量统计
for (const key of zhKeys) {
  if (source.includes(`"${key}"`)) used.add(key);
}

for (const key of zhKeys) {
  if (!used.has(key)) warnings.push(`未使用：${key}`);
}

console.log(
  `\ni18n 校验完成：zh ${zhKeys.length} / en ${enKeys.length} 个 key，${errors.length} 个错误，${warnings.length} 个未使用提示。`,
);
if (errors.length > 0) {
  for (const message of errors) console.error(`✖ ${message}`);
  process.exit(1);
}
for (const message of warnings) console.warn(`⚠ ${message}`);
console.log("✓ zh/en key 对齐");
