import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export type CalendarDateInput = Date | string | number;
export type CalendarMethod = "REQUEST" | "PUBLISH" | "CANCEL";
export type CalendarEventStatus = "TENTATIVE" | "CONFIRMED" | "CANCELLED";

export interface CalendarOrganizer {
  name?: string;
  email: string;
}

export interface CalendarAttendee {
  name?: string;
  email: string;
  rsvp?: boolean;
  role?: "REQ-PARTICIPANT" | "OPT-PARTICIPANT" | "NON-PARTICIPANT";
}

export interface CalendarEventInput {
  /** A stable session identifier used to derive UID when `uid` is omitted. */
  sessionId?: string;
  uid?: string;
  title: string;
  start: CalendarDateInput;
  end: CalendarDateInput;
  timezone: string;
  organizer: CalendarOrganizer;
  location?: string;
  description?: string;
  sequence?: number;
  method?: CalendarMethod;
  status?: CalendarEventStatus;
  url?: string;
  attendees?: readonly CalendarAttendee[];
  /** Use a persisted timestamp for deterministic delivery logs and tests. */
  dtstamp?: CalendarDateInput;
  lastModified?: CalendarDateInput;
}

interface NormalizedCalendarEvent {
  uid: string;
  title: string;
  start: Date;
  end: Date;
  timezone: string;
  organizer: CalendarOrganizer;
  location?: string;
  description?: string;
  sequence: number;
  method: CalendarMethod;
  status: CalendarEventStatus;
  url?: string;
  attendees: readonly CalendarAttendee[];
  dtstamp: Date;
  lastModified?: Date;
}

const UTC_TIMEZONES = new Set(["UTC", "Etc/UTC", "GMT", "Etc/GMT"]);
const DAY_MS = 24 * 60 * 60 * 1000;
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

function assertNonEmpty(value: string, label: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new TypeError(`${label} must be a non-empty string`);
  }
  return normalized;
}

function assertTimeZone(timezone: string): string {
  const normalized = assertNonEmpty(timezone, "timezone");
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: normalized }).format(new Date(0));
  } catch {
    throw new RangeError(`Unknown IANA timezone: ${normalized}`);
  }
  return normalized;
}

function assertValidDate(value: Date, label: string): Date {
  if (Number.isNaN(value.getTime())) {
    throw new RangeError(`${label} must be a valid date`);
  }
  return value;
}

function hasExplicitOffset(value: string): boolean {
  return /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value.trim());
}

function resolveDate(value: CalendarDateInput, timezone: string, label: string): Date {
  if (value instanceof Date) {
    return assertValidDate(new Date(value.getTime()), label);
  }

  if (typeof value === "number") {
    return assertValidDate(new Date(value), label);
  }

  const normalized = assertNonEmpty(value, label);
  const resolved = hasExplicitOffset(normalized)
    ? new Date(normalized)
    : fromZonedTime(normalized, timezone);
  return assertValidDate(resolved, label);
}

function safeUidPart(value: string): string {
  return [...value]
    .map((character) => {
      if (/[A-Za-z0-9.!#$%&'*+\-/=?^_`{|}~]/.test(character)) {
        return character;
      }
      const codePoint = character.codePointAt(0) ?? 0;
      return `-${codePoint.toString(16)}-`;
    })
    .join("");
}

export function stableCalendarUid(sessionId: string, domain = "program-harbor.local"): string {
  const normalizedSessionId = assertNonEmpty(sessionId, "sessionId");
  const normalizedDomain = assertNonEmpty(domain, "UID domain");
  if (/[\r\n]/.test(normalizedSessionId) || /[\r\n]/.test(normalizedDomain)) {
    throw new TypeError("Calendar UID parts cannot contain line breaks");
  }
  return `${safeUidPart(normalizedSessionId)}@${normalizedDomain}`;
}

export const createCalendarUid = stableCalendarUid;
export const getStableCalendarUid = stableCalendarUid;

function resolveUid(input: CalendarEventInput): string {
  if (input.uid !== undefined) {
    return assertNonEmpty(input.uid, "uid").replace(/[\r\n]/g, "");
  }
  if (input.sessionId === undefined) {
    throw new TypeError("sessionId is required when uid is omitted");
  }
  return stableCalendarUid(input.sessionId);
}

function normalizeCalendarEventRecord(input: CalendarEventInput): NormalizedCalendarEvent {
  if (!input || typeof input !== "object") {
    throw new TypeError("Calendar event input is required");
  }

  const timezone = assertTimeZone(input.timezone);
  const title = assertNonEmpty(input.title, "title");
  const organizerEmail = assertNonEmpty(input.organizer?.email ?? "", "organizer email");
  if (!/^[^\s@]+@[^\s@]+$/.test(organizerEmail)) {
    throw new TypeError("organizer email must be a valid email address");
  }
  const start = resolveDate(input.start, timezone, "start");
  const end = resolveDate(input.end, timezone, "end");
  if (end.getTime() <= start.getTime()) {
    throw new RangeError("Calendar event end must be after start");
  }

  const sequence = input.sequence ?? 0;
  if (!Number.isInteger(sequence) || sequence < 0) {
    throw new RangeError("Calendar sequence must be a non-negative integer");
  }

  const status = input.status ?? "CONFIRMED";
  const method = input.method ?? (status === "CANCELLED" ? "CANCEL" : "REQUEST");
  const dtstamp = input.dtstamp === undefined ? new Date(start.getTime()) : resolveDate(input.dtstamp, timezone, "dtstamp");
  const lastModified =
    input.lastModified === undefined ? undefined : resolveDate(input.lastModified, timezone, "lastModified");

  return {
    uid: resolveUid(input),
    title,
    start,
    end,
    timezone,
    organizer: { name: input.organizer.name?.trim() || undefined, email: organizerEmail },
    location: input.location?.trim() || undefined,
    description: input.description,
    sequence,
    method,
    status,
    url: input.url?.trim() || undefined,
    attendees: input.attendees ?? [],
    dtstamp,
    lastModified,
  };
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function escapeParameter(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r\n|\r|\n/g, " ")}"`;
}

function escapeUri(value: string): string {
  return value.replace(/\r\n|\r|\n/g, "");
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function formatLocalDateTime(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, "yyyyMMdd'T'HHmmss");
}

function formatUtcDateTime(date: Date): string {
  return formatInTimeZone(date, "UTC", "yyyyMMdd'T'HHmmss'Z'");
}

function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? "-" : "+";
  const absolute = Math.abs(minutes);
  return `${sign}${pad(Math.floor(absolute / 60))}${pad(absolute % 60)}`;
}

function formatOffsetDateTime(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function offsetMinutesAt(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );
  return Math.round((asUtc - date.getTime()) / 60_000);
}

interface TimezoneTransition {
  at: Date;
  from: number;
  to: number;
}

function findTimezoneTransitions(timezone: string, start: Date, end: Date): TimezoneTransition[] {
  const rangeStart = new Date(start.getTime() - 370 * DAY_MS);
  const rangeEnd = new Date(end.getTime() + 370 * DAY_MS);
  const transitions: TimezoneTransition[] = [];
  let cursor = rangeStart;
  let currentOffset = offsetMinutesAt(cursor, timezone);

  while (cursor.getTime() < rangeEnd.getTime()) {
    const next = new Date(Math.min(cursor.getTime() + SIX_HOURS_MS, rangeEnd.getTime()));
    const nextOffset = offsetMinutesAt(next, timezone);
    if (nextOffset !== currentOffset) {
      let low = cursor.getTime();
      let high = next.getTime();
      while (high - low > 1_000) {
        const middle = Math.floor((low + high) / 2);
        if (offsetMinutesAt(new Date(middle), timezone) === currentOffset) {
          low = middle;
        } else {
          high = middle;
        }
      }
      transitions.push({ at: new Date(high), from: currentOffset, to: nextOffset });
      currentOffset = nextOffset;
    }
    cursor = next;
  }

  return transitions;
}

function buildVTimezone(timezone: string, start: Date, end: Date): string[] {
  const transitions = findTimezoneTransitions(timezone, start, end);
  const lines = ["BEGIN:VTIMEZONE", `TZID:${escapeIcsText(timezone)}`, `X-LIC-LOCATION:${escapeIcsText(timezone)}`];

  if (transitions.length === 0) {
    const offset = offsetMinutesAt(start, timezone);
    lines.push(
      "BEGIN:STANDARD",
      `DTSTART:${formatLocalDateTime(start, timezone)}`,
      `TZOFFSETFROM:${formatOffset(offset)}`,
      `TZOFFSETTO:${formatOffset(offset)}`,
      "END:STANDARD",
    );
  } else {
    for (const transition of transitions) {
      const type = transition.to > transition.from ? "DAYLIGHT" : "STANDARD";
      lines.push(
        `BEGIN:${type}`,
        `DTSTART:${formatLocalDateTime(transition.at, timezone)}`,
        `TZOFFSETFROM:${formatOffset(transition.from)}`,
        `TZOFFSETTO:${formatOffset(transition.to)}`,
        `END:${type}`,
      );
    }
  }

  lines.push("END:VTIMEZONE");
  return lines;
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

/** Fold an iCalendar content line at 75 UTF-8 octets as required by RFC 5545. */
export function foldIcsLine(line: string): string {
  const chunks: string[] = [];
  let current = "";

  for (const character of [...line]) {
    const candidate = current + character;
    if (current.length > 0 && byteLength(candidate) > 75) {
      chunks.push(current);
      current = ` ${character}`;
    } else {
      current = candidate;
    }
  }

  chunks.push(current);
  return chunks.join("\r\n");
}

function formatOrganizer(organizer: CalendarOrganizer): string {
  const prefix = organizer.name ? `;CN=${escapeParameter(organizer.name)}` : "";
  return `ORGANIZER${prefix}:mailto:${escapeUri(organizer.email)}`;
}

function formatAttendee(attendee: CalendarAttendee): string {
  const parameters = [
    attendee.name ? `CN=${escapeParameter(attendee.name)}` : undefined,
    attendee.role ? `ROLE=${attendee.role}` : undefined,
    attendee.rsvp === undefined ? undefined : `RSVP=${attendee.rsvp ? "TRUE" : "FALSE"}`,
  ].filter((parameter): parameter is string => parameter !== undefined);
  return `ATTENDEE${parameters.length > 0 ? `;${parameters.join(";")}` : ""}:mailto:${escapeUri(attendee.email)}`;
}

function isUtcTimezone(timezone: string): boolean {
  return UTC_TIMEZONES.has(timezone);
}

export function normalizeCalendarEvent(input: CalendarEventInput): Readonly<NormalizedCalendarEvent> {
  return normalizeCalendarEventRecord(input);
}

export function generateICS(input: CalendarEventInput): string {
  const event = normalizeCalendarEventRecord(input);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Program Harbor//Program Operations Calendar 1.0//EN",
    "CALSCALE:GREGORIAN",
    `METHOD:${event.method}`,
    `X-WR-TIMEZONE:${escapeIcsText(event.timezone)}`,
  ];

  if (!isUtcTimezone(event.timezone)) {
    lines.push(...buildVTimezone(event.timezone, event.start, event.end));
  }

  lines.push(
    "BEGIN:VEVENT",
    `UID:${escapeIcsText(event.uid)}`,
    `DTSTAMP:${formatUtcDateTime(event.dtstamp)}`,
    isUtcTimezone(event.timezone)
      ? `DTSTART:${formatUtcDateTime(event.start)}`
      : `DTSTART;TZID=${event.timezone}:${formatLocalDateTime(event.start, event.timezone)}`,
    isUtcTimezone(event.timezone)
      ? `DTEND:${formatUtcDateTime(event.end)}`
      : `DTEND;TZID=${event.timezone}:${formatLocalDateTime(event.end, event.timezone)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    formatOrganizer(event.organizer),
    `STATUS:${event.status}`,
    `SEQUENCE:${event.sequence}`,
    "TRANSP:OPAQUE",
  );

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  }
  if (event.location) {
    lines.push(`LOCATION:${escapeIcsText(event.location)}`);
  }
  if (event.url) {
    lines.push(`URL:${escapeUri(event.url)}`);
  }
  if (event.lastModified) {
    lines.push(`LAST-MODIFIED:${formatUtcDateTime(event.lastModified)}`);
  }
  for (const attendee of event.attendees) {
    const email = assertNonEmpty(attendee.email, "attendee email");
    if (!/^[^\s@]+@[^\s@]+$/.test(email)) {
      throw new TypeError("attendee email must be a valid email address");
    }
    lines.push(formatAttendee({ ...attendee, email }));
  }

  lines.push("END:VEVENT", "END:VCALENDAR");
  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}

// Alias kept explicit for route code and tests that prefer the conventional
// camel-case spelling.
export const generateIcs = generateICS;
export const createCalendarInvitation = generateICS;
export const createIcs = generateICS;

export function nextCalendarSequence(sequence: number): number {
  if (!Number.isInteger(sequence) || sequence < 0) {
    throw new RangeError("Calendar sequence must be a non-negative integer");
  }
  return sequence + 1;
}

function normalizedForLink(input: CalendarEventInput): NormalizedCalendarEvent {
  return normalizeCalendarEventRecord(input);
}

export function buildGoogleCalendarUrl(input: CalendarEventInput): string {
  const event = normalizedForLink(input);
  const params = new URLSearchParams();
  params.set("action", "TEMPLATE");
  params.set("text", event.title);
  params.set("dates", `${formatUtcDateTime(event.start)}/${formatUtcDateTime(event.end)}`);
  if (event.description) {
    params.set("details", event.description);
  }
  if (event.location) {
    params.set("location", event.location);
  }
  params.set("ctz", event.timezone);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export const googleCalendarUrl = buildGoogleCalendarUrl;
export const buildGoogleCalendarLink = buildGoogleCalendarUrl;

export function buildOutlookCalendarUrl(input: CalendarEventInput): string {
  const event = normalizedForLink(input);
  const params = new URLSearchParams();
  params.set("path", "/calendar/action/compose");
  params.set("rru", "addevent");
  params.set("startdt", formatOffsetDateTime(event.start, event.timezone));
  params.set("enddt", formatOffsetDateTime(event.end, event.timezone));
  params.set("subject", event.title);
  if (event.description) {
    params.set("body", event.description);
  }
  if (event.location) {
    params.set("location", event.location);
  }
  params.set("timezone", event.timezone);
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

export const outlookCalendarUrl = buildOutlookCalendarUrl;
export const buildOutlookCalendarLink = buildOutlookCalendarUrl;

export function buildCalendarLinks(input: CalendarEventInput): {
  google: string;
  outlook: string;
} {
  return {
    google: buildGoogleCalendarUrl(input),
    outlook: buildOutlookCalendarUrl(input),
  };
}
