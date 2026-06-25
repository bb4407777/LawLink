import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma";
import { audit } from "@/server/audit";
import { storage } from "@/lib/storage";
import { decryptBuffer } from "@/lib/storage/crypto";
import { officePreviewKind } from "@/lib/storage/mime-ext";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const doc = await prisma.document.findFirst({
    where: { id, deletedAt: null }
  });
  if (!doc) return NextResponse.json({ error: "材料不存在" }, { status: 404 });

  // 权限
  if (session.user.role !== "ADMIN" && session.user.role !== "PRINCIPAL_LAWYER") {
    if (doc.matterId) {
      const member = await prisma.matterMember.findUnique({
        where: { matterId_userId: { matterId: doc.matterId, userId: session.user.id } }
      });
      if (!member) return NextResponse.json({ error: "无权访问" }, { status: 403 });
    } else if (doc.intakeId) {
      const intake = await prisma.intake.findUnique({
        where: { id: doc.intakeId },
        select: { createdById: true, ownerUserId: true, coUserIds: true }
      });
      const uid = session.user.id;
      const allowed =
        !!intake &&
        (intake.createdById === uid ||
          intake.ownerUserId === uid ||
          intake.coUserIds.includes(uid));
      if (!allowed) return NextResponse.json({ error: "无权访问" }, { status: 403 });
    }
  }

  const kind = officePreviewKind(doc.mimeType, doc.name);
  if (!kind) {
    return NextResponse.json(
      { error: "该类型不支持在线预览，请下载查看" },
      { status: 415 }
    );
  }

  // 读取并解密文件
  let buf: Buffer;
  try {
    const stored = await storage.readFile(doc.path);
    if (doc.encrypted) {
      if (!doc.iv || !doc.authTag) {
        return NextResponse.json({ error: "加密元数据损坏" }, { status: 500 });
      }
      buf = decryptBuffer(stored, doc.iv, doc.authTag);
    } else {
      buf = stored;
    }
  } catch (err) {
    console.error("[doc-preview-pdf] 读取失败：", err);
    return NextResponse.json({ error: "读取失败" }, { status: 500 });
  }

  try {
    if (kind === "docx") {
      // LibreOffice 转换 docx → PDF
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lo-"));
      const srcPath = path.join(tmpDir, "input.docx");
      const pdfPath = path.join(tmpDir, "input.pdf");
      fs.writeFileSync(srcPath, buf);

      execSync(
        "/opt/homebrew/bin/soffice --headless --norestore --convert-to pdf --outdir " +
          `"${tmpDir}" "${srcPath}"`,
        { timeout: 30000, stdio: "pipe" }
      );

      if (!fs.existsSync(pdfPath)) {
        throw new Error("LibreOffice 转换未生成 PDF");
      }
      const pdfBuf = fs.readFileSync(pdfPath);
      fs.rmSync(tmpDir, { recursive: true, force: true });

      await audit({
        userId: session.user.id,
        action: "DOCUMENT_PREVIEW",
        targetType: "Document",
        targetId: doc.id,
        detail: { matterId: doc.matterId, name: doc.name, kind: "pdf" }
      });

      return new NextResponse(pdfBuf, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(doc.name.replace(/\.docx?$/i, ".pdf"))}`
        }
      });
    } else {
      // xlsx → HTML 表格
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buf as unknown as ArrayBuffer);
      const parts: string[] = [];
      wb.eachSheet((ws) => {
        parts.push(`<div class="sheet-name">${escapeHtml(ws.name)}</div>`);
        const rows: string[] = [];
        ws.eachRow({ includeEmpty: false }, (row) => {
          const cells: string[] = [];
          row.eachCell({ includeEmpty: true }, (cell) => {
            const v = cell.value;
            let text = "";
            if (v == null) text = "";
            else if (typeof v === "object" && "text" in (v as object))
              text = String((v as { text: unknown }).text ?? "");
            else if (typeof v === "object" && "result" in (v as object))
              text = String((v as { result: unknown }).result ?? "");
            else text = String(v);
            cells.push(`<td>${escapeHtml(text)}</td>`);
          });
          rows.push(`<tr>${cells.join("")}</tr>`);
        });
        parts.push(`<table>${rows.join("")}</table>`);
      });
      const body = parts.join("") || "<p>（空表格）</p>";
      const html = `<!doctype html><html lang="zh"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${escapeHtml(doc.name)}</title><style>body{margin:0;padding:24px 28px;font-family:-apple-system,PingFang SC,Microsoft YaHei,sans-serif;color:#1a1a1a;line-height:1.7;background:#fff}table{border-collapse:collapse;width:100%;margin:8px 0;font-size:13px}td,th{border:1px solid #d4d4d4;padding:4px 8px;vertical-align:top}th{background:#f5f5f5;font-weight:600}.sheet-name{margin:18px 0 6px;font-weight:600;font-size:14px;color:#444}</style></head><body>${body}</body></html>`;

      await audit({
        userId: session.user.id,
        action: "DOCUMENT_PREVIEW",
        targetType: "Document",
        targetId: doc.id,
        detail: { matterId: doc.matterId, name: doc.name, kind: "xlsx" }
      });

      return new NextResponse(html, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }
  } catch (err) {
    console.error("[doc-preview-pdf] 转换失败：", err);
    return NextResponse.json({ error: "文档转换失败，请下载查看" }, { status: 500 });
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
