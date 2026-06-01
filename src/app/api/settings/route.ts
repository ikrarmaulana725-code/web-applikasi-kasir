import { z } from "zod";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fail, money, ok } from "@/lib/http";
import { requireFeature } from "@/lib/permissions";

const schema = z.object({
  storeName: z.string().min(1),
  address: z.string().default(""),
  phone: z.string().default(""),
  receiptFooter: z.string().default(""),
  taxRate: z.coerce.number().min(0).max(100),
  invoicePrefix: z.string().min(1)
});

export async function PATCH(request: Request) {
  try {
    const user = await readSession();
    if (!user) return Response.json({ message: "Unauthorized" }, { status: 401 });
    requireFeature(user.role, "settings");

    const body = schema.parse(await request.json());
    const existing = await prisma.storeSetting.findFirst();
    const settings = existing
      ? await prisma.storeSetting.update({ where: { id: existing.id }, data: body })
      : await prisma.storeSetting.create({ data: body });

    return ok({ ...settings, taxRate: money(settings.taxRate) });
  } catch (error) {
    return fail(error);
  }
}
