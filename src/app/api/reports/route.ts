import { TransactionStatus } from "@prisma/client";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fail, money, ok } from "@/lib/http";
import { requireFeature } from "@/lib/permissions";

export async function GET() {
  try {
    const user = await readSession();
    if (!user) return Response.json({ message: "Unauthorized" }, { status: 401 });
    requireFeature(user.role, "reports");

    const transactions = await prisma.transaction.findMany({
      where: { status: TransactionStatus.SUCCESS },
      include: { cashier: true, items: true },
      orderBy: { createdAt: "desc" }
    });

    const revenue = transactions.reduce((sum, tx) => sum + money(tx.total), 0);
    const capital = transactions.reduce(
      (sum, tx) => sum + tx.items.reduce((itemSum, item) => itemSum + money(item.costPrice) * item.quantity, 0),
      0
    );

    return ok({ revenue, capital, grossProfit: revenue - capital, transactionCount: transactions.length });
  } catch (error) {
    return fail(error);
  }
}
