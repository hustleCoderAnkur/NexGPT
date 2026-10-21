import { requireUser } from "@/lib/services/auth/require-user";
import { prisma } from "@/lib/db";

export async function GET() {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const documents = await prisma.document.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, mimeType: true, sizeBytes: true, status: true, error: true, createdAt: true, updatedAt: true, _count: { select: { chunks: true } } },
  });
  return Response.json({ documents });
}
