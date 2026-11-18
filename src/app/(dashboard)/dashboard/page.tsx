import type { Metadata } from "next";

import { RequireAccess } from "@/components/auth/require-access";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <RequireAccess module="dashboard">
      <DashboardView />
    </RequireAccess>
  );
}
