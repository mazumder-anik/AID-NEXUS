import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadNeedsCSV } from '../api/index.js';

export default function UploadPanel({ onUploadDone }) {
  const [file,     setFile]     = useState(null);
  const [preview,  setPreview]  = useState([]);
  const [headers,  setHeaders]  = useState([]);
  const [result,   setResult]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  const onDrop = useCallback((accepted) => {
    if (!accepted.length) return;
    const f = accepted[0];
    setFile(f);
    setResult(null);
    setError(null);

    // Parse preview locally
    const reader = new FileReader();
    reader.onload = (e) => {
      const lines = e.target.result.split('\n').filter(Boolean);
      const h = lines[0].split(',').map(s => s.trim());
      const rows = lines.slice(1, 6).map(l => {
        const vals = l.split(',').map(s => s.trim());
        return Object.fromEntries(h.map((hh, i) => [hh, vals[i] ?? '']));
      });
      setHeaders(h);
      setPreview(rows);
    };
    reader.readAsText(f);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    multiple: false,
  });

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await uploadNeedsCSV(formData);
      setResult(res.data);
      onUploadDone && onUploadDone();
    } catch(e) {
      setError(e.response?.data?.detail || 'Upload failed. Check CSV format.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null); setPreview([]); setHeaders([]); setResult(null); setError(null);
  };

  return (
    <div style={{ padding:16, display:'flex', flexDirection:'column', gap:12, height:'100%', overflowY:'auto' }}>
      <div style={{ fontSize:'0.8rem', fontWeight:700, color:'#c7d2fe' }}>
        📂 Upload Survey Data
      </div>
      <p style={{ fontSize:'0.7rem', color:'#64748b', lineHeight:1.5 }}>
        Upload CSV files from field surveys, paper forms, or NGO reports.
        The system will automatically aggregate, normalize, and score the data.
      </p>

      {!file ? (
        <div
          {...getRootProps()}
          className={`drop-zone ${isDragActive ? 'drag-active' : ''}`}
        >
          <input {...getInputProps()} id="csv-file-input" />
          <div style={{ fontSize:'2rem', marginBottom:8 }}>📄</div>
          <div style={{ fontSize:'0.8rem', color:'#64748b', fontWeight:600 }}>
            {isDragActive ? 'Drop the CSV here...' : 'Drag & drop a CSV file here'}
          </div>
          <div style={{ fontSize:'0.68rem', color:'#475569', marginTop:4 }}>
            or click to browse
          </div>
        </div>
      ) : (
        <div style={{
          background:'rgba(21,29,53,0.8)', border:'1px solid rgba(99,102,241,0.2)',
          borderRadius:8, padding:10,
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <div style={{ fontSize:'0.75rem', color:'#c7d2fe' }}>
              📄 {file.name}
              <span style={{ color:'#475569', marginLeft:8 }}>
                ({(file.size/1024).toFixed(1)} KB)
              </span>
            </div>
            <button className="btn btn-ghost" onClick={handleReset} style={{fontSize:'0.65rem'}}>✕</button>
          </div>

          {/* Preview table */}
          {preview.length > 0 && (
            <div style={{ overflowX:'auto', marginBottom:10 }}>
              <div style={{ fontSize:'0.65rem', color:'#475569', marginBottom:4 }}>
                Preview (first 5 rows):
              </div>
              <table style={{
                width:'100%', borderCollapse:'collapse', fontSize:'0.62rem',
              }}>
                <thead>
                  <tr>
                    {headers.slice(0, 6).map(h => (
                      <th key={h} style={{
                        padding:'4px 6px', textAlign:'left',
                        background:'rgba(99,102,241,0.15)', color:'#818cf8',
                        borderBottom:'1px solid rgba(99,102,241,0.2)',
                        whiteSpace:'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i}>
                      {headers.slice(0, 6).map(h => (
                        <td key={h} style={{
                          padding:'4px 6px', color:'#94a3b8',
                          borderBottom:'1px solid rgba(99,102,241,0.08)',
                          maxWidth:'100px', overflow:'hidden',
                          textOverflow:'ellipsis', whiteSpace:'nowrap',
                        }}>{row[h]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={handleUpload}
            disabled={loading}
            id="aggregate-score-btn"
            style={{ width:'100%', justifyContent:'center' }}
          >
            {loading ? <><span className="spinner" style={{marginRight:6}}/>Processing…</> : '🔄 Aggregate & Score'}
          </button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div style={{
          background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.25)',
          borderRadius:8, padding:12, fontSize:'0.75rem',
        }}>
          <div style={{ color:'#4ade80', fontWeight:700, marginBottom:4 }}>✅ Upload Successful</div>
          <div style={{ color:'#86efac' }}>{result.message}</div>
          <div style={{ color:'#64748b', marginTop:4 }}>
            {result.scored} needs re-scored with updated urgency.
          </div>
        </div>
      )}

      {error && (
        <div style={{
          background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)',
          borderRadius:8, padding:12, fontSize:'0.75rem', color:'#f87171',
        }}>
          ❌ {error}
        </div>
      )}

      {/* Format guide */}
      <div style={{
        background:'rgba(15,22,41,0.5)', border:'1px solid rgba(99,102,241,0.15)',
        borderRadius:8, padding:10,
      }}>
        <div style={{ fontSize:'0.68rem', color:'#475569', fontWeight:700, marginBottom:6 }}>
          SUPPORTED CSV COLUMNS
        </div>
        {[
          ['area / location / zone', 'Area name (string)'],
          ['lat + lng',              'Coordinates (decimal)'],
          ['category / need_type',   'food|medical|education|shelter|sanitation'],
          ['reported_count',         'Number of people affected'],
          ['description / summary',  'Short description of the need'],
          ['reported_at / date',     'Date (YYYY-MM-DD)'],
        ].map(([col, desc]) => (
          <div key={col} style={{ display:'flex', gap:8, marginBottom:3 }}>
            <code style={{ fontSize:'0.6rem', color:'#818cf8', background:'rgba(99,102,241,0.1)',
              padding:'1px 4px', borderRadius:3, whiteSpace:'nowrap' }}>
              {col}
            </code>
            <span style={{ fontSize:'0.62rem', color:'#64748b' }}>{desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
