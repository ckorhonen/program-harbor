import { getStore } from "../src/lib/store";

async function main() {
  const state = await (await getStore()).resetDemo();

  console.log(JSON.stringify({
    message: "Program Harbor demo reset completed.",
    revision: state.revision,
    updatedAt: state.updatedAt,
  }, null, 2));
}

void main();
