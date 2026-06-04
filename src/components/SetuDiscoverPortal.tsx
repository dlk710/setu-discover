"use client";

import {
  Archive,
  ArrowUpRight,
  Award,
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  Database,
  Edit3,
  FileText,
  Globe,
  Inbox,
  ListChecks,
  LinkIcon,
  LogOut,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Users,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { statusTone } from "@/lib/status";
import type {
  AgentAlert,
  AgentDeadLetter,
  AgentRun,
  AgentStep,
  ClientRecord,
  EmailLog,
  EventRecord,
  IngestionItem,
  IngestionRun,
  MatchRecord,
  ReviewItem,
  Source,
  SourcePage,
  User,
} from "@/lib/types";

type AppState = {
  user: User;
  events: EventRecord[];
  clients: ClientRecord[];
  sources: Source[];
  sourcePages: SourcePage[];
  emailLogs: EmailLog[];
  ingestionRuns: IngestionRun[];
  ingestionItems: IngestionItem[];
  reviewItems: ReviewItem[];
  agentRuns: AgentRun[];
  agentSteps: AgentStep[];
  agentDeadLetters: AgentDeadLetter[];
  agentAlerts: AgentAlert[];
  eventCategories: string[];
  criteriaTags: string[];
};

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: Database },
  { id: "inventory", label: "Inventory", icon: Award },
  { id: "clients", label: "Clients", icon: Users },
  { id: "matches", label: "Match", icon: Sparkles },
  { id: "emails", label: "Emails", icon: Mail },
  { id: "sources", label: "Sources", icon: ShieldCheck },
  { id: "ingestion", label: "Ingestion", icon: RefreshCw },
  { id: "agent", label: "Agent", icon: Bot },
  { id: "review", label: "Review", icon: Clock3 },
] as const;

type TabId = (typeof navItems)[number]["id"];

type EventForm = {
  title: string;
  category: string;
  fee_amount: string;
  fee_currency: string;
  fee_purpose: string;
  credibility_tier: string;
  manual_status: string;
  deadline: string;
  criteria_tags: string;
  keywords: string;
  field: string;
  location: string;
  apply_url: string;
  source_url: string;
  source_id: string;
  summary: string;
  actionability: string;
  notes: string;
  archived: boolean;
};

type ClientForm = {
  name: string;
  email: string;
  field: string;
  location: string;
  target_criteria: string;
  covered_criteria: string;
  keywords: string;
  preferred_categories: string;
  notes: string;
};

type SourceForm = {
  name: string;
  canonical_domain: string;
  seed_url: string;
  credibility_tier: string;
  status: string;
  refresh_enabled: boolean;
  notes: string;
};

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error ?? response.statusText);
  }

  return response.json() as Promise<T>;
}

function listText(values: string[]) {
  return values.filter(Boolean).join(", ");
}

function money(event: EventRecord) {
  if (!event.fee_amount || Number(event.fee_amount) === 0) return "No fee";
  return `${event.fee_currency} ${Number(event.fee_amount).toLocaleString()}`;
}

function dateInputValue(value: string | null) {
  if (!value) return "";
  const parsed = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function deadlineText(value: string | null) {
  if (!value) return "Rolling";
  const parsed = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "Rolling";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function dateTimeText(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function emptyEventForm(categories: string[]): EventForm {
  return {
    title: "",
    category: categories[0] ?? "Awards",
    fee_amount: "",
    fee_currency: "USD",
    fee_purpose: "",
    credibility_tier: "2",
    manual_status: "active",
    deadline: "",
    criteria_tags: "",
    keywords: "",
    field: "",
    location: "",
    apply_url: "",
    source_url: "",
    source_id: "",
    summary: "",
    actionability: "3",
    notes: "",
    archived: false,
  };
}

function eventToForm(event: EventRecord): EventForm {
  return {
    title: event.title,
    category: event.category,
    fee_amount: event.fee_amount ?? "",
    fee_currency: event.fee_currency,
    fee_purpose: event.fee_purpose,
    credibility_tier: String(event.credibility_tier),
    manual_status: event.manual_status,
    deadline: dateInputValue(event.deadline),
    criteria_tags: listText(event.criteria_tags),
    keywords: listText(event.keywords),
    field: event.field,
    location: event.location,
    apply_url: event.apply_url,
    source_url: event.source_url,
    source_id: event.source_id ?? "",
    summary: event.summary,
    actionability: String(event.actionability),
    notes: event.notes,
    archived: event.archived,
  };
}

function emptyClientForm(): ClientForm {
  return {
    name: "",
    email: "",
    field: "",
    location: "",
    target_criteria: "",
    covered_criteria: "",
    keywords: "",
    preferred_categories: "",
    notes: "",
  };
}

function emptySourceForm(): SourceForm {
  return {
    name: "",
    canonical_domain: "",
    seed_url: "",
    credibility_tier: "2",
    status: "active",
    refresh_enabled: true,
    notes: "",
  };
}

function sourceToForm(source: Source): SourceForm {
  return {
    name: source.name,
    canonical_domain: source.canonical_domain,
    seed_url: source.seed_url,
    credibility_tier: String(source.credibility_tier),
    status: source.status,
    refresh_enabled: source.refresh_enabled,
    notes: source.notes,
  };
}

function clientToForm(client: ClientRecord): ClientForm {
  return {
    name: client.name,
    email: client.email,
    field: client.field,
    location: client.location,
    target_criteria: listText(client.target_criteria),
    covered_criteria: listText(client.covered_criteria),
    keywords: listText(client.keywords),
    preferred_categories: listText(client.preferred_categories),
    notes: client.notes,
  };
}

function StatusPill({ status }: { status: string }) {
  return <span className={`pill ${statusTone(status)}`}>{status}</span>;
}

export function SetuDiscoverPortal() {
  const [state, setState] = useState<AppState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState("");
  const [toast, setToast] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [inventorySearch, setInventorySearch] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [eventModal, setEventModal] = useState<{ event?: EventRecord } | null>(null);
  const [clientModal, setClientModal] = useState<{ client?: ClientRecord } | null>(null);
  const [sourceModal, setSourceModal] = useState<{ source?: Source } | null>(null);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [ingestionRunning, setIngestionRunning] = useState(false);
  const [agentRunning, setAgentRunning] = useState(false);
  const [emailModal, setEmailModal] = useState<{
    match: MatchRecord;
    client: ClientRecord;
  } | null>(null);

  const refresh = async () => {
    try {
      const nextState = await requestJson<AppState>("/api/state");
      setState(nextState);
      setSelectedClientId((current) => current || nextState.clients[0]?.id || "");
    } catch {
      setState(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    if (!selectedClientId) {
      setMatches([]);
      return;
    }

    let cancelled = false;
    setMatchesLoading(true);
    requestJson<{ matches: MatchRecord[] }>(`/api/matches?clientId=${selectedClientId}`)
      .then((payload) => {
        if (!cancelled) setMatches(payload.matches);
      })
      .catch(() => {
        if (!cancelled) setMatches([]);
      })
      .finally(() => {
        if (!cancelled) setMatchesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedClientId, state?.events.length, state?.clients.length]);

  const metrics = useMemo(() => {
    const events = state?.events ?? [];
    return {
      active: events.filter((event) => event.derived_status === "Active").length,
      closing: events.filter((event) => event.derived_status === "Closing").length,
      rolling: events.filter((event) => event.derived_status === "Rolling").length,
      clients: state?.clients.length ?? 0,
    };
  }, [state]);

  const filteredEvents = useMemo(() => {
    const query = inventorySearch.toLowerCase();
    return (state?.events ?? []).filter((event) =>
      [event.title, event.category, event.field, event.location, event.summary]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [state, inventorySearch]);

  const filteredClients = useMemo(() => {
    const query = clientSearch.toLowerCase();
    return (state?.clients ?? []).filter((client) =>
      [client.name, client.email, client.field, client.location, client.notes]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [state, clientSearch]);

  const selectedClient = useMemo(
    () => state?.clients.find((client) => client.id === selectedClientId) ?? null,
    [state, selectedClientId],
  );

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoginError("");

    try {
      await requestJson<{ user: User }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      await refresh();
      showToast("Signed in");
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Could not sign in");
    }
  };

  const logout = async () => {
    await requestJson("/api/auth/logout", { method: "POST" });
    setState(null);
    showToast("Signed out");
  };

  if (loading) {
    return <div className="empty">Loading SETU - DISCOVER...</div>;
  }

  if (!state) {
    return <LoginShell onLogin={login} error={loginError} />;
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo-wrap">
          <div className="wordmark">
            <span className="letters">SETU</span>
            <span className="brand-sub">DISCOVER</span>
            <span className="deck" />
          </div>
        </div>
        <div className="nav-label">Operate</div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              className={`nav-item ${activeTab === item.id ? "active" : ""}`}
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              type="button"
            >
              <Icon size={16} />
              {item.label}
              {item.id === "inventory" ? <span className="badge">{state.events.length}</span> : null}
              {item.id === "clients" ? <span className="badge">{state.clients.length}</span> : null}
              {item.id === "review" ? <span className="badge">{state.reviewItems.filter((review) => review.status === "open").length}</span> : null}
              {item.id === "agent" ? <span className="badge">{state.agentRuns.length}</span> : null}
            </button>
          );
        })}
        <div className="sidebar-foot">
          <div className="chip">
            <CheckCircle2 size={14} />
            Discover
          </div>
          <div style={{ marginTop: 8 }}>{state.user.name}</div>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div>
            <h1>{topbarTitle(activeTab)}</h1>
            <div className="sub">{topbarSubtitle(activeTab)}</div>
          </div>
          <div className="topbar-right">
            <span className="chip">
              <Database size={14} />
              Postgres
            </span>
            <button className="btn btn-ghost" type="button" onClick={logout}>
              <LogOut size={15} />
              Sign out
            </button>
          </div>
        </div>

        <div className="content">
          {activeTab === "dashboard" ? (
            <DashboardView
              metrics={metrics}
              events={state.events}
              matches={matches}
              selectedClient={selectedClient}
              onGoInventory={() => setActiveTab("inventory")}
              onGoMatch={() => setActiveTab("matches")}
            />
          ) : null}

          {activeTab === "inventory" ? (
            <InventoryView
              events={filteredEvents}
              sources={state.sources}
              query={inventorySearch}
              onQuery={setInventorySearch}
              onNew={() => setEventModal({})}
              onEdit={(event) => setEventModal({ event })}
              onArchive={async (event) => {
                await requestJson(`/api/events/${event.id}`, { method: "DELETE" });
                await refresh();
                showToast("Opportunity archived");
              }}
            />
          ) : null}

          {activeTab === "clients" ? (
            <ClientsView
              clients={filteredClients}
              query={clientSearch}
              onQuery={setClientSearch}
              onNew={() => setClientModal({})}
              onEdit={(client) => setClientModal({ client })}
              onDelete={async (client) => {
                await requestJson(`/api/clients/${client.id}`, { method: "DELETE" });
                await refresh();
                showToast("Client removed");
              }}
            />
          ) : null}

          {activeTab === "matches" ? (
            <MatchesView
              clients={state.clients}
              selectedClientId={selectedClientId}
              selectedClient={selectedClient}
              matches={matches}
              loading={matchesLoading}
              onSelectClient={setSelectedClientId}
              onCompose={(match, client) => setEmailModal({ match, client })}
            />
          ) : null}

          {activeTab === "emails" ? <EmailLogView logs={state.emailLogs} /> : null}
          {activeTab === "sources" ? (
            <SourcesView
              sources={state.sources}
              sourcePages={state.sourcePages}
              onNew={() => setSourceModal({})}
              onEdit={(source) => setSourceModal({ source })}
            />
          ) : null}
          {activeTab === "ingestion" ? (
            <IngestionView
              runs={state.ingestionRuns}
              items={state.ingestionItems}
              running={ingestionRunning}
              onRun={async () => {
                setIngestionRunning(true);
                try {
                  const result = await requestJson<{ run: IngestionRun }>("/api/ingestion/run", {
                    method: "POST",
                    body: JSON.stringify({ mode: "manual" }),
                  });
                  await refresh();
                  showToast(result.run.status === "completed" ? "Phase 2 ingestion completed" : "Phase 2 ingestion failed");
                } catch (error) {
                  showToast(error instanceof Error ? error.message : "Phase 2 ingestion failed");
                } finally {
                  setIngestionRunning(false);
                }
              }}
            />
          ) : null}
          {activeTab === "review" ? (
            <ReviewQueueView
              items={state.reviewItems}
              onStatus={async (item, status) => {
                await requestJson(`/api/review-items/${item.id}`, {
                  method: "PUT",
                  body: JSON.stringify({ status }),
                });
                await refresh();
                showToast(`Review item marked ${status}`);
              }}
            />
          ) : null}
          {activeTab === "agent" ? (
            <AgentView
              runs={state.agentRuns}
              steps={state.agentSteps}
              deadLetters={state.agentDeadLetters}
              alerts={state.agentAlerts}
              running={agentRunning}
              onRun={async () => {
                setAgentRunning(true);
                try {
                  const result = await requestJson<{ run: AgentRun }>("/api/agent/run", {
                    method: "POST",
                    body: JSON.stringify({ mode: "manual" }),
                  });
                  await refresh();
                  showToast(result.run.status === "completed" ? "Phase 3 agent completed" : "Phase 3 agent failed");
                } catch (error) {
                  showToast(error instanceof Error ? error.message : "Phase 3 agent failed");
                } finally {
                  setAgentRunning(false);
                }
              }}
            />
          ) : null}
        </div>
      </main>

      {eventModal ? (
        <EventModal
          categories={state.eventCategories}
          criteriaTags={state.criteriaTags}
          sources={state.sources}
          event={eventModal.event}
          onClose={() => setEventModal(null)}
          onSave={async (form) => {
            const url = eventModal.event ? `/api/events/${eventModal.event.id}` : "/api/events";
            await requestJson(url, {
              method: eventModal.event ? "PUT" : "POST",
              body: JSON.stringify(form),
            });
            setEventModal(null);
            await refresh();
            showToast("Inventory saved");
          }}
        />
      ) : null}

      {clientModal ? (
        <ClientModal
          client={clientModal.client}
          onClose={() => setClientModal(null)}
          onSave={async (form) => {
            const url = clientModal.client ? `/api/clients/${clientModal.client.id}` : "/api/clients";
            await requestJson(url, {
              method: clientModal.client ? "PUT" : "POST",
              body: JSON.stringify(form),
            });
            setClientModal(null);
            await refresh();
            showToast("Client saved");
          }}
        />
      ) : null}

      {emailModal ? (
        <EmailModal
          client={emailModal.client}
          match={emailModal.match}
          onClose={() => setEmailModal(null)}
          onSent={async (payload) => {
            const result = await requestJson<{ status: string }>("/api/email/send", {
              method: "POST",
              body: JSON.stringify(payload),
            });
            setEmailModal(null);
            await refresh();
            showToast(result.status === "sent" ? "Email sent" : "Email logged locally");
          }}
        />
      ) : null}

      {sourceModal ? (
        <SourceModal
          source={sourceModal.source}
          onClose={() => setSourceModal(null)}
          onSave={async (form) => {
            const url = sourceModal.source ? `/api/sources/${sourceModal.source.id}` : "/api/sources";
            await requestJson(url, {
              method: sourceModal.source ? "PUT" : "POST",
              body: JSON.stringify(form),
            });
            setSourceModal(null);
            await refresh();
            showToast("Source registry saved");
          }}
        />
      ) : null}

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}

function LoginShell({
  onLogin,
  error,
}: {
  onLogin: (event: FormEvent<HTMLFormElement>) => void;
  error: string;
}) {
  return (
    <div className="auth-shell">
      <div className="auth-grid">
        <section className="auth-hero">
          <div className="auth-kicker">SETU profile build</div>
          <h1>SETU - DISCOVER</h1>
          <p className="auth-copy">
            Inventory, client profile coverage, transparent matching, and team email logging on a local database.
          </p>
          <div className="auth-points">
            <div className="auth-point">
              <Database size={18} />
              Real Postgres records for the discovery system of record.
            </div>
            <div className="auth-point">
              <Sparkles size={18} />
              Deterministic matching with score evidence kept visible.
            </div>
            <div className="auth-point">
              <Mail size={18} />
              Email workflow with local review fallback when SMTP is unset.
            </div>
          </div>
        </section>
        <form className="auth-card" onSubmit={onLogin}>
          <div className="card-label">Team login</div>
          <h2>Sign in</h2>
          <p className="auth-note">Use the local review account for SETU - DISCOVER.</p>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" defaultValue="admin@marga.local" />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" defaultValue="marga123" />
          </div>
          {error ? <div className="pill danger">{error}</div> : null}
          <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 14 }} type="submit">
            <ShieldCheck size={15} />
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}

function DashboardView({
  metrics,
  events,
  matches,
  selectedClient,
  onGoInventory,
  onGoMatch,
}: {
  metrics: { active: number; closing: number; rolling: number; clients: number };
  events: EventRecord[];
  matches: MatchRecord[];
  selectedClient: ClientRecord | null;
  onGoInventory: () => void;
  onGoMatch: () => void;
}) {
  const attention = events
    .filter((event) => event.derived_status === "Closing")
    .slice(0, 5);

  return (
    <>
      <div className="metrics">
        <Metric label="Active inventory" value={metrics.active} icon={<Award size={15} />} accent />
        <Metric label="Closing soon" value={metrics.closing} icon={<Inbox size={15} />} />
        <Metric label="Rolling" value={metrics.rolling} icon={<BriefcaseBusiness size={15} />} />
        <Metric label="Clients" value={metrics.clients} icon={<Users size={15} />} />
      </div>

      <div className="two-col">
        <section className="section">
          <div className="section-head">
            <h2>Deadline attention</h2>
            <button className="btn btn-ghost" type="button" onClick={onGoInventory}>
              <ArrowUpRight size={15} />
              Open inventory
            </button>
          </div>
          <div className="card">
            {attention.length ? (
              attention.map((event) => (
                <div className="trow inventory-grid" key={event.id}>
                  <div>
                    <button className="name-button" type="button" onClick={onGoInventory}>
                      {event.title}
                    </button>
                    <div className="sub">{event.summary}</div>
                  </div>
                  <span>{event.category}</span>
                  <span className="mono">{money(event)}</span>
                  <span className="pill">T{event.credibility_tier}</span>
                  <StatusPill status={event.derived_status} />
                  <span className="mono">{deadlineText(event.deadline)}</span>
                  <span />
                </div>
              ))
            ) : (
              <div className="empty">No closing deadlines.</div>
            )}
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Current match queue</h2>
            <button className="btn btn-ghost" type="button" onClick={onGoMatch}>
              <Sparkles size={15} />
              Match
            </button>
          </div>
          <div className="card">
            {selectedClient ? (
              <div className="detail-banner">
                <div>
                  <div className="card-label">Selected client</div>
                  <h2 style={{ margin: "4px 0 2px", fontSize: 20 }}>{selectedClient.name}</h2>
                  <div className="sub">{selectedClient.field} · {selectedClient.location}</div>
                </div>
                <span className="chip">{matches.length} candidates</span>
              </div>
            ) : (
              <div className="empty">Add a client to start matching.</div>
            )}
            {matches.slice(0, 3).map((match) => (
              <div className="trow match-grid" key={match.event.id}>
                <div>
                  <div className="cust">{match.event.title}</div>
                  <div className="sub">{match.event.summary}</div>
                </div>
                <span className="score">{match.score}</span>
                <span className="sub">{match.breakdown.missingCriteria.join(", ") || "general fit"}</span>
                <span className="sub">{match.breakdown.matchedKeywords.slice(0, 3).join(", ") || "low keyword overlap"}</span>
                <span className="pill">T{match.event.credibility_tier}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function Metric({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className={`metric ${accent ? "accent" : ""}`}>
      <div className="label">
        {icon}
        {label}
      </div>
      <div className="value">{value}</div>
      <div className="delta">SETU - DISCOVER record</div>
    </div>
  );
}

function InventoryView({
  events,
  sources,
  query,
  onQuery,
  onNew,
  onEdit,
  onArchive,
}: {
  events: EventRecord[];
  sources: Source[];
  query: string;
  onQuery: (value: string) => void;
  onNew: () => void;
  onEdit: (event: EventRecord) => void;
  onArchive: (event: EventRecord) => void;
}) {
  return (
    <section className="section">
      <div className="section-head">
        <h2>Inventory</h2>
        <button className="btn btn-primary" type="button" onClick={onNew}>
          <Plus size={15} />
          Opportunity
        </button>
      </div>
      <div className="toolbar">
        <Search size={16} color="var(--text-3)" />
        <input
          className="search-input"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Search inventory"
        />
        <span className="chip">{events.length} records</span>
        <span className="chip">{sources.length} sources</span>
      </div>
      <div className="card sheet-wrap">
        <div className="sheet">
          <div className="trow head inventory-grid">
            <span>Opportunity</span>
            <span>Category</span>
            <span>Fee</span>
            <span>Credibility</span>
            <span>Status</span>
            <span>Deadline / source</span>
            <span>Actions</span>
          </div>
          {events.map((event) => (
            <div className="trow inventory-grid" key={event.id}>
              <div>
                <button className="name-button" type="button" onClick={() => onEdit(event)}>
                  {event.title}
                </button>
                <div className="sub">{event.summary}</div>
                <div className="tag-cloud" style={{ marginTop: 6 }}>
                  {event.criteria_tags.slice(0, 3).map((tag) => (
                    <span className="pill" key={tag}>{tag}</span>
                  ))}
                </div>
                <SummaryActionRow
                  applyUrl={event.apply_url}
                  onDetails={() => onEdit(event)}
                />
              </div>
              <span>{event.category}</span>
              <span className="mono">{money(event)}</span>
              <span className="pill">Tier {event.credibility_tier}</span>
              <StatusPill status={event.derived_status} />
              <div>
                <div className="mono">{deadlineText(event.deadline)}</div>
                <div className="sub">{event.source_name ?? event.source_url}</div>
              </div>
              <div className="tag-cloud">
                <button className="btn btn-ghost" type="button" onClick={() => onEdit(event)} title="Edit">
                  <Edit3 size={15} />
                </button>
                <button className="btn btn-ghost btn-danger" type="button" onClick={() => onArchive(event)} title="Archive">
                  <Archive size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ClientsView({
  clients,
  query,
  onQuery,
  onNew,
  onEdit,
  onDelete,
}: {
  clients: ClientRecord[];
  query: string;
  onQuery: (value: string) => void;
  onNew: () => void;
  onEdit: (client: ClientRecord) => void;
  onDelete: (client: ClientRecord) => void;
}) {
  return (
    <section className="section">
      <div className="section-head">
        <h2>Client profiles</h2>
        <button className="btn btn-primary" type="button" onClick={onNew}>
          <Plus size={15} />
          Client
        </button>
      </div>
      <div className="toolbar">
        <Search size={16} color="var(--text-3)" />
        <input
          className="search-input"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Search clients"
        />
        <span className="chip">{clients.length} profiles</span>
      </div>
      <div className="card sheet-wrap">
        <div className="sheet">
          <div className="trow head client-grid">
            <span>Client</span>
            <span>Field</span>
            <span>Location</span>
            <span>Gap criteria</span>
            <span>Keywords</span>
            <span>Actions</span>
          </div>
          {clients.map((client) => {
            const covered = new Set(client.covered_criteria.map((item) => item.toLowerCase()));
            const gaps = client.target_criteria.filter((item) => !covered.has(item.toLowerCase()));
            return (
              <div className="trow client-grid" key={client.id}>
                <div>
                  <button className="name-button" type="button" onClick={() => onEdit(client)}>
                    {client.name}
                  </button>
                  <div className="sub">{client.email}</div>
                </div>
                <span>{client.field}</span>
                <span>{client.location}</span>
                <span className="sub">{gaps.join(", ") || "Covered"}</span>
                <span className="sub">{client.keywords.slice(0, 4).join(", ")}</span>
                <div className="tag-cloud">
                  <button className="btn btn-ghost" type="button" onClick={() => onEdit(client)} title="Edit">
                    <Edit3 size={15} />
                  </button>
                  <button className="btn btn-ghost btn-danger" type="button" onClick={() => onDelete(client)} title="Delete">
                    <X size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function MatchesView({
  clients,
  selectedClientId,
  selectedClient,
  matches,
  loading,
  onSelectClient,
  onCompose,
}: {
  clients: ClientRecord[];
  selectedClientId: string;
  selectedClient: ClientRecord | null;
  matches: MatchRecord[];
  loading: boolean;
  onSelectClient: (clientId: string) => void;
  onCompose: (match: MatchRecord, client: ClientRecord) => void;
}) {
  return (
    <section className="section">
      <div className="section-head">
        <h2>Matching v1</h2>
        <span className="chip">
          <Sparkles size={14} />
          Transparent heuristic
        </span>
      </div>
      <div className="toolbar">
        <select className="search-input" value={selectedClientId} onChange={(event) => onSelectClient(event.target.value)}>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>{client.name}</option>
          ))}
        </select>
      </div>
      {selectedClient ? (
        <div className="detail-banner" style={{ marginBottom: 14 }}>
          <div>
            <div className="card-label">Client criteria gap</div>
            <h2 style={{ margin: "4px 0 2px", fontSize: 20 }}>{selectedClient.name}</h2>
            <div className="sub">{selectedClient.target_criteria.join(", ")}</div>
          </div>
          <span className="chip">{selectedClient.covered_criteria.length} covered</span>
        </div>
      ) : null}
      <div className="card sheet-wrap">
        <div className="sheet">
          <div className="trow head match-grid">
            <span>Opportunity</span>
            <span>Score</span>
            <span>Gap fit</span>
            <span>Keywords / flags</span>
            <span>Send</span>
          </div>
          {loading ? <div className="empty">Computing matches...</div> : null}
          {!loading && matches.length === 0 ? <div className="empty">No active matches yet.</div> : null}
          {matches.map((match) => (
            <div className="trow match-grid match-row" key={match.event.id}>
              <div>
                <div className="cust">{match.event.title}</div>
                <div className="sub">{match.event.summary}</div>
              </div>
              <span className="score">{match.score}</span>
              <span className="sub">{match.breakdown.missingCriteria.join(", ") || "General profile fit"}</span>
              <div>
                <div className="sub">{match.breakdown.matchedKeywords.slice(0, 5).join(", ") || "No exact keyword hit"}</div>
                <div className="tag-cloud" style={{ marginTop: 6 }}>
                  {match.breakdown.flags.map((flag) => (
                    <span className="pill warn" key={flag}>{flag}</span>
                  ))}
                </div>
              </div>
              <button
                className="btn btn-primary send-action"
                type="button"
                disabled={!selectedClient}
                onClick={() => selectedClient && onCompose(match, selectedClient)}
              >
                <Send size={16} strokeWidth={1.9} />
                Email
              </button>
              <div className="match-breakdown-strip">
                <BreakdownItem label="Gap" value={match.breakdown.criterionGap} />
                <BreakdownItem label="Credibility" value={match.breakdown.credibility} />
                <BreakdownItem label="Keyword" value={match.breakdown.keyword} />
                <BreakdownItem label="Action" value={match.breakdown.actionability} />
                <BreakdownItem label="Place" value={match.breakdown.location} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BreakdownItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="breakdown-item">
      <div className="breakdown-label">{label}</div>
      <div className="breakdown-value">{value}</div>
    </div>
  );
}

function EmailLogView({ logs }: { logs: EmailLog[] }) {
  return (
    <section className="section">
      <div className="section-head">
        <h2>Email log</h2>
        <span className="chip">{logs.length} logged</span>
      </div>
      <div className="card sheet-wrap">
        <div className="sheet">
          <div className="trow head email-grid">
            <span>Time</span>
            <span>Client</span>
            <span>Opportunity</span>
            <span>Subject</span>
            <span>Status</span>
          </div>
          {logs.map((log) => (
            <div className="trow email-grid" key={log.id}>
              <span className="mono">{dateTimeText(log.created_at)}</span>
              <span>{log.client_name ?? log.to_email}</span>
              <span className="sub">{log.event_title ?? "General"}</span>
              <span>{log.subject}</span>
              <span className={`pill ${log.provider_status === "sent" ? "success" : "ink"}`}>{log.provider_status}</span>
            </div>
          ))}
          {!logs.length ? <div className="empty">No email attempts logged yet.</div> : null}
        </div>
      </div>
    </section>
  );
}

function optionalDateTime(value: string | null) {
  return value ? dateTimeText(value) : "Never";
}

function confidenceText(value: string | number | null) {
  if (value === null || value === "") return "n/a";
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return "n/a";
  return `${Math.round(numeric * 100)}%`;
}

function SourcesView({
  sources,
  sourcePages,
  onNew,
  onEdit,
}: {
  sources: Source[];
  sourcePages: SourcePage[];
  onNew: () => void;
  onEdit: (source: Source) => void;
}) {
  const enabledCount = sources.filter((source) => source.refresh_enabled && source.status === "active").length;

  return (
    <>
      <section className="section">
        <div className="section-head">
          <h2>Source registry</h2>
          <button className="btn btn-primary" type="button" onClick={onNew}>
            <Plus size={15} />
            Source
          </button>
        </div>
        <div className="toolbar">
          <span className="chip">
            <ShieldCheck size={14} />
            {sources.length} sources
          </span>
          <span className="chip">
            <RefreshCw size={14} />
            {enabledCount} refreshable
          </span>
          <span className="chip">
            <Globe size={14} />
            {sourcePages.length} pages
          </span>
        </div>
        <div className="card sheet-wrap">
          <div className="sheet">
            <div className="trow head source-grid">
              <span>Source</span>
              <span>Domain</span>
              <span>Seed page</span>
              <span>Tier</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            {sources.map((source) => (
              <div className="trow source-grid" key={source.id}>
                <div>
                  <button className="name-button" type="button" onClick={() => onEdit(source)}>
                    {source.name}
                  </button>
                  <div className="sub">{source.notes || "No notes"}</div>
                </div>
                <span className="mono">{source.canonical_domain}</span>
                <div>
                  {source.seed_url ? (
                    <a className="inline-link" href={source.seed_url} target="_blank" rel="noreferrer">
                      <LinkIcon size={13} />
                      Open seed
                    </a>
                  ) : (
                    <span className="sub">No seed</span>
                  )}
                </div>
                <span className="pill">Tier {source.credibility_tier}</span>
                <div className="tag-cloud">
                  <span className={`pill ${source.status === "active" ? "success" : "danger"}`}>
                    {source.status}
                  </span>
                  <span className={`pill ${source.refresh_enabled ? "ink" : ""}`}>
                    {source.refresh_enabled ? "refresh on" : "paused"}
                  </span>
                </div>
                <button className="btn btn-ghost" type="button" onClick={() => onEdit(source)} title="Edit source">
                  <Edit3 size={15} />
                  Edit
                </button>
              </div>
            ))}
            {!sources.length ? <div className="empty">No sources configured yet.</div> : null}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Page monitor</h2>
          <span className="chip">Change detection</span>
        </div>
        <div className="card sheet-wrap">
          <div className="sheet">
            <div className="trow head source-page-grid">
              <span>Page</span>
              <span>Source</span>
              <span>Fetched</span>
              <span>Changed</span>
              <span>Status</span>
              <span>Link</span>
            </div>
            {sourcePages.map((page) => (
              <div className="trow source-page-grid" key={page.id}>
                <div>
                  <div className="cust">{page.label || "Seed page"}</div>
                  <div className="sub">{page.url}</div>
                </div>
                <span>{page.source_name ?? page.source_id}</span>
                <span className="mono">{optionalDateTime(page.last_fetched_at)}</span>
                <span className="mono">{optionalDateTime(page.last_changed_at)}</span>
                <span className={`pill ${page.status === "active" ? "success" : "danger"}`}>{page.status}</span>
                <a className="btn btn-link" href={page.url} target="_blank" rel="noreferrer">
                  <ArrowUpRight size={15} />
                  Open
                </a>
              </div>
            ))}
            {!sourcePages.length ? <div className="empty">No source pages configured yet.</div> : null}
          </div>
        </div>
      </section>
    </>
  );
}

function IngestionView({
  runs,
  items,
  running,
  onRun,
}: {
  runs: IngestionRun[];
  items: IngestionItem[];
  running: boolean;
  onRun: () => Promise<void>;
}) {
  const latest = runs[0];

  return (
    <>
      <section className="section">
        <div className="section-head">
          <h2>Phase 2 ingestion</h2>
          <button className="btn btn-primary" type="button" disabled={running} onClick={() => void onRun()}>
            <RefreshCw size={15} />
            {running ? "Running" : "Run now"}
          </button>
        </div>
        <div className="detail-banner phase2-banner">
          <div>
            <div className="card-label">Latest run</div>
            <h2>{latest ? latest.status : "Not run yet"}</h2>
            <div className="sub">
              {latest
                ? `${latest.pages_checked} checked, ${latest.pages_changed} changed, ${latest.events_upserted} opportunities upserted`
                : "Run Phase 2 to fetch source pages, detect changes, extract opportunities, and refresh matches."}
            </div>
          </div>
          <div className="phase2-stats">
            <span className="chip">{latest ? `${latest.low_confidence_count} review` : "0 review"}</span>
            <span className="chip">{latest ? `${latest.expired_purged} expired` : "0 expired"}</span>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Run history</h2>
          <span className="chip">{runs.length} runs</span>
        </div>
        <div className="card sheet-wrap">
          <div className="sheet">
            <div className="trow head run-grid">
              <span>Started</span>
              <span>Status</span>
              <span>Mode</span>
              <span>Pages</span>
              <span>Changed</span>
              <span>Events</span>
              <span>Review</span>
              <span>Error</span>
            </div>
            {runs.map((run) => (
              <div className="trow run-grid" key={run.id}>
                <span className="mono">{dateTimeText(run.started_at)}</span>
                <span className={`pill ${run.status === "completed" ? "success" : run.status === "failed" ? "danger" : "ink"}`}>
                  {run.status}
                </span>
                <span>{run.mode}</span>
                <span className="mono">{run.pages_checked}</span>
                <span className="mono">{run.pages_changed}</span>
                <span className="mono">{run.events_upserted}</span>
                <span className="mono">{run.low_confidence_count}</span>
                <span className="sub">{run.error || run.notes}</span>
              </div>
            ))}
            {!runs.length ? <div className="empty">No ingestion runs yet.</div> : null}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Extraction report</h2>
          <span className="chip">{items.length} items</span>
        </div>
        <div className="card sheet-wrap">
          <div className="sheet">
            <div className="trow head ingestion-item-grid">
              <span>Page</span>
              <span>Change</span>
              <span>Extraction</span>
              <span>Confidence</span>
              <span>Summary</span>
              <span>Created</span>
            </div>
            {items.map((item) => (
              <div className="trow ingestion-item-grid" key={item.id}>
                <div>
                  <a className="inline-link" href={item.page_url} target="_blank" rel="noreferrer">
                    <LinkIcon size={13} />
                    Source page
                  </a>
                  <div className="sub">{item.page_url}</div>
                </div>
                <span className="pill">{item.change_status}</span>
                <span className={`pill ${item.extraction_status === "upserted" ? "success" : item.extraction_status === "skipped" ? "ink" : ""}`}>
                  {item.extraction_status}
                </span>
                <span className="mono">{confidenceText(item.confidence)}</span>
                <span className="sub">{item.error || item.summary || "No summary"}</span>
                <span className="mono">{dateTimeText(item.created_at)}</span>
              </div>
            ))}
            {!items.length ? <div className="empty">No extraction items yet.</div> : null}
          </div>
        </div>
      </section>
    </>
  );
}

function AgentView({
  runs,
  steps,
  deadLetters,
  alerts,
  running,
  onRun,
}: {
  runs: AgentRun[];
  steps: AgentStep[];
  deadLetters: AgentDeadLetter[];
  alerts: AgentAlert[];
  running: boolean;
  onRun: () => Promise<void>;
}) {
  const latest = runs[0];
  const openAlerts = alerts.filter((alert) => alert.status === "open").length;
  const openDeadLetters = deadLetters.filter((item) => item.status === "open").length;

  return (
    <>
      <section className="section">
        <div className="section-head">
          <h2>Phase 3 agent</h2>
          <button className="btn btn-primary" type="button" disabled={running} onClick={() => void onRun()}>
            <Bot size={15} />
            {running ? "Running" : "Run agent"}
          </button>
        </div>
        <div className="detail-banner phase2-banner">
          <div>
            <div className="card-label">Latest graph run</div>
            <h2>{latest ? latest.status : "Not run yet"}</h2>
            <div className="sub">
              {latest
                ? `${latest.pages_checked} checked, ${latest.pages_discovered} discovered, ${latest.interruptions} review interrupts, ${latest.events_upserted} upserted`
                : "LangGraph scout, extractor, classifier, review interrupt, and persistence nodes are ready."}
            </div>
          </div>
          <div className="phase2-stats">
            <span className="chip">
              <ListChecks size={14} />
              {steps.length} traces
            </span>
            <span className="chip">
              <TriangleAlert size={14} />
              {openAlerts} alerts
            </span>
            <span className="chip">{openDeadLetters} dead letters</span>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Agent run history</h2>
          <span className="chip">{runs.length} runs</span>
        </div>
        <div className="card sheet-wrap">
          <div className="sheet">
            <div className="trow head agent-run-grid">
              <span>Started</span>
              <span>Status</span>
              <span>Pages</span>
              <span>Discovered</span>
              <span>Interrupts</span>
              <span>Upserts</span>
              <span>Retries</span>
              <span>Notes</span>
            </div>
            {runs.map((run) => (
              <div className="trow agent-run-grid" key={run.id}>
                <span className="mono">{dateTimeText(run.started_at)}</span>
                <span className={`pill ${run.status === "completed" ? "success" : run.status === "failed" ? "danger" : "ink"}`}>
                  {run.status}
                </span>
                <span className="mono">{run.pages_checked}</span>
                <span className="mono">{run.pages_discovered}</span>
                <span className="mono">{run.interruptions}</span>
                <span className="mono">{run.events_upserted}</span>
                <span className="mono">{run.retries}</span>
                <span className="sub">{run.error || run.notes}</span>
              </div>
            ))}
            {!runs.length ? <div className="empty">No agent runs yet.</div> : null}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Graph traces</h2>
          <span className="chip">{steps.length} steps</span>
        </div>
        <div className="card sheet-wrap">
          <div className="sheet">
            <div className="trow head agent-step-grid">
              <span>Time</span>
              <span>Node</span>
              <span>Status</span>
              <span>Output</span>
              <span>Decision</span>
            </div>
            {steps.map((step) => (
              <div className="trow agent-step-grid" key={step.id}>
                <span className="mono">{dateTimeText(step.created_at)}</span>
                <span className="cust">{step.node_name}</span>
                <span className={`pill ${step.status === "failed" ? "danger" : "success"}`}>{step.status}</span>
                <span className="sub">{step.output_summary}</span>
                <span className="sub">{JSON.stringify(step.decision)}</span>
              </div>
            ))}
            {!steps.length ? <div className="empty">No graph traces yet.</div> : null}
          </div>
        </div>
      </section>

      <div className="two-col">
        <section className="section">
          <div className="section-head">
            <h2>Alerts</h2>
            <span className="chip">{openAlerts} open</span>
          </div>
          <div className="card sheet-wrap">
            <div className="sheet compact-sheet">
              <div className="trow head agent-alert-grid">
                <span>Alert</span>
                <span>Severity</span>
                <span>Source</span>
              </div>
              {alerts.map((alert) => (
                <div className="trow agent-alert-grid" key={alert.id}>
                  <div>
                    <div className="cust">{alert.alert_type}</div>
                    <div className="sub">{alert.message}</div>
                  </div>
                  <span className={`pill ${alert.severity === "high" ? "danger" : "warn"}`}>{alert.severity}</span>
                  <span>{alert.source_name ?? alert.source_id ?? "General"}</span>
                </div>
              ))}
              {!alerts.length ? <div className="empty">No agent alerts.</div> : null}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Dead letters</h2>
            <span className="chip">{openDeadLetters} open</span>
          </div>
          <div className="card sheet-wrap">
            <div className="sheet compact-sheet">
              <div className="trow head dead-letter-grid">
                <span>Failure</span>
                <span>Attempts</span>
                <span>Status</span>
              </div>
              {deadLetters.map((item) => (
                <div className="trow dead-letter-grid" key={item.id}>
                  <div>
                    <div className="cust">{item.reason}</div>
                    <div className="sub">{item.page_url}</div>
                    <div className="sub">{item.last_error}</div>
                  </div>
                  <span className="mono">{item.attempts}</span>
                  <span className={`pill ${item.status === "open" ? "warn" : "success"}`}>{item.status}</span>
                </div>
              ))}
              {!deadLetters.length ? <div className="empty">No dead letters.</div> : null}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function ReviewQueueView({
  items,
  onStatus,
}: {
  items: ReviewItem[];
  onStatus: (item: ReviewItem, status: string) => Promise<void>;
}) {
  const openCount = items.filter((item) => item.status === "open").length;

  return (
    <section className="section">
      <div className="section-head">
        <h2>Review queue</h2>
        <span className="chip">{openCount} open</span>
      </div>
      <div className="card sheet-wrap">
        <div className="sheet">
          <div className="trow head review-grid">
            <span>Opportunity</span>
            <span>Reason</span>
            <span>Confidence</span>
            <span>Source</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          {items.map((item) => (
            <div className="trow review-grid" key={item.id}>
              <div>
                <div className="cust">{item.title}</div>
                <a className="inline-link" href={item.page_url} target="_blank" rel="noreferrer">
                  <LinkIcon size={13} />
                  Source page
                </a>
              </div>
              <span className="sub">{item.reason}</span>
              <span className="mono">{confidenceText(item.confidence)}</span>
              <span>{item.source_name ?? item.source_id ?? "Unassigned"}</span>
              <span className={`pill ${item.status === "open" ? "warn" : item.status === "rejected" ? "danger" : "success"}`}>{item.status}</span>
              <div className="tag-cloud">
                {item.status === "open" ? (
                  <>
                    <button className="btn btn-ghost" type="button" onClick={() => void onStatus(item, "approved")}>
                      <CheckCircle2 size={15} />
                      Approve
                    </button>
                    <button className="btn btn-ghost btn-danger" type="button" onClick={() => void onStatus(item, "rejected")}>
                      <X size={15} />
                      Reject
                    </button>
                  </>
                ) : (
                  <button className="btn btn-ghost" type="button" onClick={() => void onStatus(item, "open")}>
                    <Clock3 size={15} />
                    Reopen
                  </button>
                )}
              </div>
            </div>
          ))}
          {!items.length ? <div className="empty">No review items yet.</div> : null}
        </div>
      </div>
    </section>
  );
}

function EventModal({
  categories,
  criteriaTags,
  sources,
  event,
  onClose,
  onSave,
}: {
  categories: string[];
  criteriaTags: string[];
  sources: Source[];
  event?: EventRecord;
  onClose: () => void;
  onSave: (form: EventForm) => Promise<void>;
}) {
  const [form, setForm] = useState<EventForm>(event ? eventToForm(event) : emptyEventForm(categories));
  const [saving, setSaving] = useState(false);
  const sourceHref = form.source_url.trim();
  const applyHref = form.apply_url.trim();

  const update = (key: keyof EventForm, value: string | boolean) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="modal-back">
      <form
        className="modal wide"
        onSubmit={async (submitEvent) => {
          submitEvent.preventDefault();
          setSaving(true);
          await onSave(form);
          setSaving(false);
        }}
      >
        <div className="modal-head">
          <div>
            <div className="card-label">Inventory record</div>
            <h3>{event ? "Edit opportunity" : "New opportunity"}</h3>
          </div>
          <button className="x" onClick={onClose} type="button"><X size={18} /></button>
        </div>
        <div className="modal-body">
          {sourceHref || applyHref ? (
            <div className="detail-banner link-banner">
              <div>
                <div className="card-label">Deep links</div>
                <div className="cust">Open source and application pages directly</div>
                <div className="sub">These links are stored with the opportunity record.</div>
              </div>
              <DeepLinkRow applyUrl={applyHref} sourceUrl={sourceHref} prominent />
            </div>
          ) : null}
          <div className="field">
            <label>Title</label>
            <input value={form.title} onChange={(change) => update("title", change.target.value)} required />
          </div>
          <div className="field-row">
            <FieldSelect label="Category" value={form.category} values={categories} onChange={(value) => update("category", value)} />
            <FieldSelect label="Credibility" value={form.credibility_tier} values={["1", "2", "3"]} onChange={(value) => update("credibility_tier", value)} />
          </div>
          <div className="field-row">
            <FieldInput label="Fee amount" value={form.fee_amount} onChange={(value) => update("fee_amount", value)} />
            <FieldInput label="Fee purpose" value={form.fee_purpose} onChange={(value) => update("fee_purpose", value)} />
          </div>
          <div className="field-row">
            <FieldInput label="Deadline" type="date" value={form.deadline} onChange={(value) => update("deadline", value)} />
            <FieldSelect label="Actionability" value={form.actionability} values={["1", "2", "3", "4", "5"]} onChange={(value) => update("actionability", value)} />
          </div>
          <div className="field-row">
            <FieldInput label="Field" value={form.field} onChange={(value) => update("field", value)} />
            <FieldInput label="Location" value={form.location} onChange={(value) => update("location", value)} />
          </div>
          <div className="field-row">
            <FieldInput label="Criteria tags" value={form.criteria_tags} onChange={(value) => update("criteria_tags", value)} placeholder={criteriaTags.slice(0, 3).join(", ")} />
            <FieldInput label="Keywords" value={form.keywords} onChange={(value) => update("keywords", value)} />
          </div>
          <div className="field-row">
            <FieldInput label="Apply link" value={form.apply_url} onChange={(value) => update("apply_url", value)} />
            <FieldInput label="Source link" value={form.source_url} onChange={(value) => update("source_url", value)} />
          </div>
          <div className="field">
            <label>Source</label>
            <select value={form.source_id} onChange={(change) => update("source_id", change.target.value)}>
              <option value="">Unassigned</option>
              {sources.map((source) => (
                <option key={source.id} value={source.id}>{source.name}</option>
              ))}
            </select>
          </div>
          <FieldTextarea label="Summary" value={form.summary} onChange={(value) => update("summary", value)} />
          <FieldTextarea label="Notes" value={form.notes} onChange={(value) => update("notes", value)} />
        </div>
        <div className="modal-foot">
          <button className="btn btn-primary" disabled={saving} type="submit">
            <CheckCircle2 size={15} />
            Save
          </button>
          <button className="btn" type="button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

function ClientModal({
  client,
  onClose,
  onSave,
}: {
  client?: ClientRecord;
  onClose: () => void;
  onSave: (form: ClientForm) => Promise<void>;
}) {
  const [form, setForm] = useState<ClientForm>(client ? clientToForm(client) : emptyClientForm());
  const [saving, setSaving] = useState(false);
  const update = (key: keyof ClientForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="modal-back">
      <form
        className="modal"
        onSubmit={async (event) => {
          event.preventDefault();
          setSaving(true);
          await onSave(form);
          setSaving(false);
        }}
      >
        <div className="modal-head">
          <div>
            <div className="card-label">Client profile</div>
            <h3>{client ? "Edit client" : "New client"}</h3>
          </div>
          <button className="x" onClick={onClose} type="button"><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="field-row">
            <FieldInput label="Name" value={form.name} onChange={(value) => update("name", value)} required />
            <FieldInput label="Email" type="email" value={form.email} onChange={(value) => update("email", value)} required />
          </div>
          <div className="field-row">
            <FieldInput label="Field" value={form.field} onChange={(value) => update("field", value)} />
            <FieldInput label="Location" value={form.location} onChange={(value) => update("location", value)} />
          </div>
          <FieldInput label="Target criteria" value={form.target_criteria} onChange={(value) => update("target_criteria", value)} />
          <FieldInput label="Covered criteria" value={form.covered_criteria} onChange={(value) => update("covered_criteria", value)} />
          <FieldInput label="Keywords" value={form.keywords} onChange={(value) => update("keywords", value)} />
          <FieldInput label="Preferred categories" value={form.preferred_categories} onChange={(value) => update("preferred_categories", value)} />
          <FieldTextarea label="Notes" value={form.notes} onChange={(value) => update("notes", value)} />
        </div>
        <div className="modal-foot">
          <button className="btn btn-primary" disabled={saving} type="submit">
            <CheckCircle2 size={15} />
            Save
          </button>
          <button className="btn" type="button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

function SourceModal({
  source,
  onClose,
  onSave,
}: {
  source?: Source;
  onClose: () => void;
  onSave: (form: SourceForm) => Promise<void>;
}) {
  const [form, setForm] = useState<SourceForm>(source ? sourceToForm(source) : emptySourceForm());
  const [saving, setSaving] = useState(false);
  const update = (key: keyof SourceForm, value: string | boolean) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="modal-back">
      <form
        className="modal"
        onSubmit={async (event) => {
          event.preventDefault();
          setSaving(true);
          await onSave(form);
          setSaving(false);
        }}
      >
        <div className="modal-head">
          <div>
            <div className="card-label">Canonical source</div>
            <h3>{source ? "Edit source" : "New source"}</h3>
          </div>
          <button className="x" onClick={onClose} type="button"><X size={18} /></button>
        </div>
        <div className="modal-body">
          <FieldInput label="Name" value={form.name} onChange={(value) => update("name", value)} required />
          <div className="field-row">
            <FieldInput label="Canonical domain" value={form.canonical_domain} onChange={(value) => update("canonical_domain", value)} required />
            <FieldSelect label="Credibility tier" value={form.credibility_tier} values={["1", "2", "3"]} onChange={(value) => update("credibility_tier", value)} />
          </div>
          <FieldInput label="Seed URL" value={form.seed_url} onChange={(value) => update("seed_url", value)} placeholder="https://example.com/opportunities" />
          <div className="field-row">
            <FieldSelect label="Status" value={form.status} values={["active", "inactive"]} onChange={(value) => update("status", value)} />
            <div className="field">
              <label>Refresh</label>
              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={form.refresh_enabled}
                  onChange={(event) => update("refresh_enabled", event.target.checked)}
                />
                <span>Enable scheduled ingestion</span>
              </label>
            </div>
          </div>
          <FieldTextarea label="Notes" value={form.notes} onChange={(value) => update("notes", value)} />
        </div>
        <div className="modal-foot">
          <button className="btn btn-primary" disabled={saving} type="submit">
            <CheckCircle2 size={15} />
            Save
          </button>
          <button className="btn" type="button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

function EmailModal({
  client,
  match,
  onClose,
  onSent,
}: {
  client: ClientRecord;
  match: MatchRecord;
  onClose: () => void;
  onSent: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const defaultSubject = `${match.event.category} opportunity: ${match.event.title}`;
  const defaultBody = [
    `Hi ${client.name},`,
    "",
    `We found a ${match.event.category.toLowerCase()} opportunity that looks relevant to your EB1A profile: ${match.event.title}.`,
    "",
    `Why it fits: ${match.breakdown.missingCriteria.join(", ") || "it supports your current profile priorities"}.`,
    `Deadline: ${deadlineText(match.event.deadline)}.`,
    match.event.apply_url ? `Apply link: ${match.event.apply_url}` : "",
    "",
    "Best,",
    "Setu team",
  ].filter(Boolean).join("\n");

  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [sending, setSending] = useState(false);

  return (
    <div className="modal-back">
      <form
        className="modal"
        onSubmit={async (event) => {
          event.preventDefault();
          setSending(true);
          await onSent({
            clientId: client.id,
            eventId: match.event.id,
            toEmail: client.email,
            subject,
            body,
            score: match.score,
            breakdown: match.breakdown,
          });
          setSending(false);
        }}
      >
        <div className="modal-head">
          <div>
            <div className="card-label">Email out</div>
            <h3>{client.name}</h3>
            <div className="sub">{client.email}</div>
          </div>
          <button className="x" onClick={onClose} type="button"><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="detail-banner" style={{ marginBottom: 14 }}>
            <div>
              <div className="card-label">Match</div>
              <div className="cust">{match.event.title}</div>
              <div className="sub">Score {match.score} · {match.event.category} · {money(match.event)}</div>
            </div>
            {match.event.apply_url ? (
              <a className="btn" href={match.event.apply_url} target="_blank" rel="noreferrer">
                <LinkIcon size={15} />
                Open
              </a>
            ) : null}
          </div>
          <FieldInput label="Subject" value={subject} onChange={setSubject} />
          <FieldTextarea label="Body" value={body} onChange={setBody} />
        </div>
        <div className="modal-foot">
          <button className="btn btn-primary" disabled={sending} type="submit">
            <Send size={15} />
            Send
          </button>
          <button className="btn" type="button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

function DeepLinkRow({
  applyUrl,
  sourceUrl,
  prominent,
}: {
  applyUrl?: string;
  sourceUrl?: string;
  prominent?: boolean;
}) {
  const sourceHref = sourceUrl?.trim();
  const applyHref = applyUrl?.trim();

  if (!sourceHref && !applyHref) return null;

  return (
    <div className={`deep-link-row ${prominent ? "prominent" : ""}`}>
      {sourceHref ? (
        <a className="btn btn-link" href={sourceHref} target="_blank" rel="noreferrer">
          <LinkIcon size={15} />
          Source
        </a>
      ) : null}
      {applyHref ? (
        <a className="btn btn-link" href={applyHref} target="_blank" rel="noreferrer">
          <ArrowUpRight size={15} />
          Apply
        </a>
      ) : null}
    </div>
  );
}

function SummaryActionRow({
  applyUrl,
  onDetails,
}: {
  applyUrl?: string;
  onDetails: () => void;
}) {
  const applyHref = applyUrl?.trim();

  return (
    <div className="deep-link-row">
      <button className="btn btn-link" type="button" onClick={onDetails}>
        <FileText size={15} />
        Details
      </button>
      {applyHref ? (
        <a className="btn btn-link" href={applyHref} target="_blank" rel="noreferrer">
          <ArrowUpRight size={15} />
          Apply
        </a>
      ) : null}
    </div>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        placeholder={placeholder}
        required={required}
      />
    </div>
  );
}

function FieldSelect({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: string;
  values: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {values.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>
    </div>
  );
}

function FieldTextarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function topbarTitle(tab: TabId) {
  return {
    dashboard: "SETU - DISCOVER dashboard",
    inventory: "Inventory table",
    clients: "Client profile database",
    matches: "Match opportunities",
    emails: "Email history",
    sources: "Source baseline",
    ingestion: "Phase 2 ingestion",
    agent: "Phase 3 agent",
    review: "Review queue",
  }[tab];
}

function topbarSubtitle(tab: TabId) {
  return {
    dashboard: "Manual discovery system of record for the team.",
    inventory: "All eight categories, fee visibility, tiers, status, and links.",
    clients: "Target criteria, covered criteria, keywords, field, and location.",
    matches: "Criterion gap, credibility, keyword fit, actionability, and location.",
    emails: "Outbound attempts logged against the client record.",
    sources: "Canonical domains, seed pages, refresh status, and source-page change tracking.",
    ingestion: "Guarded fetch, change detection, structured extraction, review flags, and match refresh.",
    agent: "Constrained LangGraph discovery, review interrupts, traces, alerts, and dead letters.",
    review: "Low-confidence extractions and pay-to-play flags ready for team disposition.",
  }[tab];
}
