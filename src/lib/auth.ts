import { cookies, headers } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";

export const SESSION_COOKIE = "qasir_session";

export type SessionUser = {
  id: string;
  username: string;
  name: string;
  role: Role;
};

type TokenPayload = {
  sub: string;
  username: string;
  name: string;
  role: Role;
};

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set and at least 32 characters long.");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(user: SessionUser) {
  return new SignJWT({
    username: user.username,
    name: user.name,
    role: user.role
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secretKey());
}

export async function readSession(): Promise<SessionUser | null> {
  const authHeader = (await headers()).get("authorization");
  const bearerToken = authHeader?.toLowerCase().startsWith("bearer ") ? authHeader.slice(7) : null;
  const token = bearerToken || (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify<TokenPayload>(token, secretKey());
    if (!payload.sub || !payload.username || !payload.name || !payload.role) return null;

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, username: true, name: true, role: true, active: true }
    });

    if (!user?.active) return null;
    return { id: user.id, username: user.username, name: user.name, role: user.role };
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8
  };
}
