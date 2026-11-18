import type { Metadata } from "next";

import { RequireAccess } from "@/components/auth/require-access";
import { PermissionMatrix } from "@/components/auth/permission-matrix";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Users & Audit" };

export default function AdminPage() {
  return (
    <RequireAccess module="users">
      <PageHeader
        title="Users & Audit"
        description="Roles and what each can see and update. User management and the audit log arrive in T5."
      />
      <PermissionMatrix />
    </RequireAccess>
  );
}
