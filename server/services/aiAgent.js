require("dotenv").config();

const SCHEMA_PROMPT = `You are a senior software engineer diagnosing a bug report. Respond with ONLY a JSON object, no markdown fences, no preamble, no text outside the JSON. Required fields:
{
  "understanding": "one sentence restating the issue in your own words",
  "likelyCause": "your best hypothesis for the root cause",
  "filesToInspect": ["array of likely-relevant relative file paths, best guesses are fine"],
  "suggestedFix": "short description of the likely fix, not code yet"
}`;

async function diagnoseIssue(issueText) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b",
      messages: [
        { role: "system", content: SCHEMA_PROMPT },
        { role: "user", content: `Bug report: ${issueText}` },
      ],
      max_tokens: 500,
    }),
  });

  const data = await response.json();
  const rawText = data.choices?.[0]?.message?.content ?? "";
  return parseDiagnosis(rawText);
}

function parseDiagnosis(rawText) {
  const cleaned = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
  const parsed = JSON.parse(cleaned);
  const required = ["understanding", "likelyCause", "filesToInspect", "suggestedFix"];
  const missing = required.filter((f) => !(f in parsed));
  if (missing.length > 0) throw new Error(`Missing fields: ${missing.join(", ")}`);
  return parsed;
}

module.exports = { diagnoseIssue };
