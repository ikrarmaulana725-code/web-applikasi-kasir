import { StockMovementType, TransactionStatus } from "@prisma/client";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/http";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await readSession();
    if (!user) return Response.json({ message: "Unauthorized" }, { status: 401 });
    if (!["OWNER", "ADMIN"].includes(user.role)) return Response.json({ message: "Forbidden" }, { status: 403 });

    await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { id },
        include: { items: true }
      });
      if (!transaction) throw Object.assign(new Error("Transaksi tidak ditemukan."), { status: 404 });
      if (transaction.status !== TransactionStatus.SUCCESS) {
        throw Object.assign(new Error("Transaksi tidak bisa direfund."), { status: 400 });
      }

      await tx.transaction.update({
        where: { id: transaction.id },
        data: { status: TransactionStatus.REFUNDED }
      });

      for (const item of transaction.items) {
        if (!item.productId) continue;
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } }
        });
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: StockMovementType.IN,
            quantity: item.quantity,
            source: `Refund ${transaction.invoiceNumber}`,
            note: "Refund transaksi"
          }
        });
      }
    });

    return ok({ success: true });
  } catch (error) {
    return fail(error);
  }
}
