require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { diagnoseIssue } = require("./services/aiAgent");

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
