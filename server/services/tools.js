const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

function readFile(relativePath) {
  const fullPath = path.join(PROJECT_ROOT, relativePath);
  if (!fullPath.startsWith(PROJECT_ROOT)) throw new Error("Path outside project root");
  if (!fs.existsSync(fullPath)) throw new Error("File not found");
  return fs.readFileSync(fullPath, "utf-8");
}

function searchCode(query) {
  const dirsToSearch = ["client/src", "server/services"];
  const results = [];
  for (const dir of dirsToSearch) {
    const fullDir = path.join(PROJECT_ROOT, dir);
    if (!fs.existsSync(fullDir) || !fs.statSync(fullDir).isDirectory()) continue;
    try {
      const cmd = `findstr /s /i /m /c:"${query}" *.js *.jsx`;
      const output = execSync(cmd, { cwd: fullDir, encoding: "utf-8" });
      output.split("\r\n").filter(Boolean).forEach((f) => results.push(path.join(dir, f)));
    } catch (err) {
      if (err.status !== 1) throw err;
    }
  }
  return results;
}

function runTests() {
  try {
    const output = execSync("npm test", { cwd: path.join(PROJECT_ROOT, "server"), encoding: "utf-8" });
    return { success: true, output };
  } catch (err) {
    return { success: false, output: err.stdout || err.message };
  }
}

module.exports = { readFile, searchCode, runTests };
