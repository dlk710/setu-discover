import { notFound } from "next/navigation";
import { SetuDiscoverPortal } from "@/components/SetuDiscoverPortal";

const supportedSections = new Set([
  "dashboard",
  "inventory",
  "clients",
  "match-send",
  "matches",
  "email-log",
  "emails",
  "source-registry",
  "sources",
  "daily-refresh",
  "ingestion",
  "review-queue",
  "review",
]);

export default async function SectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;

  if (!supportedSections.has(section)) {
    notFound();
  }

  return <SetuDiscoverPortal />;
}
