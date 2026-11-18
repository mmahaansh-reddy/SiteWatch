import type { Metadata } from "next";

import { SiteHome } from "@/components/site/site-home";

export const metadata: Metadata = { title: "Site" };

export default function SiteHomePage() {
  return <SiteHome />;
}
