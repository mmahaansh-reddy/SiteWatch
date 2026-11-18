import type { Metadata } from "next";

import { RequireAccess } from "@/components/auth/require-access";
import { DataTools } from "@/components/admin/data-tools";
import { PermissionMatrix } from "@/components/auth/permission-matrix";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Users & Audit" };

export default function AdminPage() {
  return (
    <RequireAccess module="users">
      <PageHeader
        title="Users & Audit"
        description="Roles and permissions, data tools and the audit trail. Editing users arrives with the user screen (T5)."
      />
      <div className="space-y-6">
        <DataTools />
        <PermissionMatrix />
      </div>
    </RequireAccess>
  );
}
