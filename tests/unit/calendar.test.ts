import { describe, expect, it } from "vitest";
import {
  buildCalendarLinks,
  buildGoogleCalendarUrl,
  buildOutlookCalendarUrl,
  generateICS,
  nextCalendarSequence,
  stableCalendarUid,
} from "../../src/lib/calendar";

function unfoldIcs(ics: string): string[] {
  return ics
    .split("\r\n")
    .reduce<string[]>((lines, line) => {
      if (line.startsWith(" ") || line.startsWith("\t")) {
        lines[lines.length - 1] += line.slice(1);
      } else if (line.length > 0) {
        lines.push(line);
      }
      return lines;
    }, []);
}

function unescapeIcsText(value: string): string {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\([\\;,])/g, "$1");
}

function parseEventProperties(ics: string): Map<string, { name: string; parameters: string; value: string }> {
  const lines = unfoldIcs(ics);
  const start = lines.indexOf("BEGIN:VEVENT");
  const end = lines.indexOf("END:VEVENT");
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);

  const properties = new Map<string, { name: string; parameters: string; value: string }>();
  for (const line of lines.slice(start + 1, end)) {
    const colon = line.indexOf(":");
    expect(colon).toBeGreaterThan(0);
    const nameAndParameters = line.slice(0, colon);
    const value = line.slice(colon + 1);
    const [name, ...parameters] = nameAndParameters.split(";");
    properties.set(name, { name, parameters: parameters.join(";"), value });
  }
  return properties;
}

const baseEvent = {
  sessionId: "session-42",
  title: "Reliable Agents, Safely",
  start: "2026-08-12T18:00:00.000Z",
  end: "2026-08-12T19:30:00.000Z",
  timezone: "America/New_York",
  organizer: { name: "Program Harbor", email: "organizer@example.test" },
  location: "Cedar Room, 123 Main St",
  description: "Bring a laptop;\nwe will build a small agent.",
  dtstamp: "2026-08-01T12:00:00.000Z",
};

describe("RFC calendar invitations", () => {
  it("emits a parseable timezone-aware VEVENT with escaped content", () => {
    const ics = generateICS(baseEvent);
    const event = parseEventProperties(ics);

    expect(ics).toMatch(/^BEGIN:VCALENDAR\r\n/);
    expect(ics).toMatch(/\r\nEND:VCALENDAR\r\n$/);
    expect(ics).toContain("BEGIN:VTIMEZONE");
    expect(event.get("UID")?.value).toBe("session-42@program-harbor.local");
    expect(event.get("DTSTART")?.parameters).toBe("TZID=America/New_York");
    expect(event.get("DTSTART")?.value).toBe("20260812T140000");
    expect(event.get("DTEND")?.value).toBe("20260812T153000");
    expect(event.get("SUMMARY")?.value).toBe("Reliable Agents\\, Safely");
    expect(unescapeIcsText(event.get("DESCRIPTION")?.value ?? "")).toBe(baseEvent.description);
    expect(event.get("LOCATION")?.value).toBe("Cedar Room\\, 123 Main St");
    expect(event.get("ORGANIZER")?.value).toBe("mailto:organizer@example.test");
    expect(event.get("SEQUENCE")?.value).toBe("0");

    for (const line of ics.split("\r\n").filter(Boolean)) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
  });

  it("keeps UID stable while a schedule update increments SEQUENCE", () => {
    const initial = parseEventProperties(generateICS({ ...baseEvent, sequence: 0 }));
    const update = parseEventProperties(
      generateICS({
        ...baseEvent,
        title: "Reliable Agents, Safely (updated)",
        start: "2026-08-12T19:00:00.000Z",
        end: "2026-08-12T20:30:00.000Z",
        sequence: nextCalendarSequence(0),
      }),
    );

    expect(update.get("UID")?.value).toBe(initial.get("UID")?.value);
    expect(initial.get("SEQUENCE")?.value).toBe("0");
    expect(update.get("SEQUENCE")?.value).toBe("1");
    expect(update.get("DTSTART")?.value).toBe("20260812T150000");
    expect(nextCalendarSequence(4)).toBe(5);
  });

  it("converts a DST-boundary instant into the requested local timezone", () => {
    const event = parseEventProperties(
      generateICS({
        ...baseEvent,
        sessionId: "dst-session",
        start: "2026-03-08T18:00:00.000Z",
        end: "2026-03-08T19:30:00.000Z",
        timezone: "America/Los_Angeles",
      }),
    );

    expect(event.get("DTSTART")?.parameters).toBe("TZID=America/Los_Angeles");
    expect(event.get("DTSTART")?.value).toBe("20260308T110000");
    expect(event.get("DTEND")?.value).toBe("20260308T123000");
  });

  it("folds long UTF-8 content without changing the unfolded property value", () => {
    const title = `Agent ${"🌲".repeat(40)} session`;
    const ics = generateICS({ ...baseEvent, title, sessionId: "folded-session" });
    const event = parseEventProperties(ics);

    expect(ics.split("\r\n").some((line) => line.startsWith(" "))).toBe(true);
    expect(unescapeIcsText(event.get("SUMMARY")?.value ?? "")).toBe(title);
  });

  it("supports cancellation while retaining the same event identity", () => {
    const event = parseEventProperties(
      generateICS({ ...baseEvent, status: "CANCELLED", sequence: 2 }),
    );
    const lines = unfoldIcs(generateICS({ ...baseEvent, status: "CANCELLED", sequence: 2 }));

    expect(lines).toContain("METHOD:CANCEL");
    expect(event.get("STATUS")?.value).toBe("CANCELLED");
    expect(event.get("SEQUENCE")?.value).toBe("2");
    expect(event.get("UID")?.value).toBe(stableCalendarUid("session-42"));
  });
});

describe("calendar convenience links", () => {
  it("uses the same canonical timezone-aware event in Google and Outlook links", () => {
    const google = new URL(buildGoogleCalendarUrl(baseEvent));
    const outlook = new URL(buildOutlookCalendarUrl(baseEvent));
    const links = buildCalendarLinks(baseEvent);

    expect(google.origin).toBe("https://calendar.google.com");
    expect(google.searchParams.get("action")).toBe("TEMPLATE");
    expect(google.searchParams.get("ctz")).toBe("America/New_York");
    expect(google.searchParams.get("dates")).toBe("20260812T180000Z/20260812T193000Z");
    expect(google.searchParams.get("text")).toBe(baseEvent.title);

    expect(outlook.origin).toBe("https://outlook.live.com");
    expect(outlook.searchParams.get("rru")).toBe("addevent");
    expect(outlook.searchParams.get("timezone")).toBe("America/New_York");
    expect(outlook.searchParams.get("startdt")).toBe("2026-08-12T14:00:00-04:00");
    expect(outlook.searchParams.get("enddt")).toBe("2026-08-12T15:30:00-04:00");
    expect(new URL(links.google).toString()).toBe(google.toString());
    expect(new URL(links.outlook).toString()).toBe(outlook.toString());
  });
});
