const { AppServerClient } = require("../src/appServerClient");
const { codexCwd } = require("../src/paths");

async function main() {
  const cwd = codexCwd();
  const client = new AppServerClient({ cwd });
  client.start();
  try {
    await client.initialize();
    const result = await client.send("thread/list", {
      cwd,
      limit: 1,
      archived: false
    });
    if (!Array.isArray(result.data)) throw new Error("thread/list response missing data array");
    console.log(`app-server ok: ${result.data.length} thread(s) visible for ${cwd}`);
  } finally {
    client.stop();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
