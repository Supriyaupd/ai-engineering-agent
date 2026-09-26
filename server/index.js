require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { diagnoseIssue } = require("./services/aiAgent");
const { readFile, searchCode, runTests } = require("./services/tools");

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
  const result = runTests();
  res.json(result);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
