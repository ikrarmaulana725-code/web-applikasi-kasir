import { z } from "zod";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fail, money, ok } from "@/lib/http";
import { requireFeature } from "@/lib/permissions";

const productSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  barcode: z.string().optional().nullable(),
  categoryId: z.string().min(1),
  costPrice: z.coerce.number().min(0),
  sellingPrice: z.coerce.number().min(0),
  stock: z.coerce.number().int().min(0),
  unit: z.string().min(1),
  imageUrl: z.string().optional().nullable(),
  active: z.boolean().default(true)
});

export async function GET() {
  try {
    const user = await readSession();
    if (!user) return Response.json({ message: "Unauthorized" }, { status: 401 });
    requireFeature(user.role, "products");

    const products = await prisma.product.findMany({ include: { category: true }, orderBy: { name: "asc" } });
    return ok(products.map((product) => ({ ...product, costPrice: money(product.costPrice), sellingPrice: money(product.sellingPrice) })));
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await readSession();
    if (!user) return Response.json({ message: "Unauthorized" }, { status: 401 });
    requireFeature(user.role, "products");

    const body = productSchema.parse(await request.json());
    const product = await prisma.product.create({ data: body, include: { category: true } });
    return ok({ ...product, costPrice: money(product.costPrice), sellingPrice: money(product.sellingPrice) });
  } catch (error) {
    return fail(error);
  }
}
