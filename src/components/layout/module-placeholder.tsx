import { Construction } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { NavItem } from "@/lib/nav";

/** Shown for modules whose plan task hasn't been delivered yet. */
export function ModulePlaceholder({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <>
      <PageHeader title={item.label} description={item.description} />
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <span className="bg-accent text-accent-foreground flex size-12 items-center justify-center rounded-full">
            <Icon className="size-6" aria-hidden />
          </span>
          <div className="space-y-1">
            <p className="flex items-center justify-center gap-2 font-medium">
              <Construction className="text-primary size-4" aria-hidden />
              Under construction
            </p>
            <p className="text-muted-foreground text-sm">
              This module is delivered in plan task {item.task}.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Badge variant="outline">PRD {item.prd}</Badge>
            <Badge variant="secondary">{item.task}</Badge>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
