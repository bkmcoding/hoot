import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { launch as launchChrome } from "chrome-launcher";
import lighthouse from "lighthouse";

const PORT = 4173;
const URL = `http://127.0.0.1:${PORT}/`;
const OUTPUT_DIR = ".quality";

function startServer() {
  return new Promise((resolve, reject) => {
    const server = spawn(process.execPath, ["tools/serve-frontend.mjs"], {
      cwd: process.cwd(),
      env: { ...process.env, PORT: String(PORT) },
      stdio: "ignore",
    });
    server.once("error", reject);
    resolve(server);
  });
}

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(URL);
      if (response.ok) return;
    } catch {
      // Wait for the server to finish booting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Static server did not start at ${URL}`);
}

const server = await startServer();
let chrome;

try {
  await waitForServer();
  chrome = await launchChrome({ chromeFlags: ["--headless"] });
  const result = await lighthouse(URL, {
    port: chrome.port,
    output: "json",
  });

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUTPUT_DIR, "lighthouse-report.json"), result.report);

  const categories = JSON.parse(result.report).categories;
  for (const category of Object.values(categories)) {
    console.log(`${category.title}: ${Math.round(category.score * 100)}/100`);
  }
  console.log(`Report saved to ${path.join(OUTPUT_DIR, "lighthouse-report.json")}`);
} finally {
  if (chrome) await chrome.kill();
  server.kill();
}
