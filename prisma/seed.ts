import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("123456", 12);

  await prisma.storeSetting.upsert({
    where: { id: "default-store" },
    update: {},
    create: {
      id: "default-store",
      storeName: "Toko Berkah Jaya",
      address: "Jl. Poros Utama No. 10",
      phone: "081234567890",
      receiptFooter: "Terima kasih sudah berbelanja.",
      taxRate: 0,
      invoicePrefix: "INV"
    }
  });

  const users = [
    ["owner", "Owner Demo", Role.OWNER],
    ["admin", "Admin Toko", Role.ADMIN],
    ["kasir", "Kasir Sore", Role.KASIR],
    ["gudang", "Staff Gudang", Role.GUDANG]
  ] as const;

  for (const [username, name, role] of users) {
    await prisma.user.upsert({
      where: { username },
      update: { name, role, active: true },
      create: { username, name, role, passwordHash, active: true }
    });
  }

  const makanan = await prisma.category.upsert({
    where: { name: "Makanan" },
    update: {},
    create: { name: "Makanan" }
  });
  const minuman = await prisma.category.upsert({
    where: { name: "Minuman" },
    update: {},
    create: { name: "Minuman" }
  });
  const rumahTangga = await prisma.category.upsert({
    where: { name: "Rumah Tangga" },
    update: {},
    create: { name: "Rumah Tangga" }
  });

  const products = [
    ["Indomie Goreng", makanan.id, "MKN-001", "899886620001", 2800, 3500, 100, "pcs"],
    ["Aqua 600ml", minuman.id, "MNM-001", "899275372222", 2500, 4000, 36, "pcs"],
    ["Kopi Sachet", minuman.id, "MNM-002", "899100210003", 1200, 2000, 12, "pcs"],
    ["Sabun Cuci", rumahTangga.id, "RT-001", "899700440004", 7000, 9500, 8, "pcs"]
  ] as const;

  for (const [name, categoryId, sku, barcode, costPrice, sellingPrice, stock, unit] of products) {
    await prisma.product.upsert({
      where: { sku },
      update: { name, categoryId, barcode, costPrice, sellingPrice, stock, unit, active: true },
      create: { name, categoryId, sku, barcode, costPrice, sellingPrice, stock, unit, active: true }
    });
  }

  await prisma.customer.upsert({
    where: { id: "general-customer" },
    update: {},
    create: { id: "general-customer", name: "Umum", phone: null, points: 0 }
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
