import { useState } from "react";

function App() {
  const [issue, setIssue] = useState("");
  const [diagnosis, setDiagnosis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [selectedFile, setSelectedFile] = useState("");
  const [fix, setFix] = useState(null);
  const [fixLoading, setFixLoading] = useState(false);
  const [applyResult, setApplyResult] = useState(null);
  const [applying, setApplying] = useState(false);

  const handleInvestigate = async () => {
    setLoading(true);
    setError(null);
    setDiagnosis(null);
    setFix(null);
    setApplyResult(null);
    try {
      const res = await fetch("http://localhost:5000/api/agent/investigate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issue }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setDiagnosis(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProposeFix = async (filePath) => {
    setSelectedFile(filePath);
    setFixLoading(true);
    setFix(null);
    setApplyResult(null);
    setError(null);
    try {
      const res = await fetch("http://localhost:5000/api/agent/propose-fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diagnosis, filePath }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setFix(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setFixLoading(false);
    }
  };

  const handleApprove = async () => {
    setApplying(true);
    try {
      const res = await fetch("http://localhost:5000/api/agent/apply-fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filePath: fix.filePath,
          originalCode: fix.originalCode,
          fixedCode: fix.fixedCode,
        }),
      });
      const data = await res.json();
      setApplyResult(data);
    } catch (err) {
      setApplyResult({ error: err.message });
    } finally {
      setApplying(false);
    }
  };

  const handleReject = () => {
    setFix(null);
    setSelectedFile("");
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: 700 }}>
      <h1>AI Engineering Agent</h1>
      <p style={{ color: "#888" }}>Investigate to Explain to Fix to Verify</p>

      <p>Describe your issue:</p>
      <input
        style={{ width: "100%", padding: "0.5rem" }}
        value={issue}
        onChange={(e) => setIssue(e.target.value)}
      />
      <button onClick={handleInvestigate} disabled={loading} style={{ marginTop: "1rem" }}>
        {loading ? "Investigating..." : "Investigate"}
      </button>

      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      {diagnosis && (
        <div style={{ marginTop: "1.5rem", border: "1px solid #ccc", padding: "1rem" }}>
          <p><strong>Understanding:</strong> {diagnosis.understanding}</p>
          <p><strong>Likely Cause:</strong> {diagnosis.likelyCause}</p>
          <p><strong>Files to inspect:</strong></p>
          <ul>
            {diagnosis.filesToInspect.map((f) => (
              <li key={f}>
                {f}{" "}
                <button onClick={() => handleProposeFix(f)} disabled={fixLoading}>
                  {fixLoading && selectedFile === f ? "Generating fix..." : "Propose Fix"}
                </button>
              </li>
            ))}
          </ul>
          <p><strong>Suggested Fix:</strong> {diagnosis.suggestedFix}</p>
        </div>
      )}

      {fix && (
        <div style={{ marginTop: "1.5rem", border: "1px solid #888", padding: "1rem" }}>
          <h3>Proposed Change - {fix.filePath}</h3>
          <p>{fix.explanation}</p>
          <pre style={{ background: "#fee", padding: "0.5rem", whiteSpace: "pre-wrap" }}>
            - {fix.originalCode}
          </pre>
          <pre style={{ background: "#efe", padding: "0.5rem", whiteSpace: "pre-wrap" }}>
            + {fix.fixedCode}
          </pre>
          <button onClick={handleApprove} disabled={applying} style={{ marginRight: "1rem" }}>
            {applying ? "Applying & testing..." : "Approve"}
          </button>
          <button onClick={handleReject} disabled={applying}>Reject</button>
        </div>
      )}

      {applyResult && (
        <div style={{ marginTop: "1.5rem", padding: "1rem", border: "2px solid", borderColor: applyResult.verification?.verified ? "green" : "orange" }}>
          {applyResult.error && <p style={{ color: "red" }}>Error: {applyResult.error}</p>}
          {applyResult.success && (
            <>
              <p>Fix applied</p>
              {applyResult.verification?.verified ? (
                <p style={{ color: "green", fontWeight: "bold" }}>FIX VERIFIED - all tests passed</p>
              ) : (
                <p style={{ color: "orange", fontWeight: "bold" }}>NEEDS MORE WORK - tests failed</p>
              )}
              <pre style={{ background: "#f5f5f5", padding: "0.5rem", fontSize: "0.85rem", whiteSpace: "pre-wrap" }}>
                {applyResult.verification?.testOutput}
              </pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default App;