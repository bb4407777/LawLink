import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { uploadDocument } from "@/server/documents/actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/documents/upload
 *
 * 上传文件到案件材料。multipart/form-data，字段：
 *   - matterId (必填)
 *   - name (必填, 材料名称)
 *   - file (必填, 文件)
 *   - folderId (可选)
 *   - category (可选, 默认 OTHER)
 *   - procedureId (可选)
 *
 * 用法 (curl):
 *   curl -X POST http://localhost:3000/api/documents/upload \
 *     -F "matterId=xxx" \
 *     -F "name=判决书" \
 *     -F "file=@/path/to/document.pdf" \
 *     -F "category=COURT_DOCUMENT" \
 *     -b /path/to/cookies.txt
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const result = await uploadDocument(formData);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "上传失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
