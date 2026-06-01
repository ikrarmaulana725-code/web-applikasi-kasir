import { z } from "zod";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { requireFeature } from "@/lib/permissions";

const schema = z.object({ name: z.string().min(1) });

export async function GET() {
  try {
    const user = await readSession();
    if (!user) return Response.json({ message: "Unauthorized" }, { status: 401 });
    const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
    return ok(categories);
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await readSession();
    if (!user) return Response.json({ message: "Unauthorized" }, { status: 401 });
    requireFeature(user.role, "products");

    const body = schema.parse(await request.json());
    return ok(await prisma.category.create({ data: body }));
  } catch (error) {
    return fail(error);
  }
}
