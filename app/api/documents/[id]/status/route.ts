import { requireUser } from "@/lib/services/auth/require-user";
import { prisma } from "@/lib/db";
type RouteContext = { params: Promise<{ id: string }> };
export async function GET(_req: Request, context: RouteContext) {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const document = await prisma.document.findFirst({ where: { id, userId: user.id }, select: { id: true, status: true, error: true, _count: { select: { chunks: true } } } });
  if (!document) return Response.json({ error: "Document not found" }, { status: 404 });
  return Response.json({ document });
}
