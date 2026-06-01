import { PaymentMethod, TransactionStatus } from "@prisma/client";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fail, money, ok } from "@/lib/http";

export async function GET() {
  try {
    const user = await readSession();
    if (!user) return Response.json({ message: "Unauthorized" }, { status: 401 });

    const [settings, categories, products, customers, users, transactions, stockMovements] = await Promise.all([
      prisma.storeSetting.findFirst(),
      prisma.category.findMany({ orderBy: { name: "asc" } }),
      prisma.product.findMany({ include: { category: true }, orderBy: { name: "asc" } }),
      prisma.customer.findMany({ orderBy: { name: "asc" } }),
      prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, username: true, name: true, role: true, active: true } }),
      prisma.transaction.findMany({
        include: {
          cashier: { select: { name: true } },
          customer: { select: { name: true } },
          items: true
        },
        orderBy: { createdAt: "desc" },
        take: 100
      }),
      prisma.stockMovement.findMany({ include: { product: true }, orderBy: { createdAt: "desc" }, take: 100 })
    ]);

    return ok({
      user,
      settings: settings
        ? {
            ...settings,
            taxRate: money(settings.taxRate)
          }
        : null,
      categories,
      products: products.map((product) => ({
        ...product,
        costPrice: money(product.costPrice),
        sellingPrice: money(product.sellingPrice)
      })),
      customers,
      users,
      transactions: transactions.map((transaction) => ({
        ...transaction,
        subtotal: money(transaction.subtotal),
        discount: money(transaction.discount),
        tax: money(transaction.tax),
        total: money(transaction.total),
        paidAmount: money(transaction.paidAmount),
        changeAmount: money(transaction.changeAmount),
        cashierName: transaction.cashier.name,
        customerName: transaction.customer?.name ?? "Umum",
        items: transaction.items.map((item) => ({
          ...item,
          costPrice: money(item.costPrice),
          sellingPrice: money(item.sellingPrice),
          subtotal: money(item.subtotal)
        }))
      })),
      stockMovements: stockMovements.map((movement) => ({
        ...movement,
        productName: movement.product.name
      })),
      paymentMethods: Object.values(PaymentMethod),
      transactionStatuses: Object.values(TransactionStatus)
    });
  } catch (error) {
    return fail(error);
  }
}
