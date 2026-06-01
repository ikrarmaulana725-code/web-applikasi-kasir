import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function ok<T>(data: T) {
  return NextResponse.json(data);
}

export function fail(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json({ message: "Data tidak valid", issues: error.flatten() }, { status: 422 });
  }

  const status = typeof error === "object" && error && "status" in error ? Number(error.status) : 500;
  const message = error instanceof Error ? error.message : "Terjadi kesalahan server";
  return NextResponse.json({ message }, { status: Number.isFinite(status) ? status : 500 });
}

export function money(value: unknown) {
  if (value && typeof value === "object" && "toNumber" in value && typeof value.toNumber === "function") {
    return value.toNumber();
  }
  return Number(value ?? 0);
}
