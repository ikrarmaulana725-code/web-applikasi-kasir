import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { z } from "zod";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/http";

const schema = z.object({
  username: z.string().min(3).optional(),
  name: z.string().min(1).optional(),
  password: z.string().min(6).optional().or(z.literal("")),
  role: z.nativeEnum(Role).optional(),
  active: z.boolean().optional()
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await readSession();
    if (!user) return Response.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== Role.OWNER) return Response.json({ message: "Forbidden" }, { status: 403 });

    const body = schema.parse(await request.json());
    const passwordHash = body.password ? await bcrypt.hash(body.password, 12) : undefined;
    const updated = await prisma.user.update({
      where: { id },
      data: { username: body.username, name: body.name, role: body.role, active: body.active, passwordHash },
      select: { id: true, username: true, name: true, role: true, active: true }
    });
    return ok(updated);
  } catch (error) {
    return fail(error);
  }
}
