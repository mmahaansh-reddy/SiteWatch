import type { Metadata } from "next";
import { BookOpen, Camera, ListChecks, PackagePlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Site" };

/** Big, photo-first actions for site staff. Each is wired up in the task noted. */
const ACTIONS = [
  { label: "Update progress", icon: ListChecks, task: "T7" },
  { label: "Take photo", icon: Camera, task: "T7" },
  { label: "Raise indent", icon: PackagePlus, task: "T11" },
  { label: "Daily diary", icon: BookOpen, task: "T12" },
] as const;

export default function SiteHomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Today on site</h1>
        <p className="text-muted-foreground text-sm">Your activities and quick actions.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {ACTIONS.map(({ label, icon: Icon, task }) => (
          <button
            key={label}
            type="button"
            disabled
            className="bg-card flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center shadow-sm disabled:opacity-60"
          >
            <Icon className="text-primary size-7" aria-hidden />
            <span className="font-medium">{label}</span>
            <Badge variant="secondary">{task}</Badge>
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="text-muted-foreground text-sm">
          Your assigned current and upcoming activities will appear here (FR-1.8, task T7).
        </CardContent>
      </Card>
    </div>
  );
}
