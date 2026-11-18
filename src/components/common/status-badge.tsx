import { Badge } from "@/components/ui/badge";
import { DISPLAY_STATUS_LABELS, type DisplayStatus } from "@/domain/schedule";

const VARIANT: Record<DisplayStatus, "outline" | "secondary" | "success" | "destructive" | "warning"> = {
  not_started: "outline",
  in_progress: "secondary",
  completed: "success",
  on_hold: "warning",
  delayed: "destructive",
};

export function StatusBadge({ status }: { status: DisplayStatus }) {
  return <Badge variant={VARIANT[status]}>{DISPLAY_STATUS_LABELS[status]}</Badge>;
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={className ?? "flex items-center gap-2"}>
      <div
        className="bg-muted h-2 w-20 overflow-hidden rounded-full"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${value}%` }} />
      </div>
      <span className="text-muted-foreground w-10 text-xs tabular-nums">{Math.round(value)}%</span>
    </div>
  );
}
