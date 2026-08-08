import { assertSeedCounts, seedDemoState } from "../src/lib/seed";
import { getStore } from "../src/lib/store";

const state = seedDemoState();
assertSeedCounts(state);
const persisted = getStore().resetDemo();

console.log(JSON.stringify({
  message: "Program Harbor demo seed restored.",
  revision: persisted.revision,
  event: persisted.events[0]?.name,
  submissions: persisted.submissions.length,
  speakers: persisted.speakers.length,
  sessions: persisted.sessions.length,
}, null, 2));
