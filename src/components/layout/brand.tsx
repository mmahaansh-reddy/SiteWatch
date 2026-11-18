import Link from "next/link";
import { Eye } from "lucide-react";

import { cn } from "@/lib/utils";

export function Brand({ className, href = "/dashboard" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2 font-semibold", className)}>
      <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
        <Eye className="size-4" aria-hidden />
      </span>
      <span className="text-lg tracking-tight">
        Site<span className="text-primary">Watch</span>
      </span>
    </Link>
  );
}
