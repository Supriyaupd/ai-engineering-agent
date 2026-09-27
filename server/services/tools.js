const fs = require("fs");
const path = require("path");
const { execSync, execFileSync } = require("child_process");

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

function readFile(relativePath) {
  const fullPath = path.resolve(PROJECT_ROOT, relativePath);
  if (!fullPath.startsWith(PROJECT_ROOT + path.sep)) throw new Error("Path outside project root");
  if (!fs.existsSync(fullPath)) throw new Error("File not found");
  return fs.readFileSync(fullPath, "utf-8");
}

const util = require("util");
const exec = util.promisify(require("child_process").exec);

async function searchCode(query) {
  // Validate that a non‑empty string query is provided; otherwise return an empty result set
  if (typeof query !== "string" || !query.trim()) {
    return [];
  }

  const dirsToSearch = ["client/src", "server/services"];
  const results = [];
  for (const dir of dirsToSearch) {
    const fullDir = path.join(PROJECT_ROOT, dir);
    if (!fs.existsSync(fullDir) || !fs.statSync(fullDir).isDirectory()) continue;
    try {
      const isWin = process.platform === "win32";
      let stdout;
      if (isWin) {
        // findstr has no safe argument‑based form; use a sanitized literal match only
        const safeQuery = query.replace(/[^a-zA-Z0-9 _\-\.]/g, "");
        if (!safeQuery) return [];
        const cmd = `findstr /s /i /m /c:"${safeQuery}" *.js *.jsx`;
        ({ stdout } = await exec(cmd, { cwd: fullDir, encoding: "utf-8" }));
      } else {
        const cmd = `grep -rl --include=*.js --include=*.jsx "${query}" .`;
        ({ stdout } = await exec(cmd, { cwd: fullDir, encoding: "utf-8" }));
      }
      stdout.split(/\r?\n/).filter(Boolean).forEach((f) => results.push(path.join(dir, f)));
    } catch (err) {
      // grep returns exit code 1 when no matches are found; treat it as an empty result set
      if (err.code !== 1) throw err;
    }
  }
  return results;
}

function runTests() {
  try {
    const output = execSync("npm test", { cwd: path.join(PROJECT_ROOT, "server"), encoding: "utf-8", timeout: 60_000 });
    return { success: true, output };
  } catch (err) {
    return { success: false, output: err.stdout || err.message };
  }
}

module.exports = { readFile, searchCode, runTests };
