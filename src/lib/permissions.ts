import { Role } from "@prisma/client";

export const permissions: Record<Role, string[]> = {
  OWNER: ["dashboard", "pos", "products", "stock", "transactions", "customers", "reports", "users", "settings"],
  ADMIN: ["dashboard", "pos", "products", "stock", "transactions", "customers", "reports", "settings"],
  KASIR: ["dashboard", "pos", "transactions", "customers"],
  GUDANG: ["dashboard", "products", "stock"]
};

export function can(role: Role, feature: string) {
  return permissions[role]?.includes(feature) ?? false;
}

export function requireFeature(role: Role, feature: string) {
  if (!can(role, feature)) {
    throw Object.assign(new Error("Forbidden"), { status: 403 });
  }
}
