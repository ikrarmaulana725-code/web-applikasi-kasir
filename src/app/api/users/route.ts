import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { z } from "zod";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/http";

const schema = z.object({
  username: z.string().min(3),
  name: z.string().min(1),
  password: z.string().min(6).optional(),
  role: z.nativeEnum(Role),
  active: z.boolean().default(true)
});

export async function POST(request: Request) {
  try {
    const user = await readSession();
    if (!user) return Response.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== Role.OWNER) return Response.json({ message: "Forbidden" }, { status: 403 });

    const body = schema.parse(await request.json());
    const passwordHash = await bcrypt.hash(body.password ?? "123456", 12);
    const created = await prisma.user.create({
      data: { username: body.username, name: body.name, role: body.role, active: body.active, passwordHash },
      select: { id: true, username: true, name: true, role: true, active: true }
    });
    return ok(created);
  } catch (error) {
    return fail(error);
  }
}
