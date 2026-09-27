import { useState, useRef, useEffect } from "react";
import "./App.css";

let idCounter = 0;
const nextId = () => ++idCounter;

function App() {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [issue, setIssue] = useState("");
  const [loading, setLoading] = useState(false);
  const [fixLoadingFor, setFixLoadingFor] = useState(null);
  const [applyingFor, setApplyingFor] = useState(null);
  const scrollRef = useRef(null);

  const active = conversations.find((c) => c.id === activeId) || null;
  const messages = active ? active.messages : [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const addMessage = (convId, message) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId ? { ...c, messages: [...c.messages, message] } : c
      )
    );
  };

  const startNewConversation = () => {
    setActiveId(null);
    setIssue("");
  };

  const handleSend = async () => {
    if (!issue.trim() || loading) return;
    const text = issue.trim();
    setIssue("");
    setLoading(true);

    let convId = activeId;
    if (!convId) {
      convId = nextId();
      const title = text.length > 42 ? text.slice(0, 42) + "..." : text;
      setConversations((prev) => [
        { id: convId, title, messages: [] },
        ...prev,
      ]);
      setActiveId(convId);
    }

    addMessage(convId, { id: nextId(), role: "user", type: "text", text });

    try {
      const res = await fetch("http://localhost:5000/api/agent/investigate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issue: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      addMessage(convId, { id: nextId(), role: "agent", type: "diagnosis", data });
    } catch (err) {
      addMessage(convId, { id: nextId(), role: "agent", type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleProposeFix = async (filePath, diagnosisData) => {
    const convId = activeId;
    setFixLoadingFor(filePath);
    try {
      const res = await fetch("http://localhost:5000/api/agent/propose-fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diagnosis: diagnosisData, filePath }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      addMessage(convId, { id: nextId(), role: "agent", type: "fix", data, resolved: false });
    } catch (err) {
      addMessage(convId, { id: nextId(), role: "agent", type: "error", text: err.message });
    } finally {
      setFixLoadingFor(null);
    }
  };

  const markFixResolved = (convId, msgId) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? {
              ...c,
              messages: c.messages.map((m) =>
                m.id === msgId ? { ...m, resolved: true } : m
              ),
            }
          : c
      )
    );
  };

  const handleApprove = async (msg) => {
    const convId = activeId;
    setApplyingFor(msg.id);
    markFixResolved(convId, msg.id);
    try {
      const res = await fetch("http://localhost:5000/api/agent/apply-fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filePath: msg.data.filePath,
          originalCode: msg.data.originalCode,
          fixedCode: msg.data.fixedCode,
        }),
      });
      const data = await res.json();
      addMessage(convId, { id: nextId(), role: "agent", type: "verification", data });
    } catch (err) {
      addMessage(convId, { id: nextId(), role: "agent", type: "error", text: err.message });
    } finally {
      setApplyingFor(null);
    }
  };

  const handleReject = (msg) => {
    markFixResolved(activeId, msg.id);
    addMessage(activeId, { id: nextId(), role: "agent", type: "rejected" });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <button className="new-chat-btn" onClick={startNewConversation}>
          + New investigation
        </button>
        <div className="sidebar-title">History</div>
        {conversations.length === 0 && (
          <p className="sidebar-empty">Your investigations will appear here.</p>
        )}
        <ul className="history-list">
          {conversations.map((c) => (
            <li
              key={c.id}
              className={"history-item " + (c.id === activeId ? "active" : "")}
              onClick={() => setActiveId(c.id)}
            >
              {c.title}
            </li>
          ))}
        </ul>
      </aside>

      <main className="chat-main">
        <div className="chat-header">
          <div className="chat-title">Code Sentinel</div>
          <div className="chat-subtitle">Investigate - Explain - Fix - Verify</div>
        </div>

        <div className="thread" ref={scrollRef}>
          {messages.length === 0 && (
            <div className="empty-state">
              <div className="hero-avatar">AI</div>
              <h2>Ready to fix something?</h2>
              <p className="empty-hint">Describe a bug below. Nothing is ever applied without your approval, and every fix is verified by running real tests.</p>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={"msg-row " + (m.role === "user" ? "from-user" : "from-agent")}>
              <div className="msg-avatar">{m.role === "user" ? "You" : "Agent"}</div>
              <div className="msg-bubble">
                {m.type === "text" && <p>{m.text}</p>}

                {m.type === "error" && <p className="msg-error">{m.text}</p>}

                {m.type === "rejected" && <p className="msg-muted">Fix rejected. No changes were made.</p>}

                {m.type === "diagnosis" && (
                  <div>
                    <div className="msg-label">Diagnosis</div>
                    <p><strong>Understanding:</strong> {m.data.understanding}</p>
                    <p><strong>Likely cause:</strong> {m.data.likelyCause}</p>
                    <div className="msg-label" style={{ marginTop: "0.6rem" }}>Files to inspect</div>
                    <ul className="file-list">
                      {m.data.filesToInspect.map((f) => (
                        <li className="file-item" key={f}>
                          <span className="file-path">{f}</span>
                          <button
                            className="btn btn-secondary"
                            onClick={() => handleProposeFix(f, m.data)}
                            disabled={fixLoadingFor !== null}
                          >
                            {fixLoadingFor === f ? "Working..." : "Propose fix"}
                          </button>
                        </li>
                      ))}
                    </ul>
                    <p style={{ marginTop: "0.6rem" }}><strong>Suggested fix:</strong> {m.data.suggestedFix}</p>
                  </div>
                )}

                {m.type === "fix" && (
                  <div>
                    <div className="msg-label">Proposed change - {m.data.filePath}</div>
                    <p>{m.data.explanation}</p>
                    <div className="diff-block diff-remove">- {m.data.originalCode}</div>
                    <div className="diff-block diff-add">+ {m.data.fixedCode}</div>
                    {!m.resolved && (
                      <div className="button-row">
                        <button className="btn btn-approve" onClick={() => handleApprove(m)} disabled={applyingFor === m.id}>
                          {applyingFor === m.id ? "Applying and testing..." : "Approve"}
                        </button>
                        <button className="btn btn-reject" onClick={() => handleReject(m)} disabled={applyingFor === m.id}>
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {m.type === "verification" && (
                  <div className={m.data.verification?.verified ? "verify-ok" : m.data.error ? "verify-error" : "verify-warn"}>
                    <div className="msg-label">Verification</div>
                    {m.data.error && <p><strong>{m.data.error}</strong></p>}
                    {m.data.success && (
                      <>
                        <p><strong>{m.data.verification?.verified ? "Fix verified - all tests passed" : "Needs more work - tests failed"}</strong></p>
                        <div className="test-output">{m.data.verification?.testOutput}</div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="msg-row from-agent">
              <div className="msg-avatar">Agent</div>
              <div className="msg-bubble"><p className="msg-muted">Investigating...</p></div>
            </div>
          )}
        </div>

        <div className="composer">
          <textarea
            className="composer-input"
            placeholder="Describe a bug or issue..."
            value={issue}
            onChange={(e) => setIssue(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button className="btn btn-primary" onClick={handleSend} disabled={loading || !issue.trim()}>
            Send
          </button>
        </div>
      </main>
    </div>
  );
}

export default App;


