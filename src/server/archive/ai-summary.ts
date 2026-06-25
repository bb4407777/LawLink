"use server";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { aiChat, extractJson } from "@/lib/ai/client";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

export type AiArchiveResult = {
  closedReason: string;
  judgmentSummary: string;
  summary: string;
};

const CLOSED_REASON_MAP: Record<string, string> = {
  "判决": "JUDGMENT",
  "调解": "MEDIATION",
  "和解": "SETTLEMENT",
  "撤诉": "WITHDRAWAL",
  "裁定": "RULING",
  "仲裁裁决": "ARBITRATION",
  "其他": "OTHER"
};

/**
 * 对 PDF 文件执行本地 OCR，返回文本。
 */
function ocrPdf(storagePath: string): string {
  try {
    const buf = fs.readFileSync(path.resolve(process.cwd(), "storage", storagePath));
    const tmp = path.join(os.tmpdir(), `ocr-${Date.now()}.pdf`);
    fs.writeFileSync(tmp, buf);
    const result = execSync(`/Users/gao/.local/bin/ocr-vision "${tmp}" -q 2>/dev/null`, {
      encoding: "utf-8",
      timeout: 60000
    });
    fs.unlinkSync(tmp);
    return result.trim().slice(0, 3000);
  } catch {
    return "";
  }
}

/**
 * 根据案件数据，用 AI 一键生成归档信息（结案方式、裁判结果摘要、结案小结）。
 */
export async function generateAiArchive(matterId: string): Promise<AiArchiveResult> {
  await requireSession();

  const matter = await prisma.matter.findUnique({
    where: { id: matterId, deletedAt: null },
    select: {
      internalCode: true, title: true, category: true, claimAmount: true,
      parties: { select: { name: true, role: true, standing: true } },
      procedures: {
        where: { engagement: "ENGAGED" },
        orderBy: { order: "asc" },
        select: { type: true, caseNumber: true, handlingAgency: true, outcome: true }
      },
      feeEntries: {
        orderBy: { occurredAt: "desc" },
        take: 10,
        select: { type: true, amount: true, occurredAt: true }
      }
    }
  });
  if (!matter) throw new Error("案件不存在");

  const notes = await prisma.note.findMany({
    where: { matterId, deletedAt: null },
    orderBy: { occurredAt: "desc" },
    take: 30,
    select: { channel: true, content: true, occurredAt: true }
  });
  const hearings = await prisma.hearing.findMany({
    where: { procedure: { matterId } },
    orderBy: { startsAt: "desc" },
    take: 10,
    select: { title: true, startsAt: true, address: true }
  });
  const billings = await prisma.billing.findMany({
    where: { matterId },
    select: { contractAmount: true, status: true }
  });
  const docs = await prisma.document.findMany({
    where: { matterId, deletedAt: null, category: { in: ["JUDGMENT", "PLEADING", "PROCEDURE"] } },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { name: true, category: true, path: true }
  });
  // OCR 提取判决书内容
  const ocrTexts: string[] = [];
  for (const d of docs) {
    if (d.category === "JUDGMENT" || d.category === "PLEADING") {
      const text = ocrPdf(d.path);
      if (text) ocrTexts.push(`--- ${d.name} ---\n${text.slice(0, 2000)}`);
    }
  }

  // 构建 prompt
  const info = [
    `案号：${matter.internalCode}`,
    `标题：${matter.title}`,
    `类别：${matter.category}`,
    `标的额：${matter.claimAmount ? "¥" + Number(matter.claimAmount).toLocaleString() : "未填写"}`,
    matter.procedures.length ? `程序：${matter.procedures.map(p => `${p.type}(${p.handlingAgency || ""} ${p.caseNumber || ""})`).join(" → ")}` : "",
    matter.parties.length ? `当事人：${matter.parties.map(p => `${p.name}(${p.standing || p.role})`).join("、")}` : "",
    billings.length ? `合同额：${billings.map(b => "¥" + Number(b.contractAmount).toLocaleString()).join(" + ")}` : "",
    hearings.length ? `\n开庭记录：\n${hearings.map(h => `- ${h.startsAt.toISOString().slice(0, 10)} ${h.title} @ ${h.address || ""}`).join("\n")}` : "",
    docs.length ? `\n案件材料：\n${docs.map(d => `- [${d.category}] ${d.name}`).join("\n")}` : "",
    ocrTexts.length ? `\n判决书/起诉书 OCR 内容：\n${ocrTexts.join("\n\n")}` : "",
  ].filter(Boolean).join("\n");

  const notesPreview = notes.map(n => `[${n.occurredAt.toISOString().slice(0, 10)}] ${n.content.slice(0, 200)}`).join("\n");

  const prompt = `你是一位资深律师助手。根据以下案件信息，生成 JSON 格式的归档数据。

案件信息：
${info}

办案记录摘要：
${notesPreview || "（无）"}

请输出 JSON（不要 markdown，纯 JSON）：
{
  "closedReason": "结案方式，只能取以下之一：判决、调解、和解、撤诉、裁定、仲裁裁决、其他",
  "judgmentSummary": "裁判结果摘要，一句话概括判决/调解/裁定结果，如「一审判决支持原告诉请，判令被告支付 XXX 元」",
  "summary": "结案小结，300-500 字，包含：案由当事人、办理过程、案件结果、经验反思"
}`;

  const result = await aiChat({
    messages: [{ role: "user", content: prompt }],
    maxTokens: 3000,
    temperature: 0.3
  });

  const parsed = extractJson(result.content) as Record<string, string> | null;
  const closedReason = parsed?.closedReason ? (CLOSED_REASON_MAP[parsed.closedReason] || "OTHER") : "OTHER";
  const judgmentSummary = parsed?.judgmentSummary || "";
  const summary = parsed?.summary || result.content.trim();

  return { closedReason, judgmentSummary, summary };
}
