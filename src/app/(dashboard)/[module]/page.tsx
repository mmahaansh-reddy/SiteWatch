import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ModulePlaceholder } from "@/components/layout/module-placeholder";
import { ALL_NAV_ITEMS, findNavItem } from "@/lib/nav";

/**
 * Placeholder route for modules not built yet. As each module ships, it gets its own
 * static folder (e.g. app/(dashboard)/schedule/page.tsx), which takes precedence over this route.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return ALL_NAV_ITEMS.filter((item) => item.slug !== "dashboard").map((item) => ({
    module: item.slug,
  }));
}

type Props = { params: Promise<{ module: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { module } = await params;
  return { title: findNavItem(module)?.label ?? "Not found" };
}

export default async function ModulePage({ params }: Props) {
  const { module } = await params;
  const item = findNavItem(module);
  if (!item) notFound();
  return <ModulePlaceholder item={item} />;
}
