import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });

  try {
    const doc = await prisma.document.findFirst({ where: { id } });
    if (!doc) return NextResponse.json({ error: "未找到" }, { status: 404 });

    const buf = doc.encrypted && doc.iv && doc.authTag
      ? (await import("@/lib/storage/crypto")).decryptBuffer(await storage.readFile(doc.path), doc.iv, doc.authTag)
      : await storage.readFile(doc.path);
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
    return new NextResponse(ab, {
      status: 200,
      headers: {
        "Content-Type": doc.mimeType ?? "application/octet-stream",
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(doc.name)}`
      }
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
