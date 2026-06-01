import { z } from "zod";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { requireFeature } from "@/lib/permissions";

const schema = z.object({
  name: z.string().min(1),
  phone: z.string().optional().nullable(),
  points: z.coerce.number().int().min(0)
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await readSession();
    if (!user) return Response.json({ message: "Unauthorized" }, { status: 401 });
    requireFeature(user.role, "customers");

    return ok(await prisma.customer.update({ where: { id }, data: schema.partial().parse(await request.json()) }));
  } catch (error) {
    return fail(error);
  }
}
