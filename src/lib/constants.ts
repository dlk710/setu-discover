export const EVENT_CATEGORIES = [
  "Awards",
  "Press",
  "Speaking",
  "Judging",
  "Publications",
  "Memberships",
  "Exhibitions",
  "Grants",
] as const;

export const CRITERIA_TAGS = [
  "Awards",
  "Memberships",
  "Published Material",
  "Judging",
  "Original Contributions",
  "Scholarly Articles",
  "Exhibitions/Showcases",
  "Leading/Critical Role",
  "High Salary",
  "Commercial Success",
] as const;

export const STATUS_LABELS = [
  "Active",
  "Closing",
  "Rolling",
  "Expired",
  "Inactive",
] as const;

export const credibilityLabels: Record<number, string> = {
  1: "Tier 1",
  2: "Tier 2",
  3: "Tier 3",
};

export const sessionCookieName = "marga_session";
