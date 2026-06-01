import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { requireFeature } from "@/lib/permissions";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await readSession();
    if (!user) return Response.json({ message: "Unauthorized" }, { status: 401 });
    requireFeature(user.role, "products");

    await prisma.category.delete({ where: { id } });
    return ok({ success: true });
  } catch (error) {
    return fail(error);
  }
}
