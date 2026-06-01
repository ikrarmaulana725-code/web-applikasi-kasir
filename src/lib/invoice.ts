import { PrismaClient } from "@prisma/client";

export async function nextInvoice(prisma: PrismaClient, prefix: string) {
  const now = new Date();
  const key = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("");

  const count = await prisma.transaction.count({
    where: { invoiceNumber: { startsWith: `${prefix}-${key}` } }
  });

  return `${prefix}-${key}-${String(count + 1).padStart(4, "0")}`;
}
