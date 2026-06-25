import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  await requireSession();
  const q = req.nextUrl.searchParams.get("q") || "";
  if (!q.trim()) return NextResponse.json([]);

  const matters = await prisma.matter.findMany({
    where: {
      deletedAt: null,
      title: { contains: q, mode: "insensitive" }
    },
    select: { id: true, title: true, internalCode: true },
    orderBy: { updatedAt: "desc" },
    take: 10
  });

  return NextResponse.json(matters);
}
