"use client";

import * as React from "react";

import { Field, FormError } from "@/components/common/field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import * as ops from "@/data/ops";
import { useData } from "@/data/store";
import type { Phase } from "@/domain/types";
import { addDays, formatDate } from "@/lib/dates";

const KIND_LABELS: Record<Phase["kind"], string> = {
  foundation: "Foundation",
  basement: "Basement",
  floor: "Floor",
  external: "External / terrace",
  handover: "Finishing & handover",
  other: "Other",
};

/** Add or rename a phase / floor (FR-1.1). */
export function PhaseDialog({
  open,
  onOpenChange,
  phase,
  projectId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phase: Phase | null;
  projectId: string;
}) {
  const run = useData((s) => s.run);
  const [name, setName] = React.useState("");
  const [kind, setKind] = React.useState<Phase["kind"]>("floor");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setName(phase?.name ?? "");
      setKind(phase?.kind ?? "floor");
      setError(null);
    }
  }, [open, phase]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const result = phase
      ? run((s, actor) => ops.updatePhase(s, actor, phase.id, { name, kind }))
      : run((s, actor) => ops.createPhase(s, actor, { projectId, name, kind }));
    if (result.ok) onOpenChange(false);
    else setError(result.error);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{phase ? "Edit phase" : "Add phase / floor"}</DialogTitle>
            <DialogDescription>Phases group activities, e.g. Basement, Stilt, First Floor.</DialogDescription>
          </DialogHeader>
          <Field label="Name" htmlFor="ph-name">
            <Input id="ph-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="e.g. Fifth Floor" />
          </Field>
          <Field label="Type" htmlFor="ph-kind">
            <NativeSelect id="ph-kind" value={kind} onChange={(e) => setKind(e.target.value as Phase["kind"])}>
              {(Object.keys(KIND_LABELS) as Phase["kind"][]).map((k) => (
                <option key={k} value={k}>
                  {KIND_LABELS[k]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <FormError message={error} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{phase ? "Save" : "Add phase"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Floor template (FR-1.3): copy one phase's activity sequence to another, shifted in time. */
export function CloneFloorDialog({
  open,
  onOpenChange,
  projectId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}) {
  const run = useData((s) => s.run);
  const phases = useData((s) => s.phases);
  const activities = useData((s) => s.activities);
  const projectPhases = phases.filter((p) => p.projectId === projectId).sort((a, b) => a.order - b.order);
  const withActivities = projectPhases.filter((p) => activities.some((a) => a.phaseId === p.id));

  const [source, setSource] = React.useState("");
  const [target, setTarget] = React.useState("");
  const [offset, setOffset] = React.useState("30");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      const floors = withActivities.filter((p) => p.kind === "floor");
      const src = floors.at(-1) ?? withActivities[0];
      setSource(src?.id ?? "");
      setTarget(projectPhases.find((p) => p.id !== src?.id && !activities.some((a) => a.phaseId === p.id))?.id ?? "");
      setOffset("30");
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const sourceRows = activities.filter((a) => a.phaseId === source);
  const sourceStart = sourceRows.map((a) => a.plannedStart).sort()[0];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const offsetDays = Number(offset);
    const result = run((s, actor) =>
      ops.cloneFloor(s, actor, { sourcePhaseId: source, targetPhaseId: target, offsetDays }),
    );
    if (result.ok) onOpenChange(false);
    else setError(result.error);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Copy floor template</DialogTitle>
            <DialogDescription>
              Copies every activity from one phase to another with dates shifted, progress reset and
              predecessors re-linked. Add the target phase first if it doesn&apos;t exist.
            </DialogDescription>
          </DialogHeader>
          <Field label="Copy from" htmlFor="cf-src" hint={sourceRows.length ? `${sourceRows.length} activities` : undefined}>
            <NativeSelect id="cf-src" value={source} onChange={(e) => setSource(e.target.value)}>
              {withActivities.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Copy to" htmlFor="cf-tgt">
            <NativeSelect id="cf-tgt" value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="">— Choose phase —</option>
              {projectPhases
                .filter((p) => p.id !== source)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </NativeSelect>
          </Field>
          <Field
            label="Shift dates by (days)"
            htmlFor="cf-off"
            hint={
              sourceStart && Number.isInteger(Number(offset))
                ? `Source starts ${formatDate(sourceStart)} → copies start ${formatDate(addDays(sourceStart, Number(offset)))}.`
                : undefined
            }
          >
            <Input id="cf-off" type="number" inputMode="numeric" value={offset} onChange={(e) => setOffset(e.target.value)} />
          </Field>
          <FormError message={error} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!source || !target}>
              Copy activities
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
