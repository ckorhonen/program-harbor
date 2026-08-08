import { getStore } from "../src/lib/store";

const state = getStore().resetDemo();

console.log(JSON.stringify({
  message: "Program Harbor demo reset completed.",
  revision: state.revision,
  updatedAt: state.updatedAt,
}, null, 2));
