import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { audit } from "@/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const f = await prisma.firmFile.findUnique({
    where: { id: params.id, archivedAt: null }
  });
  if (!f) return NextResponse.json({ error: "资料不存在" }, { status: 404 });

  let buf: Buffer;
  try {
    buf = await storage.readFile(f.path);
  } catch (err) {
    console.error("[firm-files/download] 读取失败：", err);
    return NextResponse.json({ error: "读取失败" }, { status: 500 });
  }

  await audit({
    userId: session.user.id,
    action: "FIRM_FILE_DOWNLOAD",
    targetType: "FirmFile",
    targetId: f.id,
    detail: { name: f.name }
  });

  const arr = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  return new NextResponse(arr, {
    status: 200,
    headers: {
      "Content-Type": f.mimeType ?? "application/octet-stream",
      "Content-Length": String(buf.byteLength),
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(f.name)}`
    }
  });
}
