"use client";

import * as React from "react";

import { Field, FormError } from "@/components/common/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import * as ops from "@/data/ops";
import { useData } from "@/data/store";
import { REMARK_KIND_LABELS, type Activity, type Remark } from "@/domain/types";
import { formatDateTime } from "@/lib/dates";

const KINDS = Object.keys(REMARK_KIND_LABELS) as Remark["kind"][];

/** Remarks / exceptions log for one activity (FR-1.6, FR-11.5). */
export function RemarksDialog({
  activity,
  onOpenChange,
}: {
  activity: Activity | null;
  onOpenChange: (open: boolean) => void;
}) {
  const run = useData((s) => s.run);
  const allRemarks = useData((s) => s.remarks);
  const [text, setText] = React.useState("");
  const [kind, setKind] = React.useState<Remark["kind"]>("note");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setText("");
    setKind("note");
    setError(null);
  }, [activity?.id]);

  const remarks = activity
    ? allRemarks.filter((r) => r.activityId === activity.id).sort((a, b) => b.at.localeCompare(a.at))
    : [];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!activity) return;
    const result = run((s, actor) => ops.addRemark(s, actor, { activityId: activity.id, text, kind }));
    if (result.ok) {
      setText("");
      setError(null);
    } else {
      setError(result.error);
    }
  }

  return (
    <Dialog open={!!activity} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Remarks</DialogTitle>
          <DialogDescription>{activity?.name}</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-3">
          <Field label="Type" htmlFor="r-kind">
            <NativeSelect id="r-kind" value={kind} onChange={(e) => setKind(e.target.value as Remark["kind"])}>
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {REMARK_KIND_LABELS[k]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Remark" htmlFor="r-text">
            <Textarea
              id="r-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. Hard rock below 4'0&quot;, rock breaker mobilised"
              rows={3}
            />
          </Field>
          <FormError message={error} />
          <div className="flex justify-end">
            <Button type="submit">Add remark</Button>
          </div>
        </form>

        <div className="space-y-3 border-t pt-3">
          {remarks.length === 0 ? (
            <p className="text-muted-foreground text-sm">No remarks yet.</p>
          ) : (
            remarks.map((r) => (
              <div key={r.id} className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant={r.kind === "note" ? "outline" : "warning"}>{REMARK_KIND_LABELS[r.kind]}</Badge>
                  <span className="font-medium">{r.userName}</span>
                  <span className="text-muted-foreground">{formatDateTime(r.at)}</span>
                </div>
                <p className="text-sm">{r.text}</p>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
