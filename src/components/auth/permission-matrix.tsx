import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ACTION_LABELS,
  MODULE_LABELS,
  PERMISSION_MATRIX,
  ROLES,
  ROLE_LABELS,
  type Action,
  type PermissionModule,
  type Scope,
} from "@/domain/permissions";
import { cn } from "@/lib/utils";

const MODULES = Object.keys(PERMISSION_MATRIX) as PermissionModule[];

/** Read-only view of PRD §6, generated from the live policy so it can never drift. */
export function PermissionMatrix() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Roles &amp; permissions</CardTitle>
        <CardDescription>
          From PRD §6. &ldquo;own&rdquo; = records assigned to the user or their vendor. Approvals
          sit with the Founder&apos;s Office / PM.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b text-left">
              <th scope="col" className="py-2 pr-4 font-medium">
                Module
              </th>
              {ROLES.map((role) => (
                <th key={role} scope="col" className="py-2 pr-4 font-medium">
                  {ROLE_LABELS[role]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULES.map((module) => (
              <tr key={module} className="border-b align-top last:border-0">
                <th scope="row" className="py-3 pr-4 text-left font-medium">
                  {MODULE_LABELS[module]}
                </th>
                {ROLES.map((role) => {
                  const cell = PERMISSION_MATRIX[module][role];
                  const actions = Object.entries(cell?.grant ?? {}).filter(([, s]) => s) as [
                    Action,
                    Scope,
                  ][];
                  return (
                    <td key={role} className="py-3 pr-4">
                      {cell ? (
                        <div className="space-y-1.5">
                          <p>{cell.summary}</p>
                          <p className="text-muted-foreground flex flex-wrap gap-x-2 text-xs">
                            {actions.map(([action, scope]) => (
                              <span
                                key={action}
                                className={cn(action === "approve" && "text-primary font-medium")}
                              >
                                {ACTION_LABELS[action]}
                                {scope === "own" ? " (own)" : ""}
                              </span>
                            ))}
                          </p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
