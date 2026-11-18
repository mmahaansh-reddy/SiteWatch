"use client";

import * as React from "react";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DataReady } from "@/components/common/data-ready";
import { Field, FormError } from "@/components/common/field";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import * as ops from "@/data/ops";
import { useActor, useData, useSnapshot } from "@/data/store";
import { TRADES, TRADE_LABELS, type Trade, type Vendor } from "@/domain/types";
import { usePermissions } from "@/hooks/use-permissions";
import { formatINR, paiseToRupees, rupeesToPaise } from "@/lib/money";

export function VendorsView() {
  return (
    <DataReady>
      <VendorsInner />
    </DataReady>
  );
}

function VendorsInner() {
  const snapshot = useSnapshot();
  const actor = useActor();
  const { can } = usePermissions();
  const run = useData((s) => s.run);
  const [editing, setEditing] = React.useState<Vendor | null | "new">(null);
  const [deleting, setDeleting] = React.useState<Vendor | null>(null);

  const vendors = ops.visibleVendors(snapshot, actor);
  const activityCount = (id: string) => snapshot.activities.filter((a) => a.vendorId === id).length;
  const total = vendors.reduce((sum, v) => sum + v.contractValue, 0);

  return (
    <>
      <PageHeader
        title="Vendors"
        description="Vendor and contractor master: trade, contacts, contract value and payment terms (FR-4.1)."
        actions={
          can("vendors", "create") ? (
            <Button onClick={() => setEditing("new")}>
              <Plus aria-hidden /> Vendor
            </Button>
          ) : null
        }
      />

      <Card className="py-0">
        {vendors.length === 0 ? (
          <CardContent className="text-muted-foreground py-10 text-center text-sm">No vendors to show.</CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Vendor</TableHead>
                <TableHead>Trade</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-right">Contract value</TableHead>
                <TableHead>Payment terms</TableHead>
                <TableHead className="text-right">Activities</TableHead>
                <TableHead className="pr-4">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendors.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="pl-4 font-medium">{v.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{TRADE_LABELS[v.trade]}</Badge>
                  </TableCell>
                  <TableCell>
                    <div>{v.contactName || "—"}</div>
                    <div className="text-muted-foreground text-xs">{[v.phone, v.email].filter(Boolean).join(" · ")}</div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatINR(v.contractValue)}</TableCell>
                  <TableCell className="max-w-[240px] truncate">{v.paymentTerms || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{activityCount(v.id)}</TableCell>
                  <TableCell className="pr-4 text-right">
                    {can("vendors", "edit") ? (
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" aria-label={`Options for ${v.name}`}>
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setEditing(v)}>
                            <Pencil /> Edit
                          </DropdownMenuItem>
                          {can("vendors", "delete") ? (
                            <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(v)}>
                              <Trash2 /> Delete
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="hover:bg-transparent">
                <TableCell className="pl-4 font-medium" colSpan={3}>
                  Total
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">{formatINR(total)}</TableCell>
                <TableCell colSpan={3} />
              </TableRow>
            </TableBody>
          </Table>
        )}
      </Card>

      <VendorDialog vendor={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete vendor?"
        description={deleting ? `"${deleting.name}" will be removed and unassigned from its activities.` : ""}
        onConfirm={() => (deleting ? run((s, a) => ops.deleteVendor(s, a, deleting.id)) : { ok: true })}
      />
    </>
  );
}

const EMPTY: ops.VendorInput = {
  name: "",
  trade: "rcc",
  contactName: "",
  phone: "",
  email: "",
  contractValue: 0,
  paymentTerms: "",
};

function VendorDialog({ vendor, onClose }: { vendor: Vendor | null | "new"; onClose: () => void }) {
  const run = useData((s) => s.run);
  const [form, setForm] = React.useState<ops.VendorInput>(EMPTY);
  const [rupees, setRupees] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [error, setError] = React.useState<string | null>(null);
  const open = vendor !== null;

  React.useEffect(() => {
    if (vendor === null) return;
    const base = vendor === "new" ? EMPTY : vendor;
    setForm({ ...base });
    setRupees(base.contractValue ? String(paiseToRupees(base.contractValue)) : "");
    setErrors({});
    setError(null);
  }, [vendor]);

  const set = <K extends keyof ops.VendorInput>(k: K, v: ops.VendorInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const amount = rupees.trim() === "" ? 0 : Number(rupees.replace(/,/g, ""));
    const input = { ...form, contractValue: Number.isFinite(amount) ? rupeesToPaise(amount) : -1 };
    const result =
      vendor === "new"
        ? run((s, a) => ops.createVendor(s, a, input))
        : vendor
          ? run((s, a) => ops.updateVendor(s, a, vendor.id, input))
          : { ok: true as const };
    if (result.ok) onClose();
    else {
      setErrors(result.fieldErrors);
      setError(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>{vendor === "new" ? "Add vendor" : "Edit vendor"}</DialogTitle>
            <DialogDescription>Vendors are assigned to activities so delay ownership is visible.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Vendor name" htmlFor="v-name" error={errors.name} className="sm:col-span-2">
              <Input id="v-name" value={form.name} onChange={(e) => set("name", e.target.value)} aria-invalid={!!errors.name} autoFocus />
            </Field>
            <Field label="Trade" htmlFor="v-trade">
              <NativeSelect id="v-trade" value={form.trade} onChange={(e) => set("trade", e.target.value as Trade)}>
                {TRADES.map((t) => (
                  <option key={t} value={t}>
                    {TRADE_LABELS[t]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Contract value (₹)" htmlFor="v-value" error={errors.contractValue}>
              <Input id="v-value" inputMode="decimal" value={rupees} onChange={(e) => setRupees(e.target.value)} placeholder="e.g. 2500000" aria-invalid={!!errors.contractValue} />
            </Field>
            <Field label="Contact person" htmlFor="v-contact">
              <Input id="v-contact" value={form.contactName} onChange={(e) => set("contactName", e.target.value)} />
            </Field>
            <Field label="Phone" htmlFor="v-phone">
              <Input id="v-phone" type="tel" inputMode="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </Field>
            <Field label="Email" htmlFor="v-email" error={errors.email} className="sm:col-span-2">
              <Input id="v-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} aria-invalid={!!errors.email} />
            </Field>
            <Field label="Payment terms" htmlFor="v-terms" className="sm:col-span-2">
              <Input id="v-terms" value={form.paymentTerms} onChange={(e) => set("paymentTerms", e.target.value)} placeholder="e.g. Monthly running bills; 5% retention" />
            </Field>
          </div>
          <FormError message={error} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">{vendor === "new" ? "Add vendor" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
