"use client";

import { useRouter } from "next/navigation";
import { Building2, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { homeFor } from "@/domain/permissions";
import { useHydrated } from "@/hooks/use-hydrated";
import { DEMO_PROJECTS, DEMO_USERS, ROLE_LABELS } from "@/lib/demo-identities";
import { initials } from "@/lib/utils";
import { useCurrentProject, useCurrentUser, useSession } from "@/stores/session";

export function ProjectSwitcher() {
  const project = useCurrentProject();
  const setCurrentProject = useSession((s) => s.setCurrentProject);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="max-w-[60vw] justify-start gap-2 px-2">
          <Building2 className="text-muted-foreground size-4" aria-hidden />
          <span className="truncate">{project.name}</span>
          <ChevronsUpDown className="text-muted-foreground size-3.5" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>Projects</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={project.id} onValueChange={setCurrentProject}>
          {DEMO_PROJECTS.map((p) => (
            <DropdownMenuRadioItem key={p.id} value={p.id}>
              <div className="flex flex-col">
                <span>{p.name}</span>
                <span className="text-muted-foreground text-xs">{p.location}</span>
              </div>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Demo login: pick who you are. Real authentication arrives with the backend
 * (README §5); permissions per role arrive in T5.
 */
export function UserSwitcher() {
  const user = useCurrentUser();
  const setCurrentUser = useSession((s) => s.setCurrentUser);
  const router = useRouter();
  const hydrated = useHydrated();

  function switchTo(id: string) {
    const next = DEMO_USERS.find((u) => u.id === id);
    if (!next) return;
    setCurrentUser(id);
    router.push(homeFor(next.role));
  }

  if (!hydrated) return <div className="bg-muted size-8 animate-pulse rounded-full" aria-hidden />;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 px-1.5" aria-label="Switch user">
          <span className="bg-primary/15 text-primary flex size-7 items-center justify-center rounded-full text-xs font-semibold">
            {initials(user.name)}
          </span>
          <span className="hidden flex-col items-start leading-tight md:flex">
            <span className="text-sm">{user.name}</span>
            <span className="text-muted-foreground text-xs">{ROLE_LABELS[user.role]}</span>
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Signed in as (demo)</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={user.id} onValueChange={switchTo}>
          {DEMO_USERS.map((u) => (
            <DropdownMenuRadioItem key={u.id} value={u.id}>
              <div className="flex flex-col">
                <span>{u.name}</span>
                <span className="text-muted-foreground text-xs">{ROLE_LABELS[u.role]}</span>
              </div>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
