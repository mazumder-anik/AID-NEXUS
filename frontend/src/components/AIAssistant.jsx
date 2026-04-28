import { useEffect, useRef, useState, useCallback } from 'react';
import { askAI } from '../api/index.js';

/* ─── Suggestion chips by category ───────────────────────────────────────── */
const SUGGESTIONS = [
  { icon: '🚨', label: 'Most urgent needs right now?' },
  { icon: '👥', label: 'How many volunteers are available?' },
  { icon: '📊', label: 'Give me a summary of the dashboard' },
  { icon: '🏥', label: 'Which medical needs are critical?' },
  { icon: '🔗', label: 'Show recent volunteer matches' },
  { icon: '📍', label: 'What areas need most attention?' },
  { icon: '🍎', label: 'Status of food aid needs?' },
  { icon: '🎓', label: 'Any education needs unmatched?' },
];

/* ─── Minimal markdown → HTML renderer ───────────────────────────────────── */
function renderMarkdown(text) {
  if (!text) return '';
  return text
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="chat-inline-code">$1</code>')
    // Bullet lines (- or *)
    .replace(/^[\-\*] (.+)$/gm, '<li>$1</li>')
    // Wrap consecutive <li> in <ul>
    .replace(/(<li>.*<\/li>\n?)+/gs, (match) => `<ul class="chat-list">${match}</ul>`)
    // Headers
    .replace(/^### (.+)$/gm, '<h4 class="chat-h4">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="chat-h3">$1</h3>')
    // Horizontal rules
    .replace(/━+/g, '<hr class="chat-hr" />')
    // Line breaks
    .replace(/\n/g, '<br />');
}

/* ─── Typing dots animation ───────────────────────────────────────────────── */
function TypingIndicator() {
  return (
    <div className="chat-bubble assistant typing-bubble">
      <div className="chat-avatar">🤖</div>
      <div className="chat-bubble-body">
        <div className="typing-dots">
          <span /><span /><span />
        </div>
      </div>
    </div>
  );
}

/* ─── Single message bubble ───────────────────────────────────────────────── */
function MessageBubble({ msg, isNew }) {
  const isUser = msg.role === 'user';
  const html = isUser ? null : renderMarkdown(msg.text);

  return (
    <div className={`chat-bubble ${msg.role} ${isNew ? 'slide-in' : ''}`}>
      {!isUser && <div className="chat-avatar">🤖</div>}
      <div className="chat-bubble-body">
        <div className="chat-bubble-role">
          {isUser ? 'You' : 'AID-NEXUS Assistant'}
        </div>
        {isUser ? (
          <div className="chat-bubble-text">{msg.text}</div>
        ) : (
          <div
            className="chat-bubble-text markdown-body"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
        <div className="chat-bubble-time">{msg.time}</div>
      </div>
      {isUser && <div className="chat-avatar user-avatar">🧑</div>}
    </div>
  );
}

/* ─── Main chatbot component ──────────────────────────────────────────────── */
export default function AIAssistant() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: `**Welcome to AID-NEXUS Assistant!** 👋\n\nI'm your AI-powered coordinator for the Smart Resource Allocation platform. I have real-time access to:\n\n- 🚨 All open community needs & urgency scores\n- 👥 Volunteer availability and skill profiles\n- 🔗 Current volunteer-to-need matches\n- 📊 Live dashboard statistics\n\nAsk me anything — from *"Which needs are critical right now?"* to *"Recommend priorities for medical aid."*`,
      time: formatTime(),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [newMsgIndex, setNewMsgIndex] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  function formatTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = useCallback(async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg = { role: 'user', text: trimmed, time: formatTime() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setShowSuggestions(false);
    setNewMsgIndex(null);

    // Build history to send (exclude the greeting, send last N turns)
    const historyToSend = messages
      .filter((m) => m.role === 'user' || (m.role === 'assistant' && messages.indexOf(m) > 0))
      .slice(-8)
      .map((m) => ({ role: m.role, text: m.text }));

    try {
      const res = await askAI(trimmed, historyToSend);
      const reply = res.data?.response || 'No response received.';
      const assistantMsg = { role: 'assistant', text: reply, time: formatTime() };
      setMessages((prev) => {
        setNewMsgIndex(prev.length);
        return [...prev, assistantMsg];
      });
    } catch (err) {
      const errMsg = {
        role: 'assistant',
        text: '⚠️ **Connection error.** Could not reach the AI backend. Please make sure the backend server is running at `localhost:8000`.',
        time: formatTime(),
      };
      setMessages((prev) => [...prev, errMsg]);
      console.error('AI chat error:', err);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [loading, messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleSuggestion = (label) => {
    sendMessage(label);
  };

  const handleClear = () => {
    setMessages([
      {
        role: 'assistant',
        text: `**Chat cleared.** How can I help you? Ask me about needs, volunteers, or matches in the system.`,
        time: formatTime(),
      },
    ]);
    setShowSuggestions(true);
    setNewMsgIndex(null);
  };

  return (
    <div className="chatbot-root">
      {/* ── Header ── */}
      <div className="chatbot-header">
        <div className="chatbot-header-left">
          <div className="chatbot-avatar-ring">
            <span className="chatbot-header-icon">🤖</span>
            <span className="chatbot-online-dot" />
          </div>
          <div>
            <div className="chatbot-header-title">AID-NEXUS Assistant</div>
            <div className="chatbot-header-sub">Powered by Gemini · Live project data</div>
          </div>
        </div>
        <button
          className="chatbot-clear-btn"
          onClick={handleClear}
          title="Clear conversation"
          type="button"
        >
          🗑 Clear
        </button>
      </div>

      {/* ── Suggestion chips ── */}
      {showSuggestions && (
        <div className="chatbot-suggestions-bar">
          <div className="chatbot-suggestions-label">💡 Quick Questions</div>
          <div className="chatbot-chips">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.label}
                type="button"
                className="chatbot-chip"
                onClick={() => handleSuggestion(s.label)}
                disabled={loading}
              >
                <span>{s.icon}</span> {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Messages ── */}
      <div className="chatbot-messages" id="chatbot-messages-viewport">
        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} isNew={i === newMsgIndex} />
        ))}
        {loading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input bar ── */}
      <form className="chatbot-input-bar" onSubmit={handleSubmit}>
        <button
          type="button"
          className="chatbot-suggestions-toggle"
          onClick={() => setShowSuggestions((v) => !v)}
          title={showSuggestions ? 'Hide suggestions' : 'Show suggestions'}
          disabled={loading}
        >
          💡
        </button>
        <input
          ref={inputRef}
          id="chatbot-input"
          type="text"
          className="chatbot-input"
          placeholder="Ask about needs, volunteers, matches…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          autoComplete="off"
          maxLength={500}
        />
        <button
          id="chatbot-send-btn"
          type="submit"
          className="chatbot-send-btn"
          disabled={loading || !input.trim()}
        >
          {loading ? (
            <span className="chatbot-spinner" />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </button>
      </form>
    </div>
  );
}
