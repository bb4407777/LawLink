import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { notFound } from "next/navigation";

export default async function PreviewPage({ params }: { params: { id: string } }) {
  const doc = await prisma.document.findFirst({
    where: { id: params.id, deletedAt: null }
  });
  if (!doc || doc.mimeType !== "application/pdf") notFound();

  let buf: Buffer;
  try {
    const stored = await storage.readFile(doc.path);
    buf = doc.encrypted && doc.iv && doc.authTag
      ? (await import("@/lib/storage/crypto")).decryptBuffer(stored, doc.iv, doc.authTag)
      : stored;
  } catch {
    notFound();
  }

  const base64 = buf.toString("base64");

  return (
    <div className="h-screen w-full bg-background">
      <iframe
        src={`data:application/pdf;base64,${base64}`}
        className="h-full w-full border-0"
        title={doc.name}
      />
    </div>
  );
}
