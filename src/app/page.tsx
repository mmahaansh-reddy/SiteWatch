"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { homeFor } from "@/domain/permissions";
import { useCurrentUser } from "@/stores/session";

/** Send each role to its home: PM/Admin → dashboard, site roles → mobile site view. */
export default function Home() {
  const router = useRouter();
  const user = useCurrentUser();

  useEffect(() => {
    router.replace(homeFor(user.role));
  }, [router, user.role]);

  return null;
}
