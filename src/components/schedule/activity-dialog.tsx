"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";

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
import { predecessorWarnings } from "@/domain/schedule";
import { TRADES, TRADE_LABELS, type Activity, type Trade } from "@/domain/types";
import { usePermissions } from "@/hooks/use-permissions";
import { addDays, formatDate, todayISO } from "@/lib/dates";
import { DEMO_USERS } from "@/lib/demo-identities";

interface FormState {
  name: string;
  phaseId: string;
  trade: Trade;
  plannedStart: string;
  plannedEnd: string;
  actualStart: string;
  actualEnd: string;
  progress: string;
  onHold: boolean;
  predecessorId: string;
  vendorId: string;
  engineerId: string;
}

function toForm(a: Activity | null, defaults: { phaseId: string }): FormState {
  const today = todayISO();
  return {
    name: a?.name ?? "",
    phaseId: a?.phaseId ?? defaults.phaseId,
    trade: a?.trade ?? "rcc",
    plannedStart: a?.plannedStart ?? today,
    plannedEnd: a?.plannedEnd ?? addDays(today, 13),
    actualStart: a?.actualStart ?? "",
    actualEnd: a?.actualEnd ?? "",
    progress: String(a?.progress ?? 0),
    onHold: a?.status === "on_hold",
    predecessorId: a?.predecessorId ?? "",
    vendorId: a?.vendorId ?? "",
    engineerId: a?.engineerId ?? "",
  };
}

const QUICK_PROGRESS = [0, 25, 50, 75, 100];
const ENGINEERS = DEMO_USERS.filter((u) => u.role === "site_engineer");

export function ActivityDialog({
  open,
  onOpenChange,
  activity,
  projectId,
  defaultPhaseId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = create a new activity. */
  activity: Activity | null;
  projectId: string;
  defaultPhaseId: string;
}) {
  const { can } = usePermissions();
  const fullEdit = can("schedule", "create");
  const run = useData((s) => s.run);
  const phases = useData((s) => s.phases);
  const vendors = useData((s) => s.vendors);
  const activities = useData((s) => s.activities);

  const [form, setForm] = React.useState<FormState>(() => toForm(activity, { phaseId: defaultPhaseId }));
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setForm(toForm(activity, { phaseId: defaultPhaseId }));
      setErrors({});
      setFormError(null);
    }
  }, [open, activity, defaultPhaseId]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const projectPhases = phases.filter((p) => p.projectId === projectId).sort((a, b) => a.order - b.order);
  const predecessorOptions = activities.filter((a) => a.projectId === projectId && a.id !== activity?.id);

  const warnings = fullEdit
    ? predecessorWarnings(
        {
          id: activity?.id ?? "new",
          predecessorId: form.predecessorId || null,
          plannedStart: form.plannedStart,
          actualStart: form.actualStart || null,
        },
        activities,
      )
    : [];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const progress = Number(form.progress);
    const progressFields = {
      actualStart: form.actualStart || null,
      actualEnd: form.actualEnd || null,
      progress: Number.isFinite(progress) ? progress : -1,
    };
    const fullFields = {
      name: form.name,
      phaseId: form.phaseId,
      trade: form.trade,
      plannedStart: form.plannedStart,
      plannedEnd: form.plannedEnd,
      predecessorId: form.predecessorId || null,
      vendorId: form.vendorId || null,
      engineerId: form.engineerId || null,
    };

    const result = activity
      ? run((s, actor, today) => {
          const patch: Partial<Activity> = fullEdit
            ? {
                ...fullFields,
                ...progressFields,
                status: form.onHold ? "on_hold" : activity.status === "on_hold" ? "in_progress" : activity.status,
              }
            : progressFields;
          return ops.updateActivity(s, actor, activity.id, patch, today);
        })
      : run((s, actor, today) =>
          ops.createActivity(
            s,
            actor,
            { ...fullFields, ...progressFields, projectId, status: form.onHold ? "on_hold" : "not_started" },
            today,
          ),
        );

    if (result.ok) {
      onOpenChange(false);
    } else {
      setErrors(result.fieldErrors);
      setFormError(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>
              {activity ? (fullEdit ? "Edit activity" : "Update progress") : "Add activity"}
            </DialogTitle>
            <DialogDescription>
              {activity && !fullEdit
                ? `${activity.name} · planned ${formatDate(activity.plannedStart)} → ${formatDate(activity.plannedEnd)}`
                : "Planned dates become the baseline when the activity is created."}
            </DialogDescription>
          </DialogHeader>

          {fullEdit ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Activity name" htmlFor="a-name" error={errors.name} className="sm:col-span-2">
                <Input
                  id="a-name"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  aria-invalid={!!errors.name}
                  placeholder="e.g. Column & roof slab RCC — Second Floor"
                  autoFocus
                />
              </Field>
              <Field label="Phase / floor" htmlFor="a-phase" error={errors.phaseId}>
                <NativeSelect id="a-phase" value={form.phaseId} onChange={(e) => set("phaseId", e.target.value)}>
                  {projectPhases.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Trade" htmlFor="a-trade">
                <NativeSelect id="a-trade" value={form.trade} onChange={(e) => set("trade", e.target.value as Trade)}>
                  {TRADES.map((t) => (
                    <option key={t} value={t}>
                      {TRADE_LABELS[t]}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Planned start" htmlFor="a-ps" error={errors.plannedStart}>
                <Input id="a-ps" type="date" value={form.plannedStart} onChange={(e) => set("plannedStart", e.target.value)} aria-invalid={!!errors.plannedStart} />
              </Field>
              <Field label="Planned end" htmlFor="a-pe" error={errors.plannedEnd}>
                <Input id="a-pe" type="date" value={form.plannedEnd} onChange={(e) => set("plannedEnd", e.target.value)} aria-invalid={!!errors.plannedEnd} />
              </Field>
              <Field label="Vendor" htmlFor="a-vendor">
                <NativeSelect id="a-vendor" value={form.vendorId} onChange={(e) => set("vendorId", e.target.value)}>
                  <option value="">— Unassigned —</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Site engineer" htmlFor="a-eng">
                <NativeSelect id="a-eng" value={form.engineerId} onChange={(e) => set("engineerId", e.target.value)}>
                  <option value="">— Unassigned —</option>
                  {ENGINEERS.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Predecessor" htmlFor="a-pred" error={errors.predecessorId} className="sm:col-span-2">
                <NativeSelect id="a-pred" value={form.predecessorId} onChange={(e) => set("predecessorId", e.target.value)}>
                  <option value="">— None —</option>
                  {predecessorOptions.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Actual start" htmlFor="a-as" error={errors.actualStart}>
              <Input id="a-as" type="date" value={form.actualStart} onChange={(e) => set("actualStart", e.target.value)} aria-invalid={!!errors.actualStart} />
            </Field>
            <Field label="Actual end" htmlFor="a-ae" error={errors.actualEnd} hint="Setting this marks the activity 100% complete.">
              <Input id="a-ae" type="date" value={form.actualEnd} onChange={(e) => set("actualEnd", e.target.value)} aria-invalid={!!errors.actualEnd} />
            </Field>
            <Field label="% complete" htmlFor="a-prog" error={errors.progress} className="sm:col-span-2">
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  id="a-prog"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={100}
                  value={form.progress}
                  onChange={(e) => set("progress", e.target.value)}
                  className="w-24"
                  aria-invalid={!!errors.progress}
                />
                {QUICK_PROGRESS.map((p) => (
                  <Button
                    key={p}
                    type="button"
                    size="sm"
                    variant={Number(form.progress) === p ? "default" : "outline"}
                    onClick={() => set("progress", String(p))}
                  >
                    {p}%
                  </Button>
                ))}
              </div>
            </Field>
            {fullEdit ? (
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  className="accent-primary size-4"
                  checked={form.onHold}
                  onChange={(e) => set("onHold", e.target.checked)}
                />
                On hold (excluded from delay alerts)
              </label>
            ) : null}
          </div>

          {warnings.length > 0 ? (
            <ul className="bg-warning/15 space-y-1 rounded-md px-3 py-2 text-sm">
              {warnings.map((w) => (
                <li key={w} className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <span>{w} You can still save — overlapping trades are allowed.</span>
                </li>
              ))}
            </ul>
          ) : null}

          <FormError message={formError} />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{activity ? "Save changes" : "Add activity"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
