import type { Metadata } from "next";

import { RequireAccess } from "@/components/auth/require-access";
import { VendorsView } from "@/components/vendors/vendors-view";

export const metadata: Metadata = { title: "Vendors" };

export default function VendorsPage() {
  return (
    <RequireAccess module="vendors">
      <VendorsView />
    </RequireAccess>
  );
}
