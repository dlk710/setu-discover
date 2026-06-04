import { readFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import pg from "pg";

const { Pool } = pg;

const databaseUrl =
  process.env.DATABASE_URL || "postgres://marga:marga@localhost:5435/marga";

function id(prefix) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const key = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${key}`;
}

async function waitForDb(pool, attempts = 30) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch (error) {
      if (i === attempts - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

const seedSources = [
  {
    id: "src_natpress",
    name: "National Science Press",
    canonical_domain: "nationalsciencepress.org",
    seed_url: "http://localhost:3004/phase2-fixtures/national-science-profile.html",
    credibility_tier: 1,
    notes: "Known editorial source for researcher features.",
  },
  {
    id: "src_global_awards",
    name: "Global Innovators Council",
    canonical_domain: "globalinnovators.org",
    seed_url: "http://localhost:3004/phase2-fixtures/global-innovators-awards.html",
    credibility_tier: 2,
    notes: "Recognized awards and fellowships across technical fields.",
  },
  {
    id: "src_industry_forum",
    name: "Industry Forum Review",
    canonical_domain: "industryforumreview.com",
    seed_url: "http://localhost:3004/phase2-fixtures/industry-forum-opportunities.html",
    credibility_tier: 2,
    notes: "Speaking and judging opportunities with domain review.",
  },
];

const seedEvents = [
  {
    id: "evt_research_press_profile",
    title: "Research Leadership Profile Series",
    category: "Press",
    fee_amount: null,
    fee_purpose: "",
    credibility_tier: 1,
    deadline: "2026-07-18",
    criteria_tags: ["Published Material", "Original Contributions"],
    keywords: ["AI safety", "research", "leadership"],
    field: "Artificial intelligence",
    location: "Remote",
    apply_url: "https://nationalsciencepress.org/profile-series/apply",
    source_url: "https://nationalsciencepress.org/profile-series",
    source_id: "src_natpress",
    summary: "Editorial feature for researchers with measurable public impact.",
    actionability: 4,
  },
  {
    id: "evt_innovation_awards",
    title: "Global Innovators 40 Under 40",
    category: "Awards",
    fee_amount: 150,
    fee_purpose: "Nomination processing",
    credibility_tier: 2,
    deadline: "2026-06-20",
    criteria_tags: ["Awards", "Original Contributions"],
    keywords: ["startup", "AI", "impact", "innovation"],
    field: "Technology",
    location: "United States",
    apply_url: "https://globalinnovators.org/40-under-40",
    source_url: "https://globalinnovators.org/awards",
    source_id: "src_global_awards",
    summary: "Juried award for technical founders and research operators.",
    actionability: 5,
  },
  {
    id: "evt_judging_panel",
    title: "Applied AI Product Awards Judging Panel",
    category: "Judging",
    fee_amount: 0,
    fee_purpose: "",
    credibility_tier: 2,
    deadline: "2026-08-09",
    criteria_tags: ["Judging", "Leading/Critical Role"],
    keywords: ["product", "AI", "peer review"],
    field: "Artificial intelligence",
    location: "Remote",
    apply_url: "https://industryforumreview.com/ai-awards/judges",
    source_url: "https://industryforumreview.com/ai-awards",
    source_id: "src_industry_forum",
    summary: "Reviewer panel for an industry-recognized AI product competition.",
    actionability: 4,
  },
  {
    id: "evt_speaking_summit",
    title: "Technical Leaders Summit Speaker CFP",
    category: "Speaking",
    fee_amount: 0,
    fee_purpose: "",
    credibility_tier: 2,
    deadline: null,
    criteria_tags: ["Leading/Critical Role", "Original Contributions"],
    keywords: ["cloud", "infrastructure", "leadership"],
    field: "Cloud infrastructure",
    location: "Chicago, IL",
    apply_url: "https://industryforumreview.com/summit/cfp",
    source_url: "https://industryforumreview.com/summit",
    source_id: "src_industry_forum",
    summary: "Rolling CFP for senior operators with infrastructure case studies.",
    actionability: 3,
  },
];

const seedClients = [
  {
    id: "cli_anika",
    name: "Anika Rao",
    email: "anika@example.com",
    field: "Artificial intelligence",
    location: "United States",
    target_criteria: [
      "Awards",
      "Published Material",
      "Judging",
      "Original Contributions",
      "Leading/Critical Role",
    ],
    covered_criteria: ["Original Contributions", "Leading/Critical Role"],
    keywords: ["AI safety", "research", "startup", "product"],
    preferred_categories: ["Awards", "Press", "Judging"],
    notes: "Strong research record; needs external press and judging proof.",
  },
  {
    id: "cli_marcus",
    name: "Marcus Lee",
    email: "marcus@example.com",
    field: "Cloud infrastructure",
    location: "Chicago, IL",
    target_criteria: [
      "Published Material",
      "Judging",
      "Original Contributions",
      "Leading/Critical Role",
    ],
    covered_criteria: ["Published Material"],
    keywords: ["cloud", "platform", "infrastructure", "reliability"],
    preferred_categories: ["Speaking", "Judging", "Press"],
    notes: "Needs leadership-facing opportunities that connect platform work to industry impact.",
  },
];

async function main() {
  const pool = new Pool({ connectionString: databaseUrl });
  await waitForDb(pool);
  const schema = await readFile(path.join(process.cwd(), "db/schema.sql"), "utf8");
  await pool.query(schema);

  const users = [
    {
      id: "usr_admin",
      name: "Setu Admin",
      email: "admin@marga.local",
      role: "admin",
    },
    {
      id: "usr_team",
      name: "Team Member",
      email: "teammate@marga.local",
      role: "team",
    },
  ];

  for (const user of users) {
    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role`,
      [user.id, user.name, user.email, hashPassword("marga123"), user.role],
    );
  }

  for (const source of seedSources) {
    await pool.query(
      `INSERT INTO sources (id, name, canonical_domain, seed_url, credibility_tier, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         canonical_domain = EXCLUDED.canonical_domain,
         seed_url = EXCLUDED.seed_url,
         credibility_tier = EXCLUDED.credibility_tier,
         notes = EXCLUDED.notes,
         refresh_enabled = TRUE,
         updated_at = now()`,
      [
        source.id,
        source.name,
        source.canonical_domain,
        source.seed_url,
        source.credibility_tier,
        source.notes,
      ],
    );

    await pool.query(
      `INSERT INTO source_pages (id, source_id, url, label)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (source_id, url) DO UPDATE SET
         label = EXCLUDED.label,
         status = 'active',
         updated_at = now()`,
      [`pg_${source.id.replace("src_", "")}`, source.id, source.seed_url, "Seed page"],
    );
  }

  for (const event of seedEvents) {
    await pool.query(
      `INSERT INTO events (
         id, title, category, fee_amount, fee_purpose, credibility_tier, deadline,
         criteria_tags, keywords, field, location, apply_url, source_url, source_id,
         summary, actionability
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::text[], $9::text[], $10, $11, $12, $13, $14, $15, $16)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         category = EXCLUDED.category,
         fee_amount = EXCLUDED.fee_amount,
         fee_purpose = EXCLUDED.fee_purpose,
         credibility_tier = EXCLUDED.credibility_tier,
         deadline = EXCLUDED.deadline,
         criteria_tags = EXCLUDED.criteria_tags,
         keywords = EXCLUDED.keywords,
         field = EXCLUDED.field,
         location = EXCLUDED.location,
         apply_url = EXCLUDED.apply_url,
         source_url = EXCLUDED.source_url,
         source_id = EXCLUDED.source_id,
         summary = EXCLUDED.summary,
         actionability = EXCLUDED.actionability,
         updated_at = now()`,
      [
        event.id,
        event.title,
        event.category,
        event.fee_amount,
        event.fee_purpose,
        event.credibility_tier,
        event.deadline,
        event.criteria_tags,
        event.keywords,
        event.field,
        event.location,
        event.apply_url,
        event.source_url,
        event.source_id,
        event.summary,
        event.actionability,
      ],
    );
  }

  for (const client of seedClients) {
    await pool.query(
      `INSERT INTO clients (
         id, name, email, field, location, target_criteria, covered_criteria,
         keywords, preferred_categories, notes
       )
       VALUES ($1, $2, $3, $4, $5, $6::text[], $7::text[], $8::text[], $9::text[], $10)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         email = EXCLUDED.email,
         field = EXCLUDED.field,
         location = EXCLUDED.location,
         target_criteria = EXCLUDED.target_criteria,
         covered_criteria = EXCLUDED.covered_criteria,
         keywords = EXCLUDED.keywords,
         preferred_categories = EXCLUDED.preferred_categories,
         notes = EXCLUDED.notes,
         updated_at = now()`,
      [
        client.id,
        client.name,
        client.email,
        client.field,
        client.location,
        client.target_criteria,
        client.covered_criteria,
        client.keywords,
        client.preferred_categories,
        client.notes,
      ],
    );
  }

  await pool.end();
  console.log(`SETU - DISCOVER database ready (${id("setup")}).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
