"use client";

import * as React from "react";
import { Database, Download, RotateCcw, Trash2, Upload } from "lucide-react";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DataReady } from "@/components/common/data-ready";
import { FormError } from "@/components/common/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import * as ops from "@/data/ops";
import { buildDemoData, downloadBackup, useData } from "@/data/store";
import { usePermissions } from "@/hooks/use-permissions";
import { formatDateTime } from "@/lib/dates";

/** Demo data, clear, JSON backup/restore (NFR-6) and the recent audit trail (FR-8.3). */
export function DataTools() {
  return (
    <DataReady>
      <DataToolsInner />
    </DataReady>
  );
}

function DataToolsInner() {
  const { role } = usePermissions();
  const run = useData((s) => s.run);
  const phases = useData((s) => s.phases.length);
  const activities = useData((s) => s.activities.length);
  const vendors = useData((s) => s.vendors.length);
  const remarks = useData((s) => s.remarks.length);
  const counts = { phases, activities, vendors, remarks };
  const audit = useData((s) => s.audit);
  const [confirm, setConfirm] = React.useState<"reset" | "clear" | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const allowed = ops.canManageData(role);

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setMessage(null);
    try {
      const json: unknown = JSON.parse(await file.text());
      const result = run((s, a) => ops.replaceAll(s, a, json, "import", `Imported ${file.name}`));
      if (result.ok) setMessage(`Restored from ${file.name}.`);
      else setError(result.error);
    } catch {
      setError("That file isn't valid JSON.");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="size-4" aria-hidden /> Data in this browser
          </CardTitle>
          <CardDescription>
            Data is saved on this device only (IndexedDB). Use backups to move it between browsers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid grid-cols-4 gap-2 text-center">
            {Object.entries(counts).map(([k, v]) => (
              <div key={k} className="bg-muted/50 rounded-md py-2">
                <dt className="text-muted-foreground text-xs capitalize">{k}</dt>
                <dd className="text-lg font-semibold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={downloadBackup}>
              <Download aria-hidden /> Download backup
            </Button>
            {allowed ? (
              <>
                <Button variant="outline" onClick={() => fileRef.current?.click()}>
                  <Upload aria-hidden /> Restore backup
                </Button>
                <Button variant="outline" onClick={() => setConfirm("reset")}>
                  <RotateCcw aria-hidden /> Load demo data
                </Button>
                <Button variant="outline" className="text-destructive" onClick={() => setConfirm("clear")}>
                  <Trash2 aria-hidden /> Clear all data
                </Button>
              </>
            ) : null}
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onImport} />
          </div>
          {message ? <p className="text-success text-sm">{message}</p> : null}
          <FormError message={error} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent changes</CardTitle>
          <CardDescription>Audit trail: who changed what, and when (latest 25).</CardDescription>
        </CardHeader>
        <CardContent>
          {audit.length === 0 ? (
            <p className="text-muted-foreground text-sm">No changes recorded yet.</p>
          ) : (
            <ul className="divide-y text-sm">
              {audit.slice(0, 25).map((e) => (
                <li key={e.id} className="py-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span>
                      <span className="font-medium">{e.userName}</span>{" "}
                      <span className="text-muted-foreground">
                        {e.action}d {e.entity}
                      </span>{" "}
                      {e.label}
                    </span>
                    <span className="text-muted-foreground text-xs">{formatDateTime(e.at)}</span>
                  </div>
                  {e.changes.length > 0 ? (
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {e.changes
                        .map((c) => `${c.field}: ${String(c.from ?? "—")} → ${String(c.to ?? "—")}`)
                        .join(" · ")}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirm === "reset"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Load demo data?"
        description="Replaces everything in this browser with the Foxsense demo project. Download a backup first if you want to keep your data."
        confirmLabel="Load demo data"
        onConfirm={() => run((s, a) => ops.replaceAll(s, a, buildDemoData(), "reset", "Loaded demo data"))}
      />
      <ConfirmDialog
        open={confirm === "clear"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Clear all data?"
        description="Removes all phases, activities, vendors and remarks from this browser so you can start fresh."
        confirmLabel="Clear everything"
        onConfirm={() => run((s, a) => ops.clearAll(s, a))}
      />
    </div>
  );
}
