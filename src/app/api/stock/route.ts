import { StockMovementType } from "@prisma/client";
import { z } from "zod";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { requireFeature } from "@/lib/permissions";

const schema = z.object({
  productId: z.string().min(1),
  type: z.nativeEnum(StockMovementType),
  quantity: z.coerce.number().int().positive(),
  source: z.string().min(1).default("Manual"),
  note: z.string().optional().nullable()
});

export async function GET() {
  try {
    const user = await readSession();
    if (!user) return Response.json({ message: "Unauthorized" }, { status: 401 });
    requireFeature(user.role, "stock");

    const movements = await prisma.stockMovement.findMany({
      include: { product: true },
      orderBy: { createdAt: "desc" },
      take: 200
    });
    return ok(movements.map((movement) => ({ ...movement, productName: movement.product.name })));
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await readSession();
    if (!user) return Response.json({ message: "Unauthorized" }, { status: 401 });
    requireFeature(user.role, "stock");

    const body = schema.parse(await request.json());
    const movement = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: body.productId } });
      if (!product) throw Object.assign(new Error("Produk tidak ditemukan."), { status: 404 });

      const stock =
        body.type === StockMovementType.IN
          ? { increment: body.quantity }
          : body.type === StockMovementType.OUT
            ? { decrement: body.quantity }
            : undefined;

      if (body.type === StockMovementType.ADJUST) {
        await tx.product.update({ where: { id: body.productId }, data: { stock: body.quantity } });
      } else {
        await tx.product.update({ where: { id: body.productId }, data: { stock } });
      }

      return tx.stockMovement.create({ data: body, include: { product: true } });
    });

    return ok({ ...movement, productName: movement.product.name });
  } catch (error) {
    return fail(error);
  }
}
