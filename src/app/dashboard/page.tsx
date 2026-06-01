import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth";
import DashboardClient from "@/app/dashboard/ui";

export default async function DashboardPage() {
  const user = await readSession();
  if (!user) redirect("/login");
  return <DashboardClient />;
}
