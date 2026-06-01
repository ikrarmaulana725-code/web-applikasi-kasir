import { readSession } from "@/lib/auth";
import { ok } from "@/lib/http";

export async function GET() {
  const user = await readSession();
  return ok({ user });
}
