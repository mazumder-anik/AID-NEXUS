import { useEffect, useRef, useState } from 'react';
import { askAI } from '../api/index.js';

const SUGGESTION_ITEMS = [
  'Find best volunteer for this need',
  'Summarize urgent needs in the area',
  'Recommend priorities for medical supplies',
  'Which needs are most time-sensitive?',
];

export default function AIAssistant() {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hello! I can help you analyze urgent needs, volunteer matches, and data priorities.' },
  ]);
  const [loading, setLoading] = useState(false);
  const viewportRef = useRef(null);

  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
    }
  }, [messages]);

  const addMessage = (message) => setMessages((current) => [...current, message]);

  const handleAsk = async (event) => {
    event.preventDefault();
    if (!prompt.trim()) return;

    const userMessage = { role: 'user', text: prompt.trim() };
    addMessage(userMessage);
    setPrompt('');
    setLoading(true);

    try {
      const result = await askAI(userMessage.text);
      addMessage({ role: 'assistant', text: result.data.response || 'No response received.' });
    } catch (error) {
      addMessage({
        role: 'assistant',
        text: 'Error communicating with AI assistant. Please check the backend and try again.',
      });
      console.error('AI ask failed', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-assistant-panel">
      <div className="ai-assistant-header">
        <div>
          <div className="panel-title">✨ AI Assistant</div>
          <p className="panel-subtitle">
            Ask questions about urgent needs, matching, or volunteer prioritization.
          </p>
        </div>
      </div>

      <div className="ai-suggestion-row">
        {SUGGESTION_ITEMS.map((text) => (
          <button
            type="button"
            key={text}
            className="btn btn-ghost ai-suggestion"
            onClick={() => setPrompt(text)}
          >
            {text}
          </button>
        ))}
      </div>

      <div className="ai-messages" ref={viewportRef}>
        {messages.map((message, index) => (
          <div key={index} className={`ai-message ${message.role}`}> 
            <div className="ai-message-role">{message.role === 'user' ? 'You' : 'Assistant'}</div>
            <div className="ai-message-text">{message.text}</div>
          </div>
        ))}
      </div>

      <form className="ai-input-row" onSubmit={handleAsk}>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask the assistant about urgent needs or volunteer matching"
          className="ai-input"
          disabled={loading}
        />
        <button type="submit" className="btn btn-primary" disabled={loading || !prompt.trim()}>
          {loading ? 'Sending…' : 'Send'}
        </button>
      </form>
    </div>
  );
}
