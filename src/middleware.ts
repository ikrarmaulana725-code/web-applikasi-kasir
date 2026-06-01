import { NextResponse, type NextRequest } from "next/server";

const allowedOrigins = new Set([
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  "https://localhost",
  "http://localhost",
  "capacitor://localhost"
]);

export function middleware(request: NextRequest) {
  const origin = request.headers.get("origin");
  const headers = new Headers();

  if (origin && allowedOrigins.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }

  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers });
  }

  const response = NextResponse.next();
  headers.forEach((value, key) => response.headers.set(key, value));
  return response;
}

export const config = {
  matcher: "/api/:path*"
};
