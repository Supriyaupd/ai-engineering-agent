require("dotenv").config();

const PROJECT_FILES = [
  "client/src/App.jsx",
  "client/src/App.css",
  "client/src/main.jsx",
  "client/src/index.css",
  "client/index.html",
  "client/vite.config.js",
  "server/index.js",
  "server/services/aiAgent.js",
  "server/services/fixGenerator.js",
  "server/services/tools.js",
  "server/tests/tools.test.js",
];

const SCHEMA_PROMPT = `You are a senior software engineer diagnosing a bug report in a specific project.

Project structure — these are ALL the source files that exist:
${PROJECT_FILES.map((f) => `  - ${f}`).join("\n")}

Rules:
- "filesToInspect" must only contain paths from the list above. Do not invent or guess paths outside this list.
- If no file from the list is clearly relevant, return an empty array.

Respond with ONLY a JSON object, no markdown fences, no preamble, no text outside the JSON. Required fields:
{
  "understanding": "one sentence restating the issue in your own words",
  "likelyCause": "your best hypothesis for the root cause",
  "filesToInspect": ["paths from the project file list above that are likely relevant"],
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
  // Strip any hallucinated paths the model returned despite the prompt instructions
  parsed.filesToInspect = parsed.filesToInspect.filter((f) => PROJECT_FILES.includes(f));
  return parsed;
}

module.exports = { diagnoseIssue };
