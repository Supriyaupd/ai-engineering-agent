# AI Engineering Agent

**Investigate to Explain to Fix to Verify**

An AI-powered developer tool that takes a software issue description and runs it through a controlled, human-supervised workflow: it investigates the codebase, proposes a diagnosis, generates a specific code fix, waits for human approval, applies the fix only after approval, and automatically verifies the result by running tests.

## The problem

AI coding tools increasingly can modify code directly - but developers need to stay in control of what actually changes in their codebase, and need proof that a fix actually works before trusting it.

## The solution

AI Engineering Agent gives developers a structured, auditable loop:

1. **Investigate** - describe an issue in plain language
2. **Explain** - the agent returns a structured diagnosis: its understanding of the problem, likely root cause, and relevant files
3. **Fix** - the agent proposes a specific code change as a diff (before/after)
4. **Approve** - nothing is applied without an explicit human approval click
5. **Verify** - once approved, the fix is applied and the test suite runs automatically, reporting verified or needs more work

The human stays in control at every step. The agent never modifies code silently.

## Architecture

- Frontend: React + Vite (client/)
- Backend: Node.js + Express (server/)
- AI: Groq API (OpenAI-compatible) for structured diagnosis and fix generation
- Testing: Node built-in test runner (node --test)

### API endpoints

| Endpoint | Purpose |
|---|---|
| POST /api/agent/investigate | Takes an issue description, returns structured diagnosis JSON |
| POST /api/agent/read-file | Reads a file contents from the project |
| POST /api/agent/search-code | Searches project source files for a query string |
| POST /api/agent/run-tests | Runs the test suite, returns pass/fail + output |
| POST /api/agent/propose-fix | Given a diagnosis and file, proposes a specific diff |
| POST /api/agent/apply-fix | Applies an approved fix, then automatically runs tests and returns verification result |

## Running locally

Backend:

cd server
npm install
node index.js

Create a .env file in server/ with:

GROQ_API_KEY=your_key_here
PORT=5000


Frontend:

cd client
npm install
npm run dev


Open the Vite dev server URL (typically http://localhost:5173).

## Built with IBM Bob

This project was developed with the assistance of IBM Bob during the IBM Bob 2.0 Hackathon. See bob-screenshots/ for task session evidence.

## Tech stack

- React, Vite
- Node.js, Express
- Groq API
- Node built-in test runner

## Future improvements

- GitHub repository integration (issue to PR workflow)
- Restrict AI file-path suggestions to actual project structure
- Persistent history of investigations and fixes
- Authentication for multi-user use
