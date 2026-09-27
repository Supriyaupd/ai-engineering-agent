require("dotenv").config();

const FIX_PROMPT = `You are a senior software engineer. Given a diagnosis and the content of a relevant file, propose a specific code fix. Respond with ONLY a JSON object, no markdown fences, no text outside the JSON:
{
  "filePath": "the file path being changed",
  "explanation": "one sentence on what the fix does",
  "originalCode": "the exact original code snippet being replaced, verbatim from the file",
  "fixedCode": "the replacement code snippet"
}`;

async function proposeFix(diagnosis, fileContent, filePath) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b",
      messages: [
        { role: "system", content: FIX_PROMPT },
        { role: "user", content: `Diagnosis: ${JSON.stringify(diagnosis)}\n\nFile: ${filePath}\n\nContent:\n${fileContent}` },
      ],
      max_tokens: 2500,
    }),
  });

  const data = await response.json();
  const rawText = data.choices?.[0]?.message?.content ?? "";
  const cleaned = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
  return JSON.parse(cleaned);
}

module.exports = { proposeFix };

