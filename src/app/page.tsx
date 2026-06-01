import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth";

export default async function HomePage() {
  const user = await readSession();
  redirect(user ? "/dashboard" : "/login");
}
