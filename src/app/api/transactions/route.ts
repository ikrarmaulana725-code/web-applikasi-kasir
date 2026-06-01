import { PaymentMethod, StockMovementType } from "@prisma/client";
import { z } from "zod";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fail, money, ok } from "@/lib/http";
import { nextInvoice } from "@/lib/invoice";
import { requireFeature } from "@/lib/permissions";

const itemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive()
});

const schema = z.object({
  customerId: z.string().optional().nullable(),
  items: z.array(itemSchema).min(1),
  discount: z.coerce.number().min(0).default(0),
  paidAmount: z.coerce.number().min(0),
  paymentMethod: z.nativeEnum(PaymentMethod)
});

export async function GET() {
  try {
    const user = await readSession();
    if (!user) return Response.json({ message: "Unauthorized" }, { status: 401 });
    requireFeature(user.role, "transactions");

    const transactions = await prisma.transaction.findMany({
      include: { cashier: true, customer: true, items: true },
      orderBy: { createdAt: "desc" },
      take: 200
    });

    return ok(transactions.map((transaction) => ({
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
    })));
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await readSession();
    if (!user) return Response.json({ message: "Unauthorized" }, { status: 401 });
    requireFeature(user.role, "pos");

    const body = schema.parse(await request.json());
    const transaction = await prisma.$transaction(async (tx) => {
      const settings = await tx.storeSetting.findFirst();
      if (!settings) throw Object.assign(new Error("Pengaturan toko belum dibuat."), { status: 400 });

      const productIds = body.items.map((item) => item.productId);
      const products = await tx.product.findMany({ where: { id: { in: productIds }, active: true } });
      const productMap = new Map(products.map((product) => [product.id, product]));

      const lines = body.items.map((item) => {
        const product = productMap.get(item.productId);
        if (!product) throw Object.assign(new Error("Produk tidak ditemukan."), { status: 404 });
        if (product.stock < item.quantity) throw Object.assign(new Error(`Stok ${product.name} tidak cukup.`), { status: 400 });

        const sellingPrice = money(product.sellingPrice);
        const costPrice = money(product.costPrice);
        return {
          product,
          quantity: item.quantity,
          costPrice,
          sellingPrice,
          subtotal: sellingPrice * item.quantity
        };
      });

      const subtotal = lines.reduce((sum, line) => sum + line.subtotal, 0);
      const discount = Math.min(body.discount, subtotal);
      const taxable = subtotal - discount;
      const tax = Math.round(taxable * (money(settings.taxRate) / 100));
      const total = taxable + tax;
      if (body.paymentMethod !== PaymentMethod.RECEIVABLE && body.paidAmount < total) {
        throw Object.assign(new Error("Jumlah bayar kurang dari total."), { status: 400 });
      }

      const invoiceNumber = await nextInvoice(tx as never, settings.invoicePrefix);
      const created = await tx.transaction.create({
        data: {
          invoiceNumber,
          cashierId: user.id,
          customerId: body.customerId || null,
          subtotal,
          discount,
          tax,
          total,
          paidAmount: body.paidAmount,
          changeAmount: Math.max(0, body.paidAmount - total),
          paymentMethod: body.paymentMethod,
          items: {
            create: lines.map((line) => ({
              productId: line.product.id,
              productName: line.product.name,
              quantity: line.quantity,
              costPrice: line.costPrice,
              sellingPrice: line.sellingPrice,
              subtotal: line.subtotal
            }))
          },
          payments: {
            create: [{ method: body.paymentMethod, amount: body.paidAmount }]
          }
        },
        include: { cashier: true, customer: true, items: true }
      });

      for (const line of lines) {
        await tx.product.update({
          where: { id: line.product.id },
          data: { stock: { decrement: line.quantity } }
        });
        await tx.stockMovement.create({
          data: {
            productId: line.product.id,
            type: StockMovementType.OUT,
            quantity: line.quantity,
            source: invoiceNumber,
            note: "Transaksi penjualan"
          }
        });
      }

      return created;
    });

    return ok({
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
    });
  } catch (error) {
    return fail(error);
  }
}
