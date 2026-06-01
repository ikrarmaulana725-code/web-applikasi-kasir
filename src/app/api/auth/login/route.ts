import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth";
import { fail, ok } from "@/lib/http";

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { username: body.username } });

    if (!user?.active) {
      return Response.json({ message: "Username atau password salah." }, { status: 401 });
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      return Response.json({ message: "Username atau password salah." }, { status: 401 });
    }

    const sessionUser = { id: user.id, username: user.username, name: user.name, role: user.role };
    const token = await createSessionToken(sessionUser);
    (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions());

    return ok({ user: sessionUser, token });
  } catch (error) {
    return fail(error);
  }
}
