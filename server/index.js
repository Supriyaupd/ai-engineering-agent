require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { diagnoseIssue } = require("./services/aiAgent");
const { readFile, searchCode, runTests } = require("./services/tools");
const { proposeFix } = require("./services/fixGenerator");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/agent/investigate", async (req, res) => {
  const { issue } = req.body;
  if (!issue || typeof issue !== "string") {
    return res.status(400).json({ error: "issue (string) is required" });
  }
  try {
    const diagnosis = await diagnoseIssue(issue);
    res.json(diagnosis);
  } catch (err) {
    console.error("Diagnosis failed:", err.message);
    res.status(500).json({ error: "Failed to generate diagnosis" });
  }
});

app.post("/api/agent/read-file", (req, res) => {
  try {
    const content = readFile(req.body.path);
    res.json({ path: req.body.path, content });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/agent/search-code", (req, res) => {
  try {
    const files = searchCode(req.body.query);
    res.json({ query: req.body.query, files });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/agent/run-tests", (req, res) => {
  try {
    const result = runTests();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to run tests" });
  }
});

app.post("/api/agent/propose-fix", async (req, res) => {
  const { diagnosis, filePath } = req.body;
  try {
    const fileContent = readFile(filePath);
    const fix = await proposeFix(diagnosis, fileContent, filePath);
    res.json(fix);
  } catch (err) {
    console.error("Propose fix failed:", err.message);
    res.status(500).json({ error: "Failed to propose fix" });
  }
});

app.post("/api/agent/apply-fix", (req, res) => {
  const { filePath, originalCode, fixedCode } = req.body;
  try {
    const fullPath = path.resolve(__dirname, "..", filePath);
    const content = fs.readFileSync(fullPath, "utf-8");

    const normalize = (s) => s.replace(/\r\n/g, "\n");
    const normalizedContent = normalize(content);
    const normalizedOriginal = normalize(originalCode);
    const normalizedFixed = normalize(fixedCode);

    if (!normalizedContent.includes(normalizedOriginal)) {
      return res.status(400).json({ error: "Original code not found in file - cannot apply safely" });
    }

    const updated = normalizedContent.replace(normalizedOriginal, normalizedFixed);
    fs.writeFileSync(fullPath, updated, "utf-8");

    const testResult = runTests();

    res.json({
      success: true,
      message: "Fix applied",
      verification: {
        verified: testResult.success,
        testOutput: testResult.output,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));