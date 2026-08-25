import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import Dashboard from "./Dashboard";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  if (!isAdmin()) redirect("/admin/login");
  return <Dashboard />;
}
