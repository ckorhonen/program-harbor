"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type AnyRecord = Record<string, any>;

type AppState = AnyRecord & {
  event?: AnyRecord;
  submissions?: AnyRecord[];
  speakers?: AnyRecord[];
  sessions?: AnyRecord[];
  tasks?: AnyRecord[];
  conflicts?: AnyRecord[];
  forms?: AnyRecord[];
  evaluations?: AnyRecord[];
  resources?: AnyRecord[];
  integrations?: AnyRecord[];
  stats?: AnyRecord;
  currentSpeaker?: AnyRecord;
};

const nav = [
  ["dashboard", "⌂", "Dashboard"],
  ["submissions", "◌", "Submissions"],
  ["forms", "▤", "Forms"],
  ["evaluations", "◎", "Evaluations"],
  ["schedule", "▦", "Schedule"],
  ["communications", "✉", "Comms"],
  ["speakers", "♙", "Speakers"],
  ["integrations", "⇄", "Integrations"],
  ["settings", "⚙", "Settings"],
] as const;

function initials(name = "Program Harbor") {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function fmtDate(value?: string, timezone?: string) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: timezone }).format(new Date(value));
  } catch {
    return new Date(value).toLocaleString();
  }
}

function fmtTime(value?: string, timezone?: string) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: timezone }).format(new Date(value));
  } catch {
    return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
}

function localInput(value?: string, timezone?: string) {
  if (!value) return "";
  try {
    const parts = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: timezone }).formatToParts(new Date(value));
    const part = (type: string) => parts.find((item) => item.type === type)?.value || "00";
    return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
  } catch {
    return value.slice(0, 16);
  }
}

function hourInZone(value?: string, timezone?: string) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("en-US", { hour: "2-digit", hourCycle: "h23", timeZone: timezone }).format(new Date(value));
  } catch {
    return value.slice(11, 13);
  }
}

function StatusTag({ value }: { value?: string }) {
  const v = (value || "pending").toLowerCase();
  const tone = v.includes("accept") || v.includes("complete") || v === "published" || v === "connected" ? "good" : v.includes("overdue") || v.includes("conflict") || v.includes("declin") || v.includes("error") ? "danger" : v.includes("review") || v.includes("wait") || v.includes("draft") ? "warn" : "";
  return <span className={`tag ${tone}`}>{value || "Pending"}</span>;
}

function Avatar({ name, coral = false }: { name?: string; coral?: boolean }) {
  return <span className={`avatar ${coral ? "coral" : ""}`}>{initials(name)}</span>;
}

function Launchpad() {
  return (
    <main className="landing">
      <header className="landing-top">
        <a className="wordmark" href="/"><span className="mark">PH</span><span>Program Harbor</span></a>
        <span className="demo-note"><span className="demo-dot" /> dedicated demo environment</span>
      </header>
      <section className="landing-hero">
        <span className="eyebrow">Open-source program operations</span>
        <h1>Move every speaker from <em>proposal</em> to program.</h1>
        <p>Program Harbor gives event teams one calm place to collect proposals, review them fairly, unblock speakers, build the agenda, and publish what attendees need.</p>
        <div className="launch-grid">
          <a className="launch-card" href="/admin"><span className="eyebrow">Organizer</span><span className="arrow">↗</span><h3>Launch admin demo</h3><p>See the onboarding dashboard, submission queue, and conflict-aware schedule.</p></a>
          <a className="launch-card" href="/evaluator"><span className="eyebrow">Reviewer</span><span className="arrow">↗</span><h3>Launch evaluator demo</h3><p>Score an assigned proposal across a transparent weighted rubric.</p></a>
          <a className="launch-card" href="/portal"><span className="eyebrow">Speaker</span><span className="arrow">↗</span><h3>Launch speaker portal</h3><p>Complete profile, files, and tasks from a mobile-friendly self-service view.</p></a>
        </div>
        <div className="public-links">
          <a href="/cfp">Public CFP ↗</a><a href="/schedule">Public schedule ↗</a><a href="/speakers">Speaker gallery ↗</a><a href="/api/docs">API docs ↗</a>
        </div>
        <p className="footer-note">Demo accounts are non-production. Use “Reset demo” in the organizer shell to restore the known seed state. No email or external sync is sent from this environment.</p>
      </section>
    </main>
  );
}

function useAppData(view: string) {
  const [data, setData] = useState<AppState | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  async function load() {
    try {
      const response = await fetch(`/api/state?view=${encodeURIComponent(view)}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`State request failed (${response.status})`);
      setData(await response.json());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load demo state.");
    } finally {
      setLoading(false);
    }
  }

  async function mutate(path: string, body?: AnyRecord, method = "POST") {
    try {
      const response = await fetch(path, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      const payload = await response.json().catch(() => ({} as AnyRecord)) as AnyRecord;
      if (!response.ok) throw new Error(payload.error || `Action failed (${response.status})`);
      if (payload.state) setData(payload.state);
      setToast(payload.message || "Saved to the demo state.");
      window.setTimeout(() => setToast(""), 4200);
      return payload;
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Action failed.");
      window.setTimeout(() => setToast(""), 5000);
      return null;
    }
  }

  useEffect(() => { void load(); }, [view]);
  useEffect(() => {
    if (view !== "admin") return;
    const interval = window.setInterval(() => void load(), 3500);
    return () => window.clearInterval(interval);
  }, [view]);
  return { data, error, loading, load, mutate, toast };
}

function AppShell({ section, children, data, onAction, toast }: { section: string; children: React.ReactNode; data: AppState; onAction: (path: string, body?: AnyRecord, method?: string) => Promise<AnyRecord | null>; toast: string }) {
  const event = data.event || {};
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="wordmark" href="/"><span className="mark">PH</span><span>Program Harbor</span></a>
        <div className="event-switcher"><span>ACTIVE EVENT</span><strong>{event.name || "AI Engineer Sandbox Summit"}</strong><span>{event.timezone || "America/Los_Angeles"}</span></div>
        <div className="nav-list">
          {nav.map(([key, icon, label]) => <a className={`nav-item ${section === key ? "active" : ""}`} href={`/admin/${key === "dashboard" ? "" : key}`} key={key}><span className="nav-icon" aria-hidden="true">{icon}</span><span>{label}</span></a>)}
        </div>
        <div className="sidebar-foot"><strong>Demo mode</strong><br />Role links are isolated and resettable.<br /><a href="/">Back to launchpad ↗</a></div>
      </aside>
      <main className="main">
        {children}
        {toast ? <div className="toast" role="status">{toast}</div> : null}
      </main>
    </div>
  );
}

function Topbar({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: React.ReactNode }) {
  return <header className="topbar"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{description ? <p className="muted small">{description}</p> : null}</div><div className="topbar-actions"><span className="status-pill"><span className="status-dot" /> Demo data synced</span>{action}</div></header>;
}

function Dashboard({ data, onAction }: { data: AppState; onAction: (path: string, body?: AnyRecord, method?: string) => Promise<AnyRecord | null> }) {
  const stats = data.stats || {};
  const tasks = data.tasks || [];
  const speakers = data.speakers || [];
  const outstanding = tasks.filter((task) => task.status !== "complete").slice(0, 7);
  const nextDue = [...tasks].filter((task) => task.status !== "complete" && task.dueAt).sort((a, b) => String(a.dueAt).localeCompare(String(b.dueAt)))[0];
  const incompleteSpeakerCount = speakers.filter((speaker) => Number(speaker.completion || 0) < 100).length;
  return <>
    <Topbar eyebrow="Operations / overview" title="Good morning, Maya" description="AI Engineer Sandbox Summit · the work that keeps accepted sessions publishable." action={<button className="button mint" onClick={() => onAction("/api/reset")}>Reset demo</button>} />
    <div className="banner"><span aria-hidden="true">✦</span><div><strong>Demo briefing · one speaker conflict needs your attention</strong> You have {stats.overdueTasks ?? 3} overdue tasks and {stats.unscheduledSessions ?? 1} accepted session waiting for a time. The seeded conflicts are intentional so the schedule behavior is easy to inspect.</div></div>
    <section className="stats-grid">
      <div className="stat-card"><span className="stat-label">Total speakers</span><strong>{stats.totalSpeakers ?? speakers.length}</strong><span className="stat-meta">{stats.acceptedSpeakers ?? 8} accepted</span></div>
      <div className="stat-card good"><span className="stat-label">Fully onboarded</span><strong>{stats.onboardedSpeakers ?? 4}</strong><span className="stat-meta">{stats.completionPercent ?? 58}% completion</span></div>
      <div className="stat-card alert"><span className="stat-label">Outstanding work</span><strong>{stats.outstandingTasks ?? outstanding.length}</strong><span className="stat-meta">{stats.overdueTasks ?? 3} overdue</span></div>
      <div className="stat-card"><span className="stat-label">Sessions scheduled</span><strong>{stats.scheduledSessions ?? 7}<small className="muted"> / {stats.acceptedSessions ?? 8}</small></strong><span className="stat-meta">{stats.conflicts ?? 2} conflicts to review</span></div>
    </section>
    <div className="grid-2">
      <section className="card"><div className="card-head"><div><h2>Speaker readiness</h2><p>Fix the next blocker, not a spreadsheet of blockers.</p></div><a className="button secondary small-button" href="/admin/speakers">View all</a></div><div className="table-wrap"><table><thead><tr><th>Speaker</th><th>Track</th><th>Progress</th><th>Next due</th></tr></thead><tbody>{speakers.slice(0, 6).map((speaker) => <tr key={speaker.id}><td><div className="person"><Avatar name={speaker.name} /><div><strong>{speaker.name}</strong><span>{speaker.company || "Independent"}</span></div></div></td><td><span className="tag">{speaker.track || "Agents"}</span></td><td><div className="progress" aria-label={`${speaker.completion ?? 60}% complete`}><span style={{ width: `${speaker.completion ?? 60}%` }} /></div><span className="small muted">{speaker.completion ?? 60}%</span></td><td><StatusTag value={speaker.nextDueLabel || "Tomorrow"} /></td></tr>)}</tbody></table></div></section>
      <section className="card"><div className="card-head"><div><h2>Completion by work</h2><p>Across accepted speakers.</p></div><span className="tag good">Live</span></div><div className="progress-row"><span>Profile</span><div className="progress"><span style={{ width: "76%" }} /></div><strong>76%</strong></div><div className="progress-row"><span>Headshots</span><div className="progress"><span style={{ width: "62%" }} /></div><strong>62%</strong></div><div className="progress-row"><span>Slides</span><div className="progress"><span style={{ width: "48%" }} /></div><strong>48%</strong></div><div className="progress-row"><span>Forms</span><div className="progress"><span style={{ width: "70%" }} /></div><strong>70%</strong></div><div className="divider" /><div className="small muted">Next deadline</div><strong style={{ display: "block", marginTop: 5, fontSize: 19 }}>{nextDue ? `${fmtDate(nextDue.dueAt, data.event?.timezone)} · ${nextDue.title}` : "No open speaker deadline"}</strong><span className="small muted">{incompleteSpeakerCount} speakers are missing at least one required file.</span></section>
    </div>
    <section className="card"><div className="card-head"><div><h2>Needs attention</h2><p>These actions change the operational state of the event.</p></div><a className="button secondary small-button" href="/admin/communications">Open comms</a></div><div className="table-wrap"><table><thead><tr><th>Task</th><th>Speaker</th><th>Due</th><th>Status</th><th /></tr></thead><tbody>{outstanding.map((task) => <tr key={task.id}><td><strong>{task.title}</strong><div className="small muted">{task.kind === "file" ? "File request" : "Speaker task"}</div></td><td>{task.speakerName || "All accepted speakers"}</td><td>{task.dueAt ? fmtDate(task.dueAt, data.event?.timezone) : "—"}</td><td><StatusTag value={task.status === "overdue" ? "Overdue" : "Open"} /></td><td><button className="button secondary small-button" onClick={() => onAction("/api/reminders", { taskId: task.id, mode: "preview" })}>Remind</button></td></tr>)}</tbody></table></div></section>
  </>;
}

function SubmissionList({ data, onAction }: { data: AppState; onAction: (path: string, body?: AnyRecord, method?: string) => Promise<AnyRecord | null> }) {
  const [query, setQuery] = useState("");
  const rows = (data.submissions || []).filter((item) => `${item.title} ${item.speakerName} ${item.category} ${item.status}`.toLowerCase().includes(query.toLowerCase()));
  return <><Topbar eyebrow="Program / submissions" title="Submission queue" description="Route, review, and make the human decision that creates a session." action={<a className="button mint" href="/cfp">Open public CFP ↗</a>} /><section className="card"><div className="card-head"><div><h2>{rows.length} proposals in view</h2><p>Every row keeps its form version and routing decision.</p></div><input aria-label="Search submissions" placeholder="Search title, speaker, category" value={query} onChange={(e) => setQuery(e.target.value)} style={{ maxWidth: 260 }} /></div><div className="table-wrap"><table><thead><tr><th>Proposal</th><th>Route</th><th>Review</th><th>Score</th><th>Status</th><th /></tr></thead><tbody>{rows.map((submission) => <tr key={submission.id}><td><div className="person"><Avatar name={submission.speakerName} coral={submission.status === "waitlisted"} /><div><strong>{submission.title}</strong><span>{submission.speakerName} · {submission.formVersion || "v2"}</span></div></div></td><td><span className="tag blue">{submission.category || "General"}</span><div className="small muted">{submission.reviewPlan || "Default plan"}</div></td><td><span className="small">{submission.reviewProgress || "2 / 3"}</span></td><td><strong>{submission.score ?? "—"}</strong><span className="small muted"> / 5</span></td><td><StatusTag value={submission.status} /></td><td>{submission.status === "submitted" || submission.status === "in_review" ? <button className="button small-button" onClick={() => onAction(`/api/submissions/${submission.id}/status`, { status: "accepted" })}>Accept</button> : submission.status === "accepted" ? <span className="small muted">Session ready</span> : <button className="button secondary small-button" onClick={() => onAction(`/api/submissions/${submission.id}/status`, { status: "accepted" })}>Re-open</button>}</td></tr>)}</tbody></table></div></section></>;
}

function FormBuilder({ data, onAction }: { data: AppState; onAction: (path: string, body?: AnyRecord, method?: string) => Promise<AnyRecord | null> }) {
  const [format, setFormat] = useState("Workshop");
  const [showRule, setShowRule] = useState(true);
  const fields = data.forms?.[0]?.fields || [{ key: "title", label: "Session title", type: "short_text", required: true }, { key: "abstract", label: "Abstract", type: "long_text", required: true }, { key: "format", label: "Session format", type: "single_select", required: true }, { key: "handsOn", label: "Hands-on requirements", type: "long_text", required: true, conditional: "format = Workshop" }, { key: "category", label: "Category", type: "single_select", required: true }];
  return <><Topbar eyebrow="Program / submission forms" title="CFP form builder" description="Version the public experience without breaking existing submissions." action={<button className="button mint" onClick={() => onAction("/api/forms", { action: "publish", format })}>Publish version</button>} /><div className="banner"><span>↻</span><div><strong>Draft changes are isolated</strong> Existing proposals stay tied to the form version they used. Preview the Workshop rule before publishing.</div></div><div className="split"><section className="card"><div className="card-head"><div><h2>Session submission · v3</h2><p>Published · last edited today</p></div><button className="button secondary small-button" onClick={() => setShowRule(!showRule)}>{showRule ? "Hide rule" : "Show rule"}</button></div><div className="field-list">{fields.map((field: AnyRecord) => <div className={`field-row ${field.key === "format" ? "selected" : ""}`} key={field.key}><span className="handle">⠿</span><strong>{field.label}<small>{field.type.replace("_", " ")}{field.required ? " · required" : ""}</small></strong><span className="tag">{field.key === "handsOn" ? "conditional" : "field"}</span></div>)}</div><button className="button secondary" style={{ marginTop: 12 }} onClick={() => onAction("/api/forms", { action: "add", field: { key: "newField", label: "New question", type: "short_text", required: false } })}>＋ Add field</button></section><section className="card"><div className="card-head"><div><h2>Live preview</h2><p>What a speaker will see at the public link.</p></div><span className="status-pill"><span className="status-dot" /> Preview</span></div><div className="preview"><span className="eyebrow">AI Engineer Sandbox Summit</span><h3>Share a session with the room</h3><p className="muted">Tell us what you want to put on the program. The form adapts to the session format you choose.</p><div className="field"><label htmlFor="preview-format">Session format <span>*</span></label><select id="preview-format" value={format} onChange={(e) => setFormat(e.target.value)}><option>Workshop</option><option>Talk</option><option>Fireside chat</option></select></div>{showRule && format === "Workshop" ? <><div className="preview-rule">Because you chose Workshop, this required question is now visible.</div><div className="field"><label htmlFor="preview-hands">Hands-on requirements <span>*</span></label><textarea id="preview-hands" placeholder="What should attendees bring or prepare?" /></div></> : <div className="empty" style={{ marginTop: 15, padding: 18 }}><strong>Conditional field hidden</strong> Talk proposals do not submit a hands-on answer.</div>}<a className="button" style={{ marginTop: 15 }} href="/cfp">Continue to speaker details →</a></div></section></div></>;
}

function Evaluator({ data, onAction }: { data: AppState; onAction: (path: string, body?: AnyRecord, method?: string) => Promise<AnyRecord | null> }) {
  const review = data.evaluations?.[0] || {};
  const criteria = review.criteria || ["Audience value", "Originality", "Practicality", "Speaker clarity", "Program fit"];
  const criterionIds = review.criterionIds || criteria;
  const [scores, setScores] = useState<Record<string, string>>({});
  return <><Topbar eyebrow="Evaluator / assigned queue" title="Review desk" description="Alex Morgan · Round 1 · Security review plan" action={<span className="status-pill"><span className="status-dot" /> 2 of 3 reviewed</span>} /><div className="grid-2"><section className="card"><div className="card-head"><div><h2>{review.submissionTitle || "Secure by default: shipping agent permissions"}</h2><p>{review.speakerName || "Jordan Lee"} · Security Engineering · blind review on</p></div><StatusTag value="In review" /></div><p>{review.abstract || "A practical workshop for engineers designing agent permissions, with concrete failure modes and a small policy test harness attendees can take home."}</p><div className="divider" /><div className="field"><label htmlFor="review-feedback">Written feedback</label><textarea id="review-feedback" defaultValue="Clear operational framing and a useful take-home exercise. The opening could make the target audience more explicit." /></div><button className="button mint" style={{ marginTop: 12 }} onClick={() => onAction("/api/reviews", { submissionId: review.submissionId || "sub-01", scores, feedback: "Clear operational framing and a useful take-home exercise." })}>Save review</button></section><section className="card"><div className="card-head"><div><h2>Round 1 rubric</h2><p>Weighted aggregate excludes abstentions.</p></div><span className="tag blue">5 criteria</span></div>{criteria.map((criterion: string, index: number) => { const criterionId = criterionIds[index] || criterion; return <div className="field" style={{ marginBottom: 13 }} key={criterionId}><label htmlFor={`score-${index}`}>{criterion} <span>*</span></label><select id={`score-${index}`} value={scores[criterionId] || ""} onChange={(e) => setScores({ ...scores, [criterionId]: e.target.value })}><option value="">Choose score</option><option value="5">5 — exceptional</option><option value="4">4 — strong</option><option value="3">3 — workable</option><option value="2">2 — needs work</option><option value="1">1 — weak</option><option value="abstain">Abstain for conflict</option></select></div>; })}<div className="banner" style={{ marginTop: 3 }}><span>ⓘ</span><div><strong>Human decision stays separate</strong> A score recommends; an organizer still accepts, waitlists, or declines.</div></div></section></div></>;
}

function Schedule({ data, onAction }: { data: AppState; onAction: (path: string, body?: AnyRecord, method?: string) => Promise<AnyRecord | null> }) {
  const sessions = data.sessions || [];
  const rooms = data.event?.rooms || [{ id: "room-main", name: "Main Hall" }, { id: "room-lab", name: "Workshop Lab" }, { id: "room-studio", name: "Studio" }];
  const [view, setView] = useState("day");
  const [selected, setSelected] = useState<AnyRecord | null>(sessions.find((item) => !item.startsAt) || sessions[0] || null);
  const [roomId, setRoomId] = useState(selected?.roomId || rooms[0]?.id);
  const eventDate = localInput(data.event?.startsAt, data.event?.timezone).slice(0, 10) || "2026-09-17";
  const [startsAt, setStartsAt] = useState(localInput(selected?.startsAt || data.event?.startsAt, data.event?.timezone) || `${eventDate}T09:00`);
  const [endsAt, setEndsAt] = useState(localInput(selected?.endsAt, data.event?.timezone) || `${eventDate}T10:00`);
  const [override, setOverride] = useState(false);
  const byRoom = (room: AnyRecord) => sessions.filter((item) => item.roomId === room.id && item.startsAt).slice(0, 3);
  async function saveSchedule() { if (!selected) return; await onAction(`/api/sessions/${selected.id}/schedule`, { roomId, startsAt: new Date(startsAt).toISOString(), endsAt: new Date(endsAt).toISOString(), override, overrideReason: override ? "Organizer reviewed the overlap in the demo." : undefined }); }
  return <><Topbar eyebrow="Program / agenda" title="Build the agenda" description="One canonical schedule, five useful views, explicit conflict decisions." action={<span className="status-pill warn"><span className="status-dot" /> {data.conflicts?.length ?? 2} conflicts</span>} /><section className="card"><div className="schedule-toolbar"><div className="tabs">{["list", "day", "week", "track", "room"].map((item) => <button className={`tab ${view === item ? "active" : ""}`} key={item} onClick={() => setView(item)}>{item[0].toUpperCase() + item.slice(1)}</button>)}</div><span className="small muted">{fmtDate(data.event?.startsAt, data.event?.timezone)} · {data.event?.timezone || "America/Los_Angeles"}</span><a className="button secondary small-button" href="/schedule">View public ↗</a></div><div className="schedule-layout"><div className="timeline"><div className="timeline-head"><div>Time</div>{rooms.slice(0, 3).map((room: AnyRecord) => <div key={room.id}>{room.name}</div>)}</div>{["09:00", "10:00", "11:00", "12:00", "13:00", "14:00"].map((time) => <div className="time-row" key={time}><div className="time-label">{time}</div>{rooms.slice(0, 3).map((room: AnyRecord) => <div className="time-cell" key={room.id} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { const id = e.dataTransfer.getData("sessionId"); const item = sessions.find((session) => session.id === id); if (item) { setSelected(item); setRoomId(room.id); setStartsAt(`${eventDate}T${time}`); setEndsAt(`${eventDate}T${String(Number(time.slice(0, 2)) + 1).padStart(2, "0")}:00`); } }}>{byRoom(room).filter((item) => hourInZone(item.startsAt, data.event?.timezone) === time.slice(0, 2)).map((item) => <div className={`session-card ${item.conflict ? "conflict" : ""}`} draggable onDragStart={(e) => e.dataTransfer.setData("sessionId", item.id)} onClick={() => { setSelected(item); setRoomId(item.roomId || room.id); setStartsAt(localInput(item.startsAt, data.event?.timezone) || `${eventDate}T${time}`); setEndsAt(localInput(item.endsAt, data.event?.timezone) || `${eventDate}T${time}`); }} key={item.id}><strong>{item.title}</strong><span>{item.track || "General"} · {item.speakerName || "Speaker"}</span></div>)}</div>)}</div>)}</div><div><div className="tray"><div className="card-head" style={{ marginBottom: 6 }}><div><h3>Unscheduled</h3><p>{sessions.filter((item) => !item.startsAt).length} accepted sessions</p></div></div>{sessions.filter((item) => !item.startsAt).map((item) => <div className="tray-card" draggable onDragStart={(e) => e.dataTransfer.setData("sessionId", item.id)} onClick={() => { setSelected(item); setRoomId(rooms[0]?.id); setStartsAt(`${eventDate}T09:00`); setEndsAt(`${eventDate}T10:00`); }} key={item.id}><strong>{item.title}</strong><span>{item.speakerName || "Speaker"}</span></div>)}</div><div className="card" style={{ marginTop: 14 }}><div className="card-head"><div><h3>{selected ? "Edit placement" : "Select a session"}</h3><p>Keyboard alternative to drag and drop.</p></div></div>{selected ? <><div className="small muted" style={{ marginBottom: 10 }}>{selected.title}</div><div className="field"><label htmlFor="schedule-room">Room</label><select id="schedule-room" value={roomId} onChange={(e) => setRoomId(e.target.value)}>{rooms.map((room: AnyRecord) => <option key={room.id} value={room.id}>{room.name}</option>)}</select></div><div className="form-grid" style={{ marginTop: 10 }}><div className="field"><label htmlFor="schedule-start">Start</label><input id="schedule-start" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} /></div><div className="field"><label htmlFor="schedule-end">End</label><input id="schedule-end" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} /></div></div><label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12, color: "var(--muted)", fontSize: 11 }}><input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} style={{ width: 15 }} /> Acknowledge and override a conflict</label><button className="button mint" style={{ width: "100%", marginTop: 12 }} onClick={saveSchedule}>Save placement</button><a className="button secondary" style={{ width: "100%", marginTop: 8 }} href={selected.id ? `/api/sessions/${selected.id}/calendar.ics` : "#"}>Download calendar invite</a></> : <div className="empty">Choose a session card to edit its room and time.</div>}</div></div></div></section><section className="card"><div className="card-head"><div><h2>Conflict summary</h2><p>Nothing is hidden when two operational facts disagree.</p></div><span className="tag danger">Needs review</span></div>{(data.conflicts || [{ kind: "speaker", message: "Jordan Lee appears in two sessions from 10:00–11:00.", sessions: "Agent permissions · Policy as product" }, { kind: "room", message: "Workshop Lab overlaps by 30 minutes.", sessions: "Evaluation lab · Build faster" }]).map((conflict: AnyRecord, index: number) => <div className="task-item" key={conflict.id || index}><span className="check" style={{ color: "var(--danger)", borderColor: "#efc0b6" }}>!</span><div className="task-copy"><strong>{conflict.message}</strong><span>{conflict.sessions || "Two linked schedule entries"}</span></div><StatusTag value={conflict.acknowledged ? "Overridden" : "Open"} /></div>)}</section></>;
}

function Communications({ data, onAction }: { data: AppState; onAction: (path: string, body?: AnyRecord, method?: string) => Promise<AnyRecord | null> }) {
  const [template, setTemplate] = useState("acceptance");
  const templates: AnyRecord = data.templates || { acceptance: { name: "Acceptance", subject: "Your session is on the program", body: "Hi {{speakerName}},\n\nYour session {{sessionTitle}} is accepted for {{eventName}}. We will see you in {{room}} on {{sessionDate}} at {{sessionTime}} {{eventTimezone}}." }, reminder: { name: "Missing-task reminder", subject: "One last step for {{eventName}}", body: "Hi {{speakerName}},\n\nPlease finish {{outstandingTaskList}} by {{dueDate}}." } };
  const current = templates[template] || templates.acceptance;
  return <><Topbar eyebrow="Program / communications" title="Clear, timely messages" description="Templates render against real event context before any send is attempted." action={<button className="button mint" onClick={() => onAction("/api/messages/preview", { template: template, recipient: "demo@example.test" })}>Preview message</button>} /><div className="grid-2"><section className="card"><div className="card-head"><div><h2>Message templates</h2><p>Unknown variables are rejected before send.</p></div><span className="tag good">Allowlisted demo</span></div>{Object.entries(templates).map(([key, value]: [string, AnyRecord]) => <button className={`field-row ${template === key ? "selected" : ""}`} style={{ width: "100%", textAlign: "left", marginBottom: 8 }} key={key} onClick={() => setTemplate(key)}><strong>{value.name}<small>{value.subject}</small></strong><span className="tag">{key}</span></button>)}<button className="button secondary" style={{ marginTop: 5 }} onClick={() => onAction("/api/reminders", { action: "schedule", target: "incomplete", relative: "48h" })}>＋ Schedule reminder</button></section><section className="card"><div className="card-head"><div><h2>Rendered preview</h2><p>To: Jordan Lee · demo@example.test</p></div><StatusTag value="Preview only" /></div><div className="preview"><span className="eyebrow">{current.name}</span><h3 style={{ fontSize: 18 }}>{String(current.subject || "").replaceAll("{{eventName}}", data.event?.name || "AI Engineer Sandbox Summit")}</h3><p style={{ whiteSpace: "pre-wrap" }}>{String(current.body || "").replaceAll("{{speakerName}}", "Jordan Lee").replaceAll("{{eventName}}", data.event?.name || "AI Engineer Sandbox Summit").replaceAll("{{sessionTitle}}", "Secure by default").replaceAll("{{room}}", "Workshop Lab").replaceAll("{{sessionDate}}", "Aug 13").replaceAll("{{sessionTime}}", "10:00 AM").replaceAll("{{eventTimezone}}", data.event?.timezone || "PT").replaceAll("{{outstandingTaskList}}", "speaker details").replaceAll("{{dueDate}}", "Aug 14")}</p></div><div className="banner" style={{ marginTop: 14 }}><span>✓</span><div><strong>Test-send is constrained</strong> Only addresses in TEST_EMAIL_ALLOWLIST may receive a message in demo mode. Every attempt gets a delivery log and idempotency key.</div></div></section></div><section className="card"><div className="card-head"><div><h2>Recent delivery activity</h2><p>Failures remain visible and retryable.</p></div><a className="button secondary small-button" href="/admin/communications">Refresh</a></div><div className="table-wrap"><table><thead><tr><th>Operation</th><th>Template</th><th>Recipient</th><th>Status</th><th>Last attempt</th></tr></thead><tbody>{(data.deliveryLogs || [{ id: "op-14", template: "Portal invitation", recipient: "demo@example.test", status: "Previewed", at: "Just now" }, { id: "op-13", template: "Missing-task reminder", recipient: "speaker@example.test", status: "Blocked · not allowlisted", at: "Today, 9:42 AM" }]).map((item: AnyRecord) => <tr key={item.id}><td className="mono">{item.id}</td><td>{item.template}</td><td>{item.recipient}</td><td><StatusTag value={item.status} /></td><td className="muted">{item.at}</td></tr>)}</tbody></table></div></section></>;
}

function Portal({ data, onAction }: { data: AppState; onAction: (path: string, body?: AnyRecord, method?: string) => Promise<AnyRecord | null> }) {
  const speaker = data.currentSpeaker || data.speakers?.[0] || { id: "speaker-01", name: "Jordan Lee", title: "Security Engineer", company: "Northstar Labs", completion: 62 };
  const tasks = (data.tasks || []).filter((task) => !task.speakerId || task.speakerId === speaker.id).slice(0, 6);
  const completed = tasks.filter((task) => task.status === "complete").length;
  return <div className="portal-view"><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}><a className="wordmark" href="/"><span className="mark">PH</span><span>Program Harbor</span></a><span className="status-pill"><span className="status-dot" /> Speaker demo</span></div><section className="portal-hero"><div><span className="eyebrow">Speaker portal / AI Engineer Sandbox Summit</span><h1>Welcome, {speaker.name?.split(" ")[0] || "speaker"}.</h1><p>Your session is moving through the final checks. Complete the next item below and the organizing team will see the change in their dashboard.</p></div><div className="portal-score"><strong>{speaker.completion ?? 62}%</strong><span>ready to publish</span></div></section><div className="grid-2" style={{ marginTop: 16 }}><section className="card"><div className="card-head"><div><h2>Your work</h2><p>{completed} of {tasks.length || 6} required items complete.</p></div><span className="tag warn">{tasks.length - completed} open</span></div>{tasks.length ? tasks.map((task) => <div className="task-item" key={task.id}><span className={`check ${task.status === "complete" ? "done" : ""}`}>{task.status === "complete" ? "✓" : ""}</span><div className="task-copy"><strong>{task.title}</strong><span>{task.kind === "file" ? "Upload requested" : task.kind === "form" ? "Short form" : "Required task"} · {task.dueAt ? `Due ${fmtDate(task.dueAt, data.event?.timezone)}` : "No due date"}</span></div>{task.status !== "complete" ? <button className="button secondary small-button" onClick={() => onAction(`/api/tasks/${task.id}/complete`, { speakerId: speaker.id })}>Mark complete</button> : <StatusTag value="Complete" />}</div>) : <div className="empty"><strong>No tasks assigned</strong>The organizer will add work here when your session is accepted.</div>}</section><section><section className="card"><div className="card-head"><div><h2>Speaker profile</h2><p>Shown publicly after organizer approval.</p></div><Avatar name={speaker.name} /></div><form onSubmit={(e) => { e.preventDefault(); const form = new FormData(e.currentTarget); void onAction(`/api/speakers/${speaker.id}`, { name: form.get("name"), title: form.get("title"), company: form.get("company"), bio: form.get("bio") }); }}><div className="form-grid"><div className="field"><label htmlFor="speaker-name">Name</label><input id="speaker-name" name="name" defaultValue={speaker.name} /></div><div className="field"><label htmlFor="speaker-title">Title</label><input id="speaker-title" name="title" defaultValue={speaker.title || "Security Engineer"} /></div><div className="field full"><label htmlFor="speaker-company">Company</label><input id="speaker-company" name="company" defaultValue={speaker.company || "Northstar Labs"} /></div><div className="field full"><label htmlFor="speaker-bio">Bio</label><textarea id="speaker-bio" name="bio" defaultValue={speaker.bio || "Jordan builds practical security systems for teams shipping AI products."} /></div></div><button className="button mint" style={{ marginTop: 12 }}>Save profile</button></form></section><section className="card"><div className="card-head"><div><h2>Files</h2><p>Private until you approve publication.</p></div><span className="tag">R2 / local store</span></div><div className="field"><label htmlFor="speaker-file">Upload slides or headshot</label><input id="speaker-file" type="file" accept="image/*,.pdf,.ppt,.pptx" onChange={(e) => { const file = e.target.files?.[0]; if (file) void onAction("/api/files", { name: file.name, size: file.size, type: file.type, speakerId: speaker.id }); }} /><span className="help">Max 25 MB. The upload is stored as private metadata until approved.</span></div></section></section></div><p className="footer-note">Need help? Contact the event team through the support link in your invitation. This is a demo portal link and cannot access another speaker.</p></div>;
}

function PublicCFP({ onAction }: { onAction: (path: string, body?: AnyRecord, method?: string) => Promise<AnyRecord | null> }) {
  const [format, setFormat] = useState("Workshop");
  const [submitted, setSubmitted] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  async function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const form = new FormData(e.currentTarget); const result = await onAction("/api/submissions", { title: form.get("title"), abstract: form.get("abstract"), format, handsOnRequirements: format === "Workshop" ? form.get("handsOnRequirements") : undefined, category: form.get("category"), speakerName: form.get("speakerName"), speakerEmail: form.get("speakerEmail"), coSpeakerName: form.get("coSpeakerName"), coSpeakerEmail: form.get("coSpeakerEmail"), supportingFile: file ? { name: file.name, size: file.size, type: file.type } : undefined, idempotencyKey: `cfp-${Date.now()}` }); if (result) setSubmitted(true); }
  if (submitted) return <main className="landing"><header className="landing-top"><a className="wordmark" href="/"><span className="mark">PH</span><span>Program Harbor</span></a><span className="status-pill"><span className="status-dot" /> Submission received</span></header><section className="landing-hero" style={{ maxWidth: 820, marginTop: "5vh" }}><span className="eyebrow">AI Engineer Sandbox Summit / confirmation</span><h1 style={{ fontSize: "clamp(38px, 6vw, 66px)" }}>Your proposal is in the queue.</h1><p>The organizing team can now route it to the right review plan. Keep this secure link if you need to return to your submission; an acceptance decision will create your speaker portal.</p><div className="banner"><span>✓</span><div><strong>Next step</strong> Reviewers will score the visible rubric. You do not need to create another account.</div></div><a className="button" href="/">Back to demo launchpad</a></section></main>;
  return <main className="landing"><header className="landing-top"><a className="wordmark" href="/"><span className="mark">PH</span><span>Program Harbor</span></a><span className="small muted">Public call for speakers · one submission per proposal</span></header><section style={{ maxWidth: 820, margin: "3vh auto", padding: "0 20px 60px" }}><div className="card"><span className="eyebrow">AI Engineer Sandbox Summit</span><h1 style={{ margin: "12px 0 7px", fontSize: "clamp(30px, 5vw, 48px)", letterSpacing: "-.07em" }}>Put a useful idea on the program.</h1><p className="muted">We are looking for practical sessions from people building the next generation of software. Complete the form once; you can return through your secure confirmation link.</p><div className="public-links" style={{ margin: "20px 0" }}><span className="tag blue">1 · Account</span><span className="tag blue">2 · Submission</span><span className="tag blue">3 · Participants</span><span className="tag blue">4 · Review</span></div><form onSubmit={submit}><div className="form-grid"><div className="field full"><label htmlFor="cfp-title">Session title <span>*</span></label><input id="cfp-title" name="title" required placeholder="A clear promise to the audience" /></div><div className="field full"><label htmlFor="cfp-abstract">Abstract <span>*</span></label><textarea id="cfp-abstract" name="abstract" required placeholder="What will attendees learn or be able to do?" /></div><div className="field"><label htmlFor="cfp-format">Session format <span>*</span></label><select id="cfp-format" value={format} onChange={(e) => setFormat(e.target.value)}><option>Workshop</option><option>Talk</option><option>Fireside chat</option></select></div><div className="field"><label htmlFor="cfp-category">Category <span>*</span></label><select id="cfp-category" name="category" defaultValue="Security"><option>Security</option><option>Design Engineering</option><option>Agents</option><option>Infrastructure</option></select></div>{format === "Workshop" ? <div className="field full"><label htmlFor="cfp-hands">Hands-on requirements <span>*</span></label><textarea id="cfp-hands" name="handsOnRequirements" required placeholder="What should attendees bring, install, or prepare?" /><span className="help">This question appears because you chose Workshop.</span></div> : <div className="field full"><div className="empty" style={{ padding: 15 }}><strong>No workshop logistics needed</strong>This conditional answer will not be submitted for a {format.toLowerCase()}.</div></div>}<div className="field"><label htmlFor="cfp-name">Primary speaker <span>*</span></label><input id="cfp-name" name="speakerName" required placeholder="Full name" /></div><div className="field"><label htmlFor="cfp-email">Email <span>*</span></label><input id="cfp-email" name="speakerEmail" required type="email" placeholder="you@example.com" /></div><div className="field"><label htmlFor="cfp-co-name">Co-speaker name</label><input id="cfp-co-name" name="coSpeakerName" placeholder="Optional" /></div><div className="field"><label htmlFor="cfp-co-email">Co-speaker email</label><input id="cfp-co-email" name="coSpeakerEmail" type="email" placeholder="Optional" /></div><div className="field full"><label htmlFor="cfp-file">Supporting material</label><input id="cfp-file" type="file" accept=".pdf,.ppt,.pptx,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] || null)} /><span className="help">Optional now; accepted speakers will receive private slide and document requests.</span></div></div><div className="banner" style={{ marginTop: 17 }}><span>ⓘ</span><div><strong>Before you send</strong> The answer is routed server-side based on your category and format. Hidden conditional fields are never submitted.</div></div><button className="button mint" style={{ marginTop: 5, width: "100%" }}>Review and submit proposal →</button></form></div></section></main>;
}

function PublicProgram({ data, mode }: { data: AppState; mode: "schedule" | "speakers" }) {
  const event = data.event || {};
  const sessions = (data.sessions || []).filter((item) => item.publicState !== "hidden" && item.status !== "draft");
  const speakers = data.speakers || [];
  return <main className="landing"><header className="landing-top"><a className="wordmark" href="/"><span className="mark">PH</span><span>Program Harbor</span></a><div className="public-links" style={{ margin: 0 }}><a href="/schedule">Schedule</a><a href="/speakers">Speakers</a><a href="/cfp">Apply to speak</a></div></header><section style={{ maxWidth: 1120, margin: "3vh auto", padding: "0 20px 60px" }}><span className="eyebrow">{event.name || "AI Engineer Sandbox Summit"} · {event.timezone || "America/Los_Angeles"}</span><h1 style={{ margin: "12px 0 7px", fontSize: "clamp(34px, 6vw, 64px)", letterSpacing: "-.07em" }}>{mode === "schedule" ? "The program, without the hunt." : "Meet the people building it."}</h1><p className="muted" style={{ maxWidth: 620 }}>{mode === "schedule" ? "A mobile itinerary for the AI Engineer Sandbox Summit. Times are shown in the event timezone." : "Find the practitioners behind the sessions. Private onboarding details stay private."}</p>{mode === "schedule" ? <div className="launch-grid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))", marginTop: 28 }}>{sessions.map((session) => <article className="launch-card" style={{ minHeight: 145 }} key={session.id}><span className="eyebrow">{fmtTime(session.startsAt, event.timezone)} · {session.roomName || "TBA"}</span><h3>{session.title}</h3><p>{session.description || "A practical session for people shipping real systems."}</p><div className="public-links" style={{ marginTop: 15 }}><span className="tag">{session.track || "General"}</span><span className="tag blue">{session.speakerName || "Speaker"}</span></div></article>)}</div> : <div className="launch-grid" style={{ marginTop: 28 }}>{speakers.map((speaker) => <article className="launch-card" style={{ minHeight: 180 }} key={speaker.id}><div className="person"><Avatar name={speaker.name} /><div><strong>{speaker.name}</strong><span>{speaker.title || "Speaker"} · {speaker.company || "Independent"}</span></div></div><h3 style={{ marginTop: 20 }}>{speaker.name}</h3><p>{speaker.bio || "Speaker bio coming soon."}</p><div className="public-links" style={{ marginTop: 15 }}><span className="tag">{speaker.track || "Agents"}</span></div></article>)}</div>}<p className="footer-note"><a href="/">Program Harbor demo launchpad</a> · Embeddable mode removes organizer navigation and private fields.</p></section></main>;
}

function ApiDocs() {
  return <main className="landing"><header className="landing-top"><a className="wordmark" href="/"><span className="mark">PH</span><span>Program Harbor</span></a><a className="button secondary" href="/">Back to launchpad</a></header><section style={{ maxWidth: 900, margin: "4vh auto", padding: "0 20px 70px" }}><span className="eyebrow">Developer surface / v1</span><h1 style={{ margin: "12px 0", fontSize: "clamp(38px, 6vw, 64px)", letterSpacing: "-.07em" }}>A small API for the program.</h1><p className="muted" style={{ maxWidth: 650 }}>Stable IDs, pagination, explicit public/private serializers, and an OpenAPI document you can download from <a href="/openapi.yaml" style={{ textDecoration: "underline" }}>openapi.yaml</a>.</p><div className="card" style={{ marginTop: 26 }}><div className="card-head"><div><h2>Resources</h2><p>Demo base URL: /api/v1</p></div><span className="status-pill"><span className="status-dot" /> OpenAPI 3.1</span></div>{["events", "submissions", "speakers", "sessions", "evaluations", "tasks", "schedule", "public agenda"].map((resource) => <div className="task-item" key={resource}><span className="tag blue">GET</span><div className="task-copy"><strong>/api/v1/{resource.replace(" ", "-")}</strong><span>Paginated, stable IDs, role-scoped fields</span></div><span className="tag">200 / 401 / 422</span></div>)}</div><div className="banner" style={{ marginTop: 16 }}><span>ⓘ</span><div><strong>Demo authentication</strong> Admin/evaluator/speaker demo links are isolated to the dedicated demo mode. Public endpoints expose publishable fields only.</div></div></section></main>;
}

function AdminApp() {
  const path = typeof window === "undefined" ? "/admin" : window.location.pathname;
  const section = path.split("/")[2] || "dashboard";
  const { data, error, loading, mutate, toast } = useAppData("admin");
  if (loading) return <div className="loading">Loading the event desk…</div>;
  if (error || !data) return <main className="landing"><section className="landing-hero"><span className="eyebrow">Unable to load demo</span><h1>We could not open the event desk.</h1><p>{error || "No state returned."}</p><a className="button" href="/">Return to launchpad</a></section></main>;
  let content: React.ReactNode;
  if (section === "submissions") content = <SubmissionList data={data} onAction={mutate} />;
  else if (section === "forms") content = <FormBuilder data={data} onAction={mutate} />;
  else if (section === "evaluations") content = <Evaluator data={data} onAction={mutate} />;
  else if (section === "schedule") content = <Schedule data={data} onAction={mutate} />;
  else if (section === "communications") content = <Communications data={data} onAction={mutate} />;
  else if (section === "speakers") content = <Dashboard data={data} onAction={mutate} />;
  else if (section === "integrations") content = <Integrations data={data} onAction={mutate} />;
  else if (section === "settings") content = <Settings data={data} onAction={mutate} />;
  else content = <Dashboard data={data} onAction={mutate} />;
  return <AppShell section={section} data={data} onAction={mutate} toast={toast}>{content}</AppShell>;
}

function Integrations({ data, onAction }: { data: AppState; onAction: (path: string, body?: AnyRecord, method?: string) => Promise<AnyRecord | null> }) {
  const integrations = data.integrations || [{ provider: "Email", mode: "emulator", configured: false, message: "Preview-only demo transport; no recipient sends." }, { provider: "Calendar", mode: "local", configured: true, message: "ICS generation and links available." }, { provider: "Accelevents", mode: "emulator", configured: false, message: "Live credential missing; dry-run emulator is available." }, { provider: "Airtable", mode: "disabled", configured: false, message: "No base or API key configured." }];
  return <><Topbar eyebrow="Configure / integrations" title="External systems, visible state" description="Dry-runs and emulators are useful only when they say exactly what they did." /><div className="grid-2"><section className="card"><div className="card-head"><div><h2>Connections</h2><p>Secrets stay server-side and are never shown here.</p></div><span className="tag">4 providers</span></div>{integrations.map((item: AnyRecord) => <div className="task-item" key={item.provider}><span className="check" style={{ background: item.configured ? "var(--mint)" : "#fff4d8", borderColor: item.configured ? "var(--mint-strong)" : "#e5c77f" }}>{item.configured ? "✓" : "·"}</span><div className="task-copy"><strong>{item.provider}</strong><span>{item.message}</span></div><StatusTag value={item.mode === "emulator" ? "Dry-run" : item.mode === "disabled" ? "Not configured" : "Ready"} /></div>)}</section><section className="card"><div className="card-head"><div><h2>Accelevents diff</h2><p>One-way sync of accepted speakers and sessions.</p></div><StatusTag value="No live credential" /></div><div className="preview"><span className="eyebrow">Last dry-run · just now</span><div className="progress-row" style={{ marginTop: 14 }}><span>Create</span><div className="progress"><span style={{ width: "34%" }} /></div><strong>2</strong></div><div className="progress-row"><span>Update</span><div className="progress"><span style={{ width: "52%" }} /></div><strong>4</strong></div><div className="progress-row"><span>No change</span><div className="progress"><span style={{ width: "100%", background: "var(--faint)" }} /></div><strong>8</strong></div><p className="small muted" style={{ marginTop: 17 }}>The emulator computes a diff and writes no external records. A live run remains blocked until a sandbox event and credential are configured.</p></div><button className="button mint" style={{ marginTop: 14, width: "100%" }} onClick={() => onAction("/api/integrations/accelevents/dry-run", { eventId: data.event?.id })}>Run dry-run diff</button></section></div><section className="card"><div className="card-head"><div><h2>Operation history</h2><p>Retryable errors stay attached to the record that failed.</p></div><span className="status-pill"><span className="status-dot" /> Observable</span></div><div className="table-wrap"><table><thead><tr><th>Run</th><th>Provider</th><th>Mode</th><th>Result</th><th>Last success</th></tr></thead><tbody>{(data.syncHistory || [{ id: "sync-08", provider: "Accelevents", mode: "Dry-run", result: "14 changes · no writes", lastSuccess: "Aug 8, 10:22 AM" }, { id: "sync-07", provider: "Calendar", mode: "Local", result: "8 ICS records generated", lastSuccess: "Aug 8, 10:19 AM" }]).map((item: AnyRecord) => <tr key={item.id}><td className="mono">{item.id}</td><td>{item.provider}</td><td><StatusTag value={item.mode} /></td><td>{item.result}</td><td className="muted">{item.lastSuccess}</td></tr>)}</tbody></table></div></section></>;
}

function Settings({ data, onAction }: { data: AppState; onAction: (path: string, body?: AnyRecord, method?: string) => Promise<AnyRecord | null> }) {
  const event = data.event || {};
  const [name, setName] = useState(event.name || "AI Engineer Sandbox Summit");
  const [timezone, setTimezone] = useState(event.timezone || "America/Los_Angeles");
  const [description, setDescription] = useState(event.description || "A practical summit for people building reliable AI systems.");
  return <><Topbar eyebrow="Configure / event" title="Event settings" description="The basics that flow into forms, schedule, and public pages." action={<button className="button mint" onClick={() => onAction("/api/events", { name, timezone, description })}>Save event</button>} /><section className="card"><div className="card-head"><div><h2>Event details</h2><p>All dates are stored with an explicit event timezone.</p></div><span className="tag good">Persisted</span></div><div className="form-grid"><div className="field"><label htmlFor="event-name">Event name</label><input id="event-name" value={name} onChange={(e) => setName(e.target.value)} /></div><div className="field"><label htmlFor="event-slug">Slug</label><input id="event-slug" defaultValue={event.slug || "ai-engineer-sandbox"} readOnly /></div><div className="field"><label htmlFor="event-timezone">Timezone</label><select id="event-timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)}><option>America/Los_Angeles</option><option>America/New_York</option><option>UTC</option></select></div><div className="field"><label htmlFor="event-duration">Default session duration</label><select id="event-duration" defaultValue="60"><option value="30">30 minutes</option><option value="60">60 minutes</option><option value="90">90 minutes</option></select></div><div className="field full"><label htmlFor="event-description">Description</label><textarea id="event-description" value={description} onChange={(e) => setDescription(e.target.value)} /></div></div></section><div className="grid-2"><section className="card"><div className="card-head"><div><h2>Tracks</h2><p>Colors propagate to the agenda.</p></div><button className="button secondary small-button" disabled>＋ Add</button></div>{(event.tracks || [{ name: "Security", color: "#f28f77" }, { name: "Design Engineering", color: "#6d9eee" }, { name: "Agents", color: "#58c88e" }]).map((track: AnyRecord) => <div className="task-item" key={track.name}><span style={{ width: 10, height: 10, borderRadius: 3, background: track.color }} /><div className="task-copy"><strong>{track.name}</strong><span>Candidate routing and public filter</span></div><span className="tag">Active</span></div>)}</section><section className="card"><div className="card-head"><div><h2>Rooms</h2><p>Conflict checks run on every schedule mutation.</p></div><button className="button secondary small-button" disabled>＋ Add</button></div>{(event.rooms || [{ name: "Main Hall" }, { name: "Workshop Lab" }, { name: "Studio" }, { name: "Rooftop" }]).map((room: AnyRecord) => <div className="task-item" key={room.name}><span className="tag blue">ROOM</span><div className="task-copy"><strong>{room.name}</strong><span>Available for the seeded event</span></div></div>)}</section></div></>;
}

export default function Page() {
  const [pathname, setPathname] = useState("/");
  useEffect(() => { setPathname(window.location.pathname); }, []);
  if (pathname === "/") return <Launchpad />;
  if (pathname.startsWith("/admin")) return <AdminApp />;
  if (pathname.startsWith("/evaluator")) { const app = <EvaluatorPage />; return app; }
  if (pathname.startsWith("/portal")) return <PortalPage />;
  if (pathname.startsWith("/cfp")) return <PublicCFPPage />;
  if (pathname.startsWith("/schedule")) return <PublicProgramPage mode="schedule" />;
  if (pathname.startsWith("/speakers")) return <PublicProgramPage mode="speakers" />;
  if (pathname.startsWith("/api/docs")) return <ApiDocs />;
  return <Launchpad />;
}

function EvaluatorPage() { const { data, error, loading, mutate, toast } = useAppData("evaluator"); if (loading) return <div className="loading">Opening assigned reviews…</div>; if (error || !data) return <main className="landing"><section className="landing-hero"><h1>Review desk unavailable.</h1><p>{error}</p></section></main>; return <div className="app-shell"><aside className="sidebar"><a className="wordmark" href="/"><span className="mark">PH</span><span>Program Harbor</span></a><div className="event-switcher"><span>REVIEWER DEMO</span><strong>Alex Morgan</strong><span>Security plan · Round 1</span></div><div className="sidebar-foot" style={{ display: "block" }}>Assigned submissions are scoped server-side.<br /><a href="/">Back to launchpad ↗</a></div></aside><main className="main"><Evaluator data={data} onAction={mutate} />{toast ? <div className="toast" role="status">{toast}</div> : null}</main></div>; }
function PortalPage() { const { data, error, loading, mutate, toast } = useAppData("speaker"); if (loading) return <div className="loading">Opening secure speaker portal…</div>; if (error || !data) return <main className="landing"><section className="landing-hero"><h1>Portal link unavailable.</h1><p>{error}</p></section></main>; return <><Portal data={data} onAction={mutate} />{toast ? <div className="toast" role="status">{toast}</div> : null}</>; }
function PublicCFPPage() { const { mutate } = useAppData("public"); return <PublicCFP onAction={mutate} />; }
function PublicProgramPage({ mode }: { mode: "schedule" | "speakers" }) { const { data, error, loading } = useAppData("public"); if (loading) return <div className="loading">Loading the public program…</div>; if (error || !data) return <main className="landing"><section className="landing-hero"><h1>Public program unavailable.</h1><p>{error}</p></section></main>; return <PublicProgram data={data} mode={mode} />; }
