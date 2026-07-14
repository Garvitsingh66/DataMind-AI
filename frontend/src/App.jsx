import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, Database, History, Settings, Sun, Moon, User, 
  UploadCloud, Play, Copy, Download, CheckCircle2, AlertCircle, 
  BarChart3, LineChart, PieChart, Activity, ArrowRight, Trash2, 
  FileSpreadsheet, FileText, Check, ChevronLeft, ChevronRight, RefreshCw, Star
} from 'lucide-react';
import PlotlyChart from './components/PlotlyChart';

export default function App() {
  const [theme, setTheme] = useState('dark');
  const [question, setQuestion] = useState('');
  const [apiBase, setApiBase] = useState('http://localhost:8000');
  const [showSettings, setShowSettings] = useState(false);
  const [datasets, setDatasets] = useState([]);
  const [history, setHistory] = useState([]);
  const [messages, setMessages] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState({ type: '', text: '' });
  
  // Dashboard cards state (from active message or default metadata)
  const [stats, setStats] = useState({
    datasetsLoaded: 0,
    modelName: 'Groq Llama 3.1',
    queryTime: '0.0s',
    rowsReturned: 0
  });

  // Loading stepper states
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingSteps, setThinkingSteps] = useState([
    { label: 'Understanding question', status: 'idle' }, // idle, active, done
    { label: 'Writing SQL', status: 'idle' },
    { label: 'Executing query', status: 'idle' },
    { label: 'Creating insights', status: 'idle' }
  ]);

  const [copySuccess, setCopySuccess] = useState(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Sync dark class on body/html
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      document.body.style.backgroundColor = '#0F172A';
    } else {
      root.classList.remove('dark');
      document.body.style.backgroundColor = '#F8FAFC';
    }
  }, [theme]);

  // Load initial backend info
  useEffect(() => {
    fetchDatasets();
    fetchHistory();
  }, [apiBase]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const fetchDatasets = async () => {
    try {
      const res = await fetch(`${apiBase}/datasets`);
      if (res.ok) {
        const data = await res.json();
        setDatasets(data.datasets || []);
        setStats(prev => ({ ...prev, datasetsLoaded: data.datasets?.length || 0 }));
      }
    } catch (err) {
      console.error("Failed to fetch datasets", err);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${apiBase}/history`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.items || []);
      }
    } catch (err) {
      console.error("Failed to fetch history", err);
    }
  };

  // Drag and drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.csv')) {
        await uploadFile(file);
      } else {
        showStatus('error', 'Only CSV files are supported.');
      }
    }
  };

  const handleFileInput = async (e) => {
    if (e.target.files && e.target.files[0]) {
      await uploadFile(e.target.files[0]);
    }
  };

  const showStatus = (type, text) => {
    setUploadStatus({ type, text });
    setTimeout(() => setUploadStatus({ type: '', text: '' }), 5000);
  };

  const uploadFile = async (file) => {
    showStatus('info', `Uploading ${file.name}...`);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${apiBase}/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        showStatus('success', `Successfully loaded table "${data.table_name}"`);
        fetchDatasets();
      } else {
        showStatus('error', data.detail || 'Failed to upload CSV.');
      }
    } catch (err) {
      showStatus('error', 'Server connection error.');
    }
  };

  const deleteDataset = async (name) => {
    if (!confirm(`Are you sure you want to delete dataset "${name}"?`)) return;
    try {
      const res = await fetch(`${apiBase}/datasets/${name}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchDatasets();
        showStatus('success', `Deleted dataset "${name}"`);
      } else {
        const data = await res.json();
        showStatus('error', data.detail || 'Failed to delete dataset.');
      }
    } catch (err) {
      showStatus('error', 'Server connection error.');
    }
  };

  // Thinking workflow animation simulation
  const runThinkingStepper = async (callback) => {
    setIsThinking(true);
    // Reset steps
    setThinkingSteps([
      { label: 'Understanding question', status: 'active' },
      { label: 'Writing SQL', status: 'idle' },
      { label: 'Executing query', status: 'idle' },
      { label: 'Creating insights', status: 'idle' }
    ]);

    const stepIntervals = [
      { step: 0, delay: 500 },
      { step: 1, delay: 1000 },
      { step: 2, delay: 1500 },
      { step: 3, delay: 2000 }
    ];

    const timeline = [];
    
    // Simulate thinking state transitions
    const s1 = setTimeout(() => {
      setThinkingSteps(steps => {
        const next = [...steps];
        next[0].status = 'done';
        next[1].status = 'active';
        return next;
      });
    }, 600);

    const s2 = setTimeout(() => {
      setThinkingSteps(steps => {
        const next = [...steps];
        next[1].status = 'done';
        next[2].status = 'active';
        return next;
      });
    }, 1200);

    const s3 = setTimeout(() => {
      setThinkingSteps(steps => {
        const next = [...steps];
        next[2].status = 'done';
        next[3].status = 'active';
        return next;
      });
    }, 1800);

    timeline.push(s1, s2, s3);

    try {
      const result = await callback();
      timeline.forEach(t => clearTimeout(t));
      
      // Complete all steps
      setThinkingSteps([
        { label: 'Understanding question', status: 'done' },
        { label: 'Writing SQL', status: 'done' },
        { label: 'Executing query', status: 'done' },
        { label: 'Creating insights', status: 'done' }
      ]);
      
      setTimeout(() => {
        setIsThinking(false);
      }, 300);

      return result;
    } catch (err) {
      timeline.forEach(t => clearTimeout(t));
      setIsThinking(false);
      throw err;
    }
  };

  const handleAsk = async (textToAsk = null, confirmedSql = null) => {
    const queryText = textToAsk || question;
    if (!queryText.trim() && !confirmedSql) return;

    if (!textToAsk) {
      setQuestion('');
    }

    // Add user query to messages
    const userMsgId = Date.now();
    setMessages(prev => [...prev, { id: userMsgId, type: 'user', text: queryText }]);

    try {
      const responseData = await runThinkingStepper(async () => {
        const res = await fetch(`${apiBase}/ask`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: queryText,
            confirmed_sql: confirmedSql
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'FastAPI returned an error.');
        return data;
      });

      // Update dashboard top cards
      setStats(prev => ({
        ...prev,
        queryTime: `${responseData.query_time_sec}s`,
        rowsReturned: responseData.row_count
      }));

      // Add response message
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'bot',
        data: responseData,
        selectedChartType: responseData.chart_type || 'bar',
        tablePage: 1
      }]);

      fetchHistory();
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'bot',
        error: err.message
      }]);
    }
  };

  // Re-run generated SQL
  const handleRerun = (sql, originalQuestion) => {
    handleAsk(originalQuestion, sql);
  };

  // Utility functions for column diagnostics & interactive plotting overrides
  const detectColumnTypes = (columns, rows) => {
    const numeric = [];
    const date = [];
    const categorical = [];
    
    if (rows.length === 0) return { numeric, date, categorical };

    columns.forEach(col => {
      const val = rows[0][col];
      if (typeof val === 'number' && !isNaN(val)) {
        numeric.push(col);
      } else if (
        typeof val === 'string' && 
        (col.toLowerCase().includes('date') || col.toLowerCase().includes('time') || col.toLowerCase().includes('month') || col.toLowerCase().includes('day') || /^\d{4}-\d{2}-\d{2}/.test(val))
      ) {
        date.push(col);
      } else {
        categorical.push(col);
      }
    });

    return { numeric, date, categorical };
  };

  // Build client-side Plotly config
  const getChartFigure = (rows, columns, type, origQuestion) => {
    const { numeric, date, categorical } = detectColumnTypes(columns, rows);
    if (rows.length === 0) return { data: [], layout: {} };

    let data = [];
    let layout = {
      title: origQuestion,
      margin: { l: 50, r: 30, t: 50, b: 50 },
      hovermode: 'closest',
    };

    const xCol = date[0] || categorical[0] || columns[0];
    const yCol = numeric[0] || columns[1] || columns[0];

    // Color definitions
    const mainColor = '#3B82F6';
    const accentColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

    if (type === 'line') {
      const sorted = [...rows];
      // Sort if date is present
      if (date[0]) {
        sorted.sort((a, b) => String(a[date[0]]).localeCompare(String(b[date[0]])));
      }
      
      const catCol = categorical.find(c => c !== xCol);
      if (catCol) {
        const groups = {};
        sorted.forEach(row => {
          const cat = row[catCol] || 'Other';
          if (!groups[cat]) groups[cat] = [];
          groups[cat].push(row);
        });

        data = Object.keys(groups).map((cat, i) => ({
          x: groups[cat].map(r => r[xCol]),
          y: groups[cat].map(r => r[yCol]),
          type: 'scatter',
          mode: 'lines+markers',
          name: String(cat),
          line: { color: accentColors[i % accentColors.length], width: 2 }
        }));
      } else {
        data = [{
          x: sorted.map(r => r[xCol]),
          y: sorted.map(r => r[yCol]),
          type: 'scatter',
          mode: 'lines+markers',
          name: yCol,
          line: { color: mainColor, width: 3 }
        }];
      }
      layout.xaxis = { title: xCol };
      layout.yaxis = { title: yCol };

    } else if (type === 'bar') {
      const catCol = categorical.find(c => c !== xCol);
      if (catCol) {
        const groups = {};
        rows.forEach(row => {
          const cat = row[catCol] || 'Other';
          if (!groups[cat]) groups[cat] = [];
          groups[cat].push(row);
        });

        data = Object.keys(groups).map((cat, i) => ({
          x: groups[cat].map(r => r[xCol]),
          y: groups[cat].map(r => r[yCol]),
          type: 'bar',
          name: String(cat),
          marker: { color: accentColors[i % accentColors.length] }
        }));
        layout.barmode = 'group';
      } else {
        data = [{
          x: rows.map(r => r[xCol]),
          y: rows.map(r => r[yCol]),
          type: 'bar',
          marker: { color: mainColor }
        }];
      }
      layout.xaxis = { title: xCol };
      layout.yaxis = { title: yCol };

    } else if (type === 'pie') {
      data = [{
        labels: rows.map(r => r[xCol]),
        values: rows.map(r => r[yCol]),
        type: 'pie',
        textinfo: 'percent+label',
        hole: 0.35
      }];

    } else if (type === 'scatter') {
      const sX = numeric[0] || columns[0];
      const sY = numeric[1] || columns[1] || columns[0];
      
      const catCol = categorical[0];
      if (catCol) {
        const groups = {};
        rows.forEach(row => {
          const cat = row[catCol] || 'Other';
          if (!groups[cat]) groups[cat] = [];
          groups[cat].push(row);
        });

        data = Object.keys(groups).map((cat, i) => ({
          x: groups[cat].map(r => r[sX]),
          y: groups[cat].map(r => r[sY]),
          type: 'scatter',
          mode: 'markers',
          name: String(cat),
          marker: { size: 10, color: accentColors[i % accentColors.length] }
        }));
      } else {
        data = [{
          x: rows.map(r => r[sX]),
          y: rows.map(r => r[sY]),
          type: 'scatter',
          mode: 'markers',
          marker: { size: 10, color: mainColor }
        }];
      }
      layout.xaxis = { title: sX };
      layout.yaxis = { title: sY };
    }

    return { data, layout };
  };

  // Dynamic chart selector override handler
  const handleChartTypeChange = (msgId, newType) => {
    setMessages(prev => prev.map(m => {
      if (m.id === msgId) {
        return { ...m, selectedChartType: newType };
      }
      return m;
    }));
  };

  // Pagination handler
  const handlePageChange = (msgId, direction) => {
    setMessages(prev => prev.map(m => {
      if (m.id === msgId) {
        const curPage = m.tablePage || 1;
        const total = m.data ? Math.ceil(m.data.rows.length / 8) : 1;
        let newPage = curPage;
        if (direction === 'next' && curPage < total) newPage++;
        if (direction === 'prev' && curPage > 1) newPage--;
        return { ...m, tablePage: newPage };
      }
      return m;
    }));
  };

  // Export functions
  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(id);
    setTimeout(() => setCopySuccess(null), 3000);
  };

  const downloadSQL = (sql, filename = 'query') => {
    const blob = new Blob([sql], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.sql`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportCSV = (cols, rows, filename = 'export') => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + [cols.join(",")].concat(
          rows.map(r => cols.map(c => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(","))
        ).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportExcel = (cols, rows, filename = 'export') => {
    let html = '<table><thead><tr>' + cols.map(c => `<th>${c}</th>`).join('') + '</tr></thead><tbody>';
    rows.forEach(r => {
      html += '<tr>' + cols.map(c => `<td>${r[c] ?? ''}</td>`).join('') + '</tr>';
    });
    html += '</tbody></table>';
    
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const triggerPDF = () => {
    window.print();
  };

  // Colors & styles mapping based on theme
  const getThemeClass = (darkCls, lightCls) => {
    return theme === 'dark' ? darkCls : lightCls;
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${getThemeClass('bg-[#0F172A] text-slate-100', 'bg-[#F8FAFC] text-slate-900')}`}>
      
      {/* HEADER BANNER */}
      <header className={`sticky top-0 z-40 border-b backdrop-blur-md transition-colors ${getThemeClass('border-slate-800 bg-[#0F172A]/80 text-white', 'border-slate-200 bg-white/80 text-slate-950')}`}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          
          {/* Logo & Banner */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-500 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.25)]">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-extrabold tracking-tight text-lg md:text-xl flex items-center gap-2 font-display">
                AI Data Analyst Copilot
              </h1>
              <p className={`text-[11px] font-medium tracking-wide ${getThemeClass('text-slate-400', 'text-slate-500')}`}>
                Powered by <span className="text-blue-500 font-bold">Groq</span> + <span className="text-emerald-500 font-bold">DuckDB</span> &bull; Analyze CSVs in Natural Language
              </p>
            </div>
          </div>

          {/* Top Dashboard stats cards (Compact version inside header) */}
          <div className="hidden lg:flex items-center gap-4">
            <div className={`px-3 py-1.5 rounded-lg border flex flex-col ${getThemeClass('bg-slate-900/40 border-slate-800', 'bg-slate-100 border-slate-200')}`}>
              <span className={`text-[10px] uppercase font-semibold ${getThemeClass('text-slate-400', 'text-slate-500')}`}>Dataset</span>
              <span className="text-xs font-bold text-blue-500">{stats.datasetsLoaded} CSV Loaded</span>
            </div>
            <div className={`px-3 py-1.5 rounded-lg border flex flex-col ${getThemeClass('bg-slate-900/40 border-slate-800', 'bg-slate-100 border-slate-200')}`}>
              <span className={`text-[10px] uppercase font-semibold ${getThemeClass('text-slate-400', 'text-slate-500')}`}>AI Model</span>
              <span className="text-xs font-bold text-indigo-400">{stats.modelName}</span>
            </div>
            <div className={`px-3 py-1.5 rounded-lg border flex flex-col ${getThemeClass('bg-slate-900/40 border-slate-800', 'bg-slate-100 border-slate-200')}`}>
              <span className={`text-[10px] uppercase font-semibold ${getThemeClass('text-slate-400', 'text-slate-500')}`}>Query Time</span>
              <span className="text-xs font-bold text-amber-500">{stats.queryTime}</span>
            </div>
            <div className={`px-3 py-1.5 rounded-lg border flex flex-col ${getThemeClass('bg-slate-900/40 border-slate-800', 'bg-slate-100 border-slate-200')}`}>
              <span className={`text-[10px] uppercase font-semibold ${getThemeClass('text-slate-400', 'text-slate-500')}`}>Rows Returned</span>
              <span className="text-xs font-bold text-emerald-500">{stats.rowsReturned}</span>
            </div>
          </div>

          {/* Action buttons (Right-aligned) */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className={`p-2 rounded-lg border transition-all ${getThemeClass('bg-slate-800 border-slate-700 text-yellow-400 hover:bg-slate-700', 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200')}`}
              title="Toggle Light/Dark Theme"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg border transition-all ${getThemeClass('bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700', 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200')} ${showSettings ? 'ring-2 ring-blue-500' : ''}`}
              title="API Base Settings"
            >
              <Settings className="h-4 w-4" />
            </button>
            <div className={`p-2 rounded-lg border flex items-center justify-center ${getThemeClass('bg-slate-800 border-slate-700 text-slate-300', 'bg-slate-100 border-slate-200 text-slate-700')}`}>
              <User className="h-4 w-4" />
            </div>
          </div>
        </div>
      </header>

      {/* SETTINGS CARD DROPDOWN */}
      {showSettings && (
        <div className={`max-w-7xl mx-auto w-full px-4 mt-4 transition-all duration-300`}>
          <div className={`p-4 rounded-xl border glass-panel shadow-2xl flex flex-col md:flex-row items-center gap-4 ${getThemeClass('bg-slate-800/80 border-slate-700', 'bg-white/80 border-slate-200')}`}>
            <div className="flex-1 w-full">
              <label className="text-xs font-semibold uppercase tracking-wider block mb-1 text-slate-400">FastAPI Connection Base</label>
              <input 
                type="text" 
                value={apiBase} 
                onChange={(e) => setApiBase(e.target.value)}
                className={`w-full text-sm px-3 py-2 rounded-lg border outline-none ${getThemeClass('bg-slate-900 border-slate-700 text-white focus:border-blue-500', 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-500')}`}
              />
            </div>
            <div className="flex items-center gap-2 mt-4 md:mt-0">
              <button 
                onClick={() => { fetchDatasets(); fetchHistory(); setShowSettings(false); }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-all"
              >
                Reconnect Server
              </button>
              <button 
                onClick={() => setShowSettings(false)}
                className={`px-4 py-2 border rounded-lg text-sm transition-all ${getThemeClass('border-slate-600 hover:bg-slate-700 text-slate-300', 'border-slate-300 hover:bg-slate-100 text-slate-700')}`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DASHBOARD STATS (Mobile & Tablet specific layout) */}
      <div className="lg:hidden grid grid-cols-2 md:grid-cols-4 gap-3 px-4 mt-4 max-w-7xl w-full mx-auto">
        <div className={`p-3 rounded-xl border ${getThemeClass('bg-slate-800/50 border-slate-800/80', 'bg-white border-slate-200')} shadow-sm`}>
          <span className={`text-[10px] uppercase font-bold tracking-wider block ${getThemeClass('text-slate-400', 'text-slate-500')}`}>Dataset</span>
          <span className="text-sm font-bold text-blue-500">{stats.datasetsLoaded} CSV Loaded</span>
        </div>
        <div className={`p-3 rounded-xl border ${getThemeClass('bg-slate-800/50 border-slate-800/80', 'bg-white border-slate-200')} shadow-sm`}>
          <span className={`text-[10px] uppercase font-bold tracking-wider block ${getThemeClass('text-slate-400', 'text-slate-500')}`}>AI Model</span>
          <span className="text-sm font-bold text-indigo-400 truncate block">{stats.modelName}</span>
        </div>
        <div className={`p-3 rounded-xl border ${getThemeClass('bg-slate-800/50 border-slate-800/80', 'bg-white border-slate-200')} shadow-sm`}>
          <span className={`text-[10px] uppercase font-bold tracking-wider block ${getThemeClass('text-slate-400', 'text-slate-500')}`}>Query Time</span>
          <span className="text-sm font-bold text-amber-500">{stats.queryTime}</span>
        </div>
        <div className={`p-3 rounded-xl border ${getThemeClass('bg-slate-800/50 border-slate-800/80', 'bg-white border-slate-200')} shadow-sm`}>
          <span className={`text-[10px] uppercase font-bold tracking-wider block ${getThemeClass('text-slate-400', 'text-slate-500')}`}>Rows Returned</span>
          <span className="text-sm font-bold text-emerald-500">{stats.rowsReturned}</span>
        </div>
      </div>

      {/* CORE SPLIT SCREEN */}
      <main className="flex-1 flex max-w-7xl w-full mx-auto p-4 gap-4 overflow-hidden">
        
        {/* SIDEBAR */}
        <aside className={`w-80 hidden md:flex flex-col gap-4 overflow-y-auto shrink-0 border rounded-2xl p-4 glass-panel ${getThemeClass('border-slate-800/60', 'border-slate-200')}`}>
          
          {/* UPLOAD BOX */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 text-slate-400">
              <Database className="h-3.5 w-3.5" /> Dynamic Datasets
            </h3>
            
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                dragActive 
                  ? 'border-blue-500 bg-blue-500/10' 
                  : getThemeClass('border-slate-700 hover:border-blue-500/40 bg-slate-900/30', 'border-slate-300 hover:border-blue-500/40 bg-slate-50')
              }`}
            >
              <UploadCloud className={`h-8 w-8 mx-auto mb-1.5 ${getThemeClass('text-slate-500', 'text-slate-400')}`} />
              <p className="text-[11px] font-semibold text-slate-300 dark:text-slate-300 text-slate-600">
                Drag & drop CSV here
              </p>
              <p className={`text-[9px] mt-0.5 ${getThemeClass('text-slate-500', 'text-slate-400')}`}>
                or click to browse
              </p>
              <input 
                ref={fileInputRef}
                type="file" 
                accept=".csv"
                onChange={handleFileInput}
                className="hidden" 
              />
            </div>
            
            {uploadStatus.text && (
              <div className={`mt-2 p-2 rounded-lg text-[10px] font-semibold flex items-center gap-1.5 ${
                uploadStatus.type === 'success' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/10' :
                uploadStatus.type === 'error' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/10' :
                'bg-blue-500/15 text-blue-400 border border-blue-500/10'
              }`}>
                {uploadStatus.type === 'success' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                <span className="truncate">{uploadStatus.text}</span>
              </div>
            )}
          </div>

          {/* ACTIVE DATASETS LIST */}
          <div className="flex-1 flex flex-col min-h-[150px]">
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${getThemeClass('text-slate-400', 'text-slate-500')}`}>Active Tables</span>
              <button 
                onClick={fetchDatasets} 
                className={`p-1 rounded hover:bg-slate-800 text-slate-400 ${getThemeClass('hover:bg-slate-800', 'hover:bg-slate-100')}`}
                title="Refresh table list"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            </div>
            
            <div className="space-y-1.5 overflow-y-auto max-h-[180px] pr-1">
              {datasets.length === 0 ? (
                <div className={`text-center py-4 border border-dashed rounded-lg text-xs ${getThemeClass('border-slate-800/80 text-slate-500', 'border-slate-200 text-slate-400')}`}>
                  No CSVs loaded yet
                </div>
              ) : (
                datasets.map((d, i) => (
                  <div 
                    key={i} 
                    className={`group px-3 py-2 rounded-lg flex items-center justify-between border ${getThemeClass('bg-slate-900/20 border-slate-800/60 hover:bg-slate-850', 'bg-white border-slate-200 hover:bg-slate-50')}`}
                  >
                    <div className="truncate flex-1 pr-2">
                      <p className="text-xs font-bold truncate flex items-center gap-1">
                        <Database className="h-3 w-3 text-blue-500 shrink-0" />
                        {d.name}.csv
                      </p>
                      <p className={`text-[9px] font-medium ${getThemeClass('text-slate-400', 'text-slate-500')}`}>
                        {d.row_count.toLocaleString()} rows &bull; {d.column_count} cols
                      </p>
                    </div>
                    <button 
                      onClick={() => deleteDataset(d.name)}
                      className={`p-1 rounded text-rose-500 transition-opacity ${getThemeClass('hover:bg-rose-500/10 md:opacity-0 group-hover:opacity-100', 'hover:bg-rose-50 md:opacity-0 group-hover:opacity-100')}`}
                      title={`Delete table ${d.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className={`h-[1px] ${getThemeClass('bg-slate-800', 'bg-slate-200')}`} />

          {/* HISTORY LIST */}
          <div className="flex-1 flex flex-col min-h-[180px] overflow-hidden">
            <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${getThemeClass('text-slate-400', 'text-slate-500')}`}>
              <History className="h-3.5 w-3.5" /> Query History
            </h3>
            
            <div className="flex-1 space-y-1.5 overflow-y-auto pr-1">
              {history.length === 0 ? (
                <p className={`text-xs text-center py-6 ${getThemeClass('text-slate-500', 'text-slate-400')}`}>No queries run this session</p>
              ) : (
                history.map((h, i) => (
                  <button
                    key={i}
                    onClick={() => handleAsk(h.question)}
                    className={`w-full text-left px-3 py-2 rounded-lg border text-xs flex flex-col transition-all cursor-pointer ${getThemeClass('bg-slate-900/10 border-slate-850 hover:bg-slate-800/40 hover:border-slate-700', 'bg-white border-slate-200 hover:bg-slate-100/60 hover:border-slate-300')}`}
                  >
                    <span className="font-medium line-clamp-2 leading-relaxed">{h.question}</span>
                    <span className={`text-[9px] mt-1 flex items-center justify-between w-full ${getThemeClass('text-slate-500', 'text-slate-400')}`}>
                      <code className="truncate max-w-[120px] text-blue-400">{h.sql.split('\n')[0]}</code>
                      <span className="shrink-0">{h.row_count} rows</span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>

        {/* MAIN PANEL */}
        <section className="flex-1 flex flex-col overflow-hidden min-w-0">
          
          {/* CHAT / CONTENT CONTAINER */}
          <div className="flex-1 overflow-y-auto space-y-6 pb-6 px-1">
            {messages.length === 0 ? (
              
              /* EMPTY STATE WELCOME HERO */
              <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto px-4 py-8">
                
                {/* Hero Header */}
                <div className="mb-8">
                  <div className="w-16 h-16 rounded-3xl bg-blue-600/15 text-blue-500 border border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.15)] flex items-center justify-center mx-auto mb-4 animate-bounce">
                    <Sparkles className="h-8 w-8" />
                  </div>
                  <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight font-display mb-2">
                    AI Data Analyst Copilot
                  </h2>
                  <p className={`text-sm max-w-md mx-auto ${getThemeClass('text-slate-400', 'text-slate-600')}`}>
                    Simply ask questions about your datasets in plain English, and get instant SQL scripts, interactive charts, and business insights.
                  </p>
                </div>

                {/* Big Drag & Drop box for empty state */}
                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full max-w-md border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer mb-8 transition-all glass-card ${
                    dragActive 
                      ? 'border-blue-500 bg-blue-500/10' 
                      : getThemeClass('border-slate-700 bg-slate-900/20 hover:border-blue-500/40', 'border-slate-300 bg-slate-50 hover:border-blue-500/40')
                  }`}
                >
                  <UploadCloud className="h-10 w-10 mx-auto mb-2 text-blue-500" />
                  <p className="text-sm font-semibold mb-1">
                    📂 Drag & Drop CSV Here
                  </p>
                  <p className={`text-xs ${getThemeClass('text-slate-400', 'text-slate-500')}`}>
                    or click to Browse Files from your computer
                  </p>
                </div>

                {/* Quick Prompts suggestions */}
                <div className="w-full">
                  <h4 className={`text-xs uppercase font-bold tracking-wider mb-3 ${getThemeClass('text-slate-400', 'text-slate-500')}`}>
                    Or try asking:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                    <button 
                      onClick={() => handleAsk("What was total revenue by region for 2025?")}
                      className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between group transition-all cursor-pointer ${getThemeClass('bg-slate-800/40 border-slate-800 hover:border-blue-500/45 hover:bg-slate-850 text-slate-200', 'bg-white border-slate-200 hover:border-blue-500/45 hover:bg-slate-50 text-slate-700')}`}
                    >
                      <span>📊 "What was total revenue by region for 2025?"</span>
                      <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500" />
                    </button>
                    <button 
                      onClick={() => handleAsk("Which product segment yields the highest profit margin?")}
                      className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between group transition-all cursor-pointer ${getThemeClass('bg-slate-800/40 border-slate-800 hover:border-blue-500/45 hover:bg-slate-850 text-slate-200', 'bg-white border-slate-200 hover:border-blue-500/45 hover:bg-slate-50 text-slate-700')}`}
                    >
                      <span>📈 "Show daily revenue trend for APAC in March 2026"</span>
                      <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              
              /* CHAT MESSAGES PANEL */
              <div className="space-y-6 pt-4">
                {messages.map((msg) => (
                  <div key={msg.id} className="space-y-4">
                    
                    {/* USER QUERY MESSAGE */}
                    {msg.type === 'user' && (
                      <div className="flex gap-3 justify-end items-start">
                        <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${getThemeClass('bg-blue-600 text-white', 'bg-blue-600 text-white')}`}>
                          <div className="text-[10px] uppercase font-bold text-blue-200 tracking-wider mb-0.5">👤 You</div>
                          <p className="font-medium leading-relaxed">{msg.text}</p>
                        </div>
                      </div>
                    )}

                    {/* BOT RESPONSE PANEL */}
                    {msg.type === 'bot' && (
                      <div className="flex gap-3 items-start">
                        <div className="p-2 rounded-xl bg-blue-600/10 text-blue-500 border border-blue-500/20 shadow-sm shrink-0">
                          <Sparkles className="h-5 w-5" />
                        </div>
                        <div className="flex-1 space-y-4 overflow-hidden">
                          <div className={`text-xs uppercase font-extrabold tracking-wider ${getThemeClass('text-slate-400', 'text-slate-500')}`}>🤖 AI Analyst</div>

                          {/* Error Card */}
                          {msg.error && (
                            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex gap-3 items-start">
                              <AlertCircle className="h-5 w-5 shrink-0" />
                              <div>
                                <span className="font-bold block mb-1">Execution Failed</span>
                                {msg.error}
                              </div>
                            </div>
                          )}

                          {/* Query Outputs (SQL, Insight, Charts, Tables) */}
                          {msg.data && (
                            <div className="space-y-5">
                              
                              {/* Insight Summaries Banner */}
                              <div className={`p-4 rounded-2xl border glass-panel transition-all ${getThemeClass('border-slate-800/80', 'border-slate-200')}`}>
                                <h4 className="text-xs uppercase font-bold tracking-wider mb-2 flex items-center gap-1.5 text-blue-400">
                                  📊 Summary & Insights
                                </h4>
                                <p className={`text-sm leading-relaxed font-medium ${getThemeClass('text-slate-200', 'text-slate-800')}`}>
                                  {msg.data.insight}
                                </p>

                                {/* Outlier anomalies warnings */}
                                {msg.data.anomalies && msg.data.anomalies.length > 0 && (
                                  <div className="mt-3 space-y-1.5">
                                    {msg.data.anomalies.map((a, idx) => (
                                      <div key={idx} className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs flex items-center gap-2">
                                        <Activity className="h-3.5 w-3.5 shrink-0" />
                                        <span>
                                          {a.type === 'outlier' 
                                            ? `Statistical Outlier in "${a.column}": observed ${a.value} (z-score ${a.z_score})`
                                            : `Anomaly swing: ${a.pct_change}% change in "${a.column}" on ${a.date}`}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* SQL Card with Code Editor UI */}
                              <div className={`rounded-2xl border glass-panel overflow-hidden ${getThemeClass('border-slate-800/80', 'border-slate-200')}`}>
                                <div className={`px-4 py-2.5 border-b flex items-center justify-between text-xs font-semibold ${getThemeClass('bg-slate-900/60 border-slate-800/80 text-slate-300', 'bg-slate-50 border-slate-200 text-slate-700')}`}>
                                  <span className="flex items-center gap-1.5 text-indigo-400">
                                    ✓ SQL Generated
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <button 
                                      onClick={() => copyToClipboard(msg.data.sql, `sql-${msg.id}`)}
                                      className={`p-1.5 rounded hover:bg-slate-800 transition-all ${getThemeClass('hover:bg-slate-800 text-slate-400', 'hover:bg-slate-200 text-slate-600')}`}
                                      title="Copy SQL"
                                    >
                                      {copySuccess === `sql-${msg.id}` ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                                    </button>
                                    <button 
                                      onClick={() => downloadSQL(msg.data.sql, `query_${msg.id}`)}
                                      className={`p-1.5 rounded hover:bg-slate-800 transition-all ${getThemeClass('hover:bg-slate-800 text-slate-400', 'hover:bg-slate-200 text-slate-600')}`}
                                      title="Download SQL"
                                    >
                                      <Download className="h-3.5 w-3.5" />
                                    </button>
                                    <button 
                                      onClick={() => handleRerun(msg.data.sql, msg.data.question)}
                                      className="px-2 py-1 bg-indigo-600 text-white rounded text-[10px] font-bold hover:bg-indigo-700 flex items-center gap-1 cursor-pointer"
                                      title="Re-run query"
                                    >
                                      <Play className="h-2.5 w-2.5 fill-current" /> Run Again
                                    </button>
                                  </div>
                                </div>
                                <div className="p-4 bg-slate-950 font-mono text-xs overflow-x-auto text-indigo-300 border-b border-slate-900 whitespace-pre-wrap select-all leading-relaxed">
                                  {msg.data.sql}
                                </div>
                                <div className={`px-4 py-2 text-[11px] font-medium leading-normal ${getThemeClass('text-slate-400 bg-slate-900/20', 'text-slate-600 bg-slate-50')}`}>
                                  {msg.data.explanation}
                                </div>
                              </div>

                              {/* Interactive Plotly Charts Card */}
                              {msg.data.rows && msg.data.rows.length > 0 && (
                                <div className={`p-4 rounded-2xl border glass-panel space-y-4 ${getThemeClass('border-slate-800/80', 'border-slate-200')}`}>
                                  
                                  {/* Chart controllers */}
                                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                    <h4 className="text-xs uppercase font-bold tracking-wider flex items-center gap-1.5 text-blue-400">
                                      📈 Interactive Chart
                                    </h4>
                                    <div className={`p-0.5 rounded-lg flex items-center gap-1 border ${getThemeClass('bg-slate-950 border-slate-800', 'bg-slate-100 border-slate-200')}`}>
                                      {[
                                        { type: 'bar', label: 'Bar', icon: BarChart3 },
                                        { type: 'line', label: 'Line', icon: LineChart },
                                        { type: 'pie', label: 'Pie', icon: PieChart },
                                        { type: 'scatter', label: 'Scatter', icon: Activity }
                                      ].map(chartOpt => (
                                        <button
                                          key={chartOpt.type}
                                          onClick={() => handleChartTypeChange(msg.id, chartOpt.type)}
                                          className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                            msg.selectedChartType === chartOpt.type 
                                              ? 'bg-blue-600 text-white shadow-sm'
                                              : getThemeClass('text-slate-400 hover:text-white', 'text-slate-600 hover:text-slate-950')
                                          }`}
                                        >
                                          <chartOpt.icon className="h-3 w-3" />
                                          {chartOpt.label}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Plotly Canvas */}
                                  <div className={`rounded-xl p-2 relative min-h-[350px] border ${getThemeClass('bg-slate-900/30 border-slate-800/60', 'bg-white border-slate-100')}`}>
                                    {(() => {
                                      // Get custom plot data based on selected chart override
                                      const fig = getChartFigure(
                                        msg.data.rows, 
                                        msg.data.columns, 
                                        msg.selectedChartType,
                                        msg.data.question
                                      );
                                      return (
                                        <PlotlyChart 
                                          data={fig.data} 
                                          layout={fig.layout} 
                                          theme={theme} 
                                        />
                                      );
                                    })()}
                                  </div>
                                </div>
                              )}

                              {/* Interactive Paginated Data Table Card */}
                              {msg.data.rows && msg.data.rows.length > 0 && (
                                <div className={`p-4 rounded-2xl border glass-panel space-y-3 ${getThemeClass('border-slate-800/80', 'border-slate-200')}`}>
                                  
                                  {/* Header & Export options */}
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <h4 className="text-xs uppercase font-bold tracking-wider flex items-center gap-1.5 text-blue-400">
                                      📋 Result Table 
                                      <span className={`text-[10px] font-medium uppercase tracking-normal ${getThemeClass('text-slate-400', 'text-slate-500')}`}>
                                        ({msg.data.row_count} rows {msg.data.truncated && '&bull; truncated'})
                                      </span>
                                    </h4>

                                    {/* Action Export Buttons */}
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <button 
                                        onClick={() => exportCSV(msg.data.columns, msg.data.rows, `data_${msg.id}`)}
                                        className={`px-2 py-1 rounded text-[10px] font-bold border flex items-center gap-1.5 cursor-pointer ${getThemeClass('bg-slate-850 hover:bg-slate-800 border-slate-700 text-slate-200', 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700')}`}
                                      >
                                        <FileText className="h-3 w-3" /> CSV
                                      </button>
                                      <button 
                                        onClick={() => exportExcel(msg.data.columns, msg.data.rows, `excel_${msg.id}`)}
                                        className={`px-2 py-1 rounded text-[10px] font-bold border flex items-center gap-1.5 cursor-pointer ${getThemeClass('bg-slate-850 hover:bg-slate-800 border-slate-700 text-slate-200', 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700')}`}
                                      >
                                        <FileSpreadsheet className="h-3 w-3" /> Excel
                                      </button>
                                      <button 
                                        onClick={triggerPDF}
                                        className={`px-2 py-1 rounded text-[10px] font-bold border flex items-center gap-1.5 cursor-pointer ${getThemeClass('bg-slate-850 hover:bg-slate-800 border-slate-700 text-slate-200', 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700')}`}
                                      >
                                        <FileText className="h-3 w-3" /> PDF
                                      </button>
                                      <button 
                                        onClick={() => copyToClipboard(msg.data.sql, `sql-export-${msg.id}`)}
                                        className={`px-2 py-1 rounded text-[10px] font-bold border flex items-center gap-1.5 cursor-pointer ${getThemeClass('bg-slate-850 hover:bg-slate-800 border-slate-700 text-slate-200', 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700')}`}
                                      >
                                        {copySuccess === `sql-export-${msg.id}` ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                                        Copy SQL
                                      </button>
                                    </div>
                                  </div>

                                  {/* Grid Container */}
                                  <div className="overflow-x-auto border rounded-xl">
                                    <table className="min-w-full text-[12px] border-collapse">
                                      <thead>
                                        <tr className={`border-b text-left ${getThemeClass('bg-slate-900/60 border-slate-800 text-slate-400', 'bg-slate-50 border-slate-200 text-slate-500')}`}>
                                          {msg.data.columns.map((c, idx) => (
                                            <th key={idx} className="p-3 font-semibold tracking-wider whitespace-nowrap">{c}</th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {(() => {
                                          // Local client side pagination 
                                          const pageIdx = msg.tablePage || 1;
                                          const start = (pageIdx - 1) * 8;
                                          const end = start + 8;
                                          const pagedRows = msg.data.rows.slice(start, end);
                                          
                                          if (pagedRows.length === 0) {
                                            return (
                                              <tr>
                                                <td colSpan={msg.data.columns.length} className="text-center py-6 text-slate-500">No rows returned</td>
                                              </tr>
                                            );
                                          }

                                          return pagedRows.map((row, rIdx) => (
                                            <tr 
                                              key={rIdx} 
                                              className={`border-b transition-colors ${getThemeClass('border-slate-800/80 hover:bg-slate-800/30', 'border-slate-150 hover:bg-slate-50')}`}
                                            >
                                              {msg.data.columns.map((col, cIdx) => (
                                                <td key={cIdx} className="p-3 font-medium truncate max-w-[180px]" title={String(row[col] ?? '')}>
                                                  {row[col] === null ? <em className="text-slate-600">null</em> : String(row[col])}
                                                </td>
                                              ))}
                                            </tr>
                                          ));
                                        })()}
                                      </tbody>
                                    </table>
                                  </div>

                                  {/* Pagination Toolbar */}
                                  {msg.data.rows.length > 8 && (
                                    <div className="flex items-center justify-between text-xs pt-1">
                                      <span className={getThemeClass('text-slate-400', 'text-slate-500')}>
                                        Showing {((msg.tablePage || 1) - 1) * 8 + 1} - {Math.min((msg.tablePage || 1) * 8, msg.data.rows.length)} of {msg.data.rows.length} rows
                                      </span>
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => handlePageChange(msg.id, 'prev')}
                                          disabled={(msg.tablePage || 1) === 1}
                                          className={`p-1.5 rounded border transition-all cursor-pointer disabled:opacity-30`}
                                        >
                                          <ChevronLeft className="h-4 w-4" />
                                        </button>
                                        <button
                                          onClick={() => handlePageChange(msg.id, 'next')}
                                          disabled={(msg.tablePage || 1) === Math.ceil(msg.data.rows.length / 8)}
                                          className={`p-1.5 rounded border transition-all cursor-pointer disabled:opacity-30`}
                                        >
                                          <ChevronRight className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                            </div>
                          )}

                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Stepper dynamic thinking step progress */}
            {isThinking && (
              <div className="flex gap-3 items-start pt-4">
                <div className="p-2 rounded-xl bg-blue-600/15 text-blue-500 border border-blue-500/20 shadow-sm shrink-0">
                  <Sparkles className="h-5 w-5 animate-pulse" />
                </div>
                <div className="flex-1 space-y-4">
                  <div className={`text-xs uppercase font-extrabold tracking-wider ${getThemeClass('text-slate-400', 'text-slate-500')}`}>🤖 Thinking...</div>
                  
                  {/* Thinking Steps Card */}
                  <div className={`p-5 rounded-2xl border glass-panel shadow-md max-w-sm thinking-indicator ${getThemeClass('border-slate-800', 'border-slate-200')}`}>
                    <div className="space-y-3">
                      {thinkingSteps.map((step, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border text-[10px] font-bold ${
                            step.status === 'done' ? 'bg-emerald-500 border-emerald-500 text-white' :
                            step.status === 'active' ? 'bg-blue-600/20 border-blue-500 text-blue-400 animate-pulse' :
                            'bg-transparent border-slate-700 text-slate-500'
                          }`}>
                            {step.status === 'done' ? '✓' : idx + 1}
                          </div>
                          <span className={`text-xs font-semibold ${
                            step.status === 'done' ? 'text-slate-300 dark:text-slate-300 text-slate-600' :
                            step.status === 'active' ? 'text-blue-400 font-bold' :
                            'text-slate-500'
                          }`}>
                            {step.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* BOTTOM FLOATING INPUT & SUGGESTED CHIPS */}
          <div className={`pt-2 pb-4 ${getThemeClass('bg-[#0F172A]', 'bg-[#F8FAFC]')}`}>
            
            {/* Inline suggested chips (Only shown if chat has messages) */}
            {messages.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2 pr-1 scrollbar-none mb-2">
                {[
                  { label: "Top Customers", q: "Show top 10 customers by revenue" },
                  { label: "Monthly Revenue", q: "What was total revenue by month?" },
                  { label: "Best Products", q: "Which products generate the most sales?" },
                  { label: "Sales Forecast", q: "Forecast quarterly revenue trend" }
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAsk(chip.q)}
                    className={`px-3 py-1 rounded-full border text-[10px] font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${getThemeClass('bg-slate-900/50 border-slate-800 hover:border-blue-500/40 text-slate-300 hover:text-white', 'bg-white border-slate-200 hover:border-blue-500/40 text-slate-700 hover:text-slate-950')}`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            )}

            {/* Input Bar */}
            <div className={`relative rounded-2xl border flex items-center shadow-lg transition-colors p-1 bg-slate-900/40 border-slate-800 ${getThemeClass('focus-within:border-blue-500/60 focus-within:bg-slate-900/70', 'bg-white border-slate-250 focus-within:border-blue-500/60')}`}>
              <input 
                type="text" 
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                placeholder="Ask anything about your datasets... (e.g. show monthly sales trend)"
                disabled={isThinking}
                className={`flex-1 text-sm bg-transparent outline-none py-3 px-4 ${getThemeClass('text-white placeholder-slate-500', 'text-slate-900 placeholder-slate-400')}`}
              />
              <button 
                onClick={() => handleAsk()}
                disabled={isThinking || !question.trim()}
                className="p-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all disabled:opacity-40 disabled:hover:bg-blue-600 flex items-center justify-center cursor-pointer shrink-0"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

        </section>

      </main>

      {/* PRINT-ONLY CSS */}
      <style>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          header, aside, footer, input, button, .lg\\:hidden, .settings-panel {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
          section {
            width: 100% !important;
            overflow: visible !important;
          }
          .glass-panel, .glass-card {
            background: white !important;
            border: 1px solid #ddd !important;
            box-shadow: none !important;
            color: black !important;
          }
        }
      `}</style>
    </div>
  );
}
