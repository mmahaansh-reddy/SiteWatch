import type { Metadata } from "next";

import { RequireAccess } from "@/components/auth/require-access";
import { ScheduleView } from "@/components/schedule/schedule-view";

export const metadata: Metadata = { title: "Activities" };

export default function SchedulePage() {
  return (
    <RequireAccess module="schedule">
      <ScheduleView />
    </RequireAccess>
  );
}
