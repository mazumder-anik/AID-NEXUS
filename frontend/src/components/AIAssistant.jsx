import { useState } from 'react';
import { askAI } from '../api/index.js';

export default function AIAssistant() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    
    setLoading(true);
    try {
      const res = await askAI(prompt);
      setResponse(res.data.response);
    } catch (err) {
      setResponse("Error communicating with AI. Make sure GEMINI_API_KEY is set in your .env file.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#c7d2fe', marginBottom: '8px' }}>
        ✨ Gemini AI Assistant
      </div>
      <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '16px' }}>
        Ask Gemini questions about the current community needs to get insights.
      </p>

      <form onSubmit={handleAsk} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. What are the most critical medical needs right now?"
          style={{
            flex: 1, padding: '8px 12px', borderRadius: '6px',
            background: 'rgba(15,22,41,0.6)', border: '1px solid rgba(99,102,241,0.3)',
            color: '#f8fafc', fontSize: '0.8rem'
          }}
        />
        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          style={{
            padding: '8px 16px', borderRadius: '6px', background: '#4f46e5',
            color: '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '0.8rem', fontWeight: 600, opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? 'Asking...' : 'Ask AI'}
        </button>
      </form>

      <div style={{
        flex: 1, background: 'rgba(15,22,41,0.6)', border: '1px solid rgba(99,102,241,0.15)',
        borderRadius: '6px', padding: '16px', overflowY: 'auto', color: '#f1f5f9',
        fontSize: '0.85rem', lineHeight: '1.5', whiteSpace: 'pre-wrap'
      }}>
        {response ? response : <span style={{ color: '#64748b' }}>AI response will appear here...</span>}
      </div>
    </div>
  );
}
