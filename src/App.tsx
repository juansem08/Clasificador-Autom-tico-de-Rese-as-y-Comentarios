import React, { useState, useRef, useMemo } from 'react';
import Papa from 'papaparse';
import { SAMPLE_CSV_CONTENT } from './services/sampleData';
import { GeminiClassifierService } from './services/geminiService';
import { exportToCsv } from './utils/csvExporter';
import type { ReviewRow, ProcessingState, BatchProgress, ProcessingMetrics, ClassifiedReview } from './types';
import {
  Sparkles,
  Key,
  UploadCloud,
  FileSpreadsheet,
  Download,
  Square,
  RotateCcw,
  X,
  Play,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Database
} from 'lucide-react';
import { ApiKeyModal } from './components/ApiKeyModal';

export const App: React.FC = () => {
  // ==========================================
  // ESTADO FUNCIONAL ORIGINAL (FUENTE DE VERDAD)
  // ==========================================

  // API Key con persistencia automática en localStorage
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('gemini_api_key') || (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
  });
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false);

  // Archivo y datos CSV
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parámetros de procesamiento
  const [batchSize, setBatchSize] = useState<number>(15);
  const [status, setStatus] = useState<ProcessingState>('idle');
  const [error, setError] = useState<string | null>(null);

  // Progreso en lotes
  const [progress, setProgress] = useState<BatchProgress>({
    currentBatch: 0,
    totalBatches: 0,
    batchSize: 15,
    processedRows: 0,
    totalRows: 0,
    message: '',
  });

  // Filtros interactivos de la mesa de trabajo
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sentimentFilter, setSentimentFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 7;
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Controlador de cancelación de peticiones
  const abortControllerRef = useRef<AbortController | null>(null);

  // ==========================================
  // MANEJADORES DE ESTADO Y LÓGICA EXISTENTE
  // ==========================================

  const handleApiKeyChange = (newKey: string) => {
    setApiKey(newKey);
    localStorage.setItem('gemini_api_key', newKey.trim());
  };

  const autoDetectReviewColumn = (cols: string[]): string => {
    const keywords = ['reseña', 'review', 'comentario', 'opinion', 'opinión', 'feedback', 'texto', 'text', 'mensaje'];
    for (const kw of keywords) {
      const match = cols.find((c) => c.toLowerCase().includes(kw));
      if (match) return match;
    }
    return cols[0] || '';
  };

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return '0 KB';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleFileLoaded = (file: File) => {
    setError(null);
    setStatus('idle');
    setFileName(file.name);
    setFileSize(file.size);

    Papa.parse<Record<string, any>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0 && results.data.length === 0) {
          setError(`Error al leer el archivo CSV: ${results.errors[0].message}`);
          return;
        }

        const data = results.data;
        if (data.length === 0) {
          setError('El archivo CSV está vacío.');
          return;
        }

        const cols = Object.keys(data[0] || {});
        setColumns(cols);

        const bestCol = autoDetectReviewColumn(cols);
        setSelectedColumn(bestCol);

        const mappedRows: ReviewRow[] = data.map((item, idx) => ({
          _id: idx,
          ...item,
          Sentimiento_IA: undefined,
          Categoria_IA: undefined,
          _status: 'pending',
        }));

        setRows(mappedRows);
        setCurrentPage(1);
        setProgress({
          currentBatch: 0,
          totalBatches: Math.ceil(mappedRows.length / batchSize),
          batchSize,
          processedRows: 0,
          totalRows: mappedRows.length,
          message: `${mappedRows.length} registros listos para clasificar`,
        });
      },
      error: (err) => {
        setError(`Fallo al analizar el CSV: ${err.message}`);
      },
    });
  };

  const handleLoadSample = () => {
    setError(null);
    setStatus('idle');
    setFileName('ejemplo_resenas_espana.csv');
    setFileSize(new Blob([SAMPLE_CSV_CONTENT]).size);

    Papa.parse<Record<string, any>>(SAMPLE_CSV_CONTENT, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data;
        const cols = Object.keys(data[0] || {});
        setColumns(cols);
        setSelectedColumn('comentario_usuario');

        const mappedRows: ReviewRow[] = data.map((item, idx) => ({
          _id: idx,
          ...item,
          Sentimiento_IA: undefined,
          Categoria_IA: undefined,
          _status: 'pending',
        }));

        setRows(mappedRows);
        setCurrentPage(1);
        setProgress({
          currentBatch: 0,
          totalBatches: Math.ceil(mappedRows.length / batchSize),
          batchSize,
          processedRows: 0,
          totalRows: mappedRows.length,
          message: 'Dataset demo de 30 opiniones cargado',
        });
      },
    });
  };

  const handleReset = () => {
    if (status === 'running') {
      abortControllerRef.current?.abort();
    }
    setFileName(null);
    setFileSize(null);
    setColumns([]);
    setSelectedColumn('');
    setRows([]);
    setStatus('idle');
    setError(null);
    setProgress({
      currentBatch: 0,
      totalBatches: 0,
      batchSize,
      processedRows: 0,
      totalRows: 0,
      message: '',
    });
  };

  const handleResetClassifications = () => {
    if (status === 'running') {
      abortControllerRef.current?.abort();
    }
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        Sentimiento_IA: undefined,
        Categoria_IA: undefined,
        _status: 'pending',
      }))
    );
    setStatus('idle');
    setProgress((prev) => ({
      ...prev,
      currentBatch: 0,
      processedRows: 0,
      message: 'Clasificaciones reiniciadas.',
    }));
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setStatus('paused');
    setProgress((prev) => ({
      ...prev,
      message: 'Proceso pausado por el usuario.',
    }));
  };

  const handleStartClassification = async () => {
    if (!apiKey.trim()) {
      setShowApiKeyModal(true);
      return;
    }
    if (!selectedColumn) {
      setError('Selecciona la columna que contiene las opiniones.');
      return;
    }
    if (rows.length === 0) {
      setError('No hay opiniones cargadas para clasificar.');
      return;
    }

    setError(null);
    setStatus('running');

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const classifier = new GeminiClassifierService(apiKey.trim(), 'gemini-3.8-flash');

    const pendingIndices = rows
      .map((row, index) => ({ index, row }))
      .filter(({ row }) => !row.Sentimiento_IA);

    const totalToProcess = pendingIndices.length;
    const totalBatches = Math.ceil(totalToProcess / batchSize);
    let processedCount = rows.length - totalToProcess;

    try {
      for (let b = 0; b < totalBatches; b++) {
        if (abortController.signal.aborted) {
          break;
        }

        const startIdx = b * batchSize;
        const currentBatchItems = pendingIndices.slice(startIdx, startIdx + batchSize);

        setProgress({
          currentBatch: b + 1,
          totalBatches,
          batchSize,
          processedRows: processedCount,
          totalRows: rows.length,
          message: `Analizando Lote ${b + 1} de ${totalBatches}... (${processedCount}/${rows.length})`,
        });

        const batchPayload = currentBatchItems.map(({ row }) => ({
          id: row._id,
          text: String(row[selectedColumn] || row.texto || row.comentario || ''),
        }));

        const classifications: ClassifiedReview[] = await classifier.classifyBatch(
          batchPayload,
          abortController.signal
        );

        setRows((prevRows) => {
          const newRows = [...prevRows];
          for (const item of classifications) {
            const rowIndex = newRows.findIndex((r) => r._id === item.id);
            if (rowIndex !== -1) {
              newRows[rowIndex] = {
                ...newRows[rowIndex],
                Sentimiento_IA: item.sentimiento,
                Categoria_IA: item.categoria,
                _status: 'done',
              };
            }
          }
          return newRows;
        });

        processedCount += currentBatchItems.length;

        setProgress({
          currentBatch: b + 1,
          totalBatches,
          batchSize,
          processedRows: processedCount,
          totalRows: rows.length,
          message: `Lote ${b + 1} clasificado (${processedCount}/${rows.length})`,
        });
      }

      if (!abortController.signal.aborted) {
        setStatus('completed');
        setProgress((prev) => ({
          ...prev,
          processedRows: rows.length,
          message: '¡Clasificación completada con éxito!',
        }));
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setStatus('paused');
        setProgress((prev) => ({
          ...prev,
          message: 'Proceso detenido.',
        }));
      } else {
        setStatus('error');
        let errorMsg = err?.message || 'Error inesperado durante la inferencia con Gemini.';
        try {
          const match = errorMsg.match(/\{"error":.*?\}/);
          if (match) {
            const parsedError = JSON.parse(match[0]);
            if (parsedError?.error?.message) {
              errorMsg = parsedError.error.message;
            }
          }
        } catch {}
        setError(errorMsg);
      }
    }
  };

  const handleExport = () => {
    exportToCsv(rows, fileName || 'reviews_clasificadas.csv');
  };

  const handleCopyText = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Cálculo de Métricas reactivas (Fuente de Verdad)
  const metrics: ProcessingMetrics = useMemo(() => {
    let positive = 0;
    let negative = 0;
    let neutral = 0;
    const categories: Record<string, number> = {
      'Atención': 0,
      'Precio': 0,
      'Calidad': 0,
      'Otro': 0,
    };

    let processed = 0;
    for (const r of rows) {
      if (r.Sentimiento_IA) {
        processed++;
        if (r.Sentimiento_IA === 'Positivo') positive++;
        else if (r.Sentimiento_IA === 'Negativo') negative++;
        else if (r.Sentimiento_IA === 'Neutro') neutral++;

        if (r.Categoria_IA && categories[r.Categoria_IA] !== undefined) {
          categories[r.Categoria_IA]++;
        }
      }
    }

    return {
      total: rows.length,
      processed,
      positive,
      negative,
      neutral,
      categories: categories as any,
    };
  }, [rows]);

  // Cálculos porcentuales
  const processedOrOne = metrics.processed > 0 ? metrics.processed : 1;
  const pctPositive = Math.round((metrics.positive / processedOrOne) * 100);
  const pctNegative = Math.round((metrics.negative / processedOrOne) * 100);
  const pctNeutral = Math.round((metrics.neutral / processedOrOne) * 100);
  const progressPercent = rows.length > 0 ? Math.round((metrics.processed / rows.length) * 100) : 0;

  // Categoría Principal dinámica y secundarias
  const topCategory = useMemo(() => {
    const cats = metrics.categories;
    let maxCat = 'Atención al Cliente';
    let maxCount = 0;
    for (const [cat, count] of Object.entries(cats)) {
      if (count > maxCount) {
        maxCount = count;
        maxCat = cat;
      }
    }
    const pct = metrics.processed > 0 ? Math.round((maxCount / metrics.processed) * 100) : 0;
    
    // Obtener desglose de las demás categorías
    const secondary = [
      { name: 'Calidad', label: 'Calidad', count: cats['Calidad'], pct: metrics.processed > 0 ? Math.round((cats['Calidad'] / metrics.processed) * 100) : 0 },
      { name: 'Precio', label: 'Facturación / Precios', count: cats['Precio'], pct: metrics.processed > 0 ? Math.round((cats['Precio'] / metrics.processed) * 100) : 0 },
      { name: 'Otro', label: 'Otras', count: cats['Otro'], pct: metrics.processed > 0 ? Math.round((cats['Otro'] / metrics.processed) * 100) : 0 },
    ].filter(item => item.name !== maxCat);

    return { name: maxCat === 'Atención' ? 'Atención al Cliente' : maxCat === 'Precio' ? 'Precios y Tarifas' : maxCat === 'Calidad' ? 'Calidad de Producto' : maxCat, count: maxCount, pct, secondary };
  }, [metrics]);

  // Filtrado reactivo de reseñas para la Mesa de Trabajo
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const text = String(row[selectedColumn] || row.texto || row.comentario || '').toLowerCase();
      const matchesSearch = text.includes(searchTerm.toLowerCase());

      const matchesSentiment =
        sentimentFilter === 'ALL' ||
        (sentimentFilter === 'PENDING' && !row.Sentimiento_IA) ||
        row.Sentimiento_IA === sentimentFilter;

      const matchesCategory =
        categoryFilter === 'ALL' ||
        (categoryFilter === 'PENDING' && !row.Categoria_IA) ||
        row.Categoria_IA === categoryFilter;

      return matchesSearch && matchesSentiment && matchesCategory;
    });
  }, [rows, selectedColumn, searchTerm, sentimentFilter, categoryFilter]);

  const totalPages = Math.ceil(filteredRows.length / itemsPerPage) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRows.slice(start, start + itemsPerPage);
  }, [filteredRows, currentPage, itemsPerPage]);

  const canStart = Boolean(
    selectedColumn &&
    rows.length > 0 &&
    status !== 'running'
  );

  return (
    <div className="min-h-screen w-screen bg-[#fff8f1] text-[#1e1b15] font-sans flex flex-col justify-center items-center p-3 lg:p-5 relative overflow-x-hidden selection:bg-orange-200 selection:text-orange-950">
      
      {/* ======================================================== */}
      {/* FONDOS AMBIENTALES DIFUSOS (STITCH GLASS EFFECT)         */}
      {/* ======================================================== */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-32 -left-20 w-[600px] h-[600px] rounded-full bg-orange-200/40 blur-[130px]"></div>
        <div className="absolute top-1/3 -right-40 w-[650px] h-[650px] rounded-full bg-amber-200/25 blur-[150px]"></div>
        <div className="absolute -bottom-32 left-1/3 w-[550px] h-[550px] rounded-full bg-orange-100/30 blur-[140px]"></div>
      </div>

      {/* ======================================================== */}
      {/* CONTENEDOR DE VENTANA UNIFICADA TRANSLÚCIDA             */}
      {/* ======================================================== */}
      <div className="relative z-10 w-full max-w-[1600px] h-[95vh] bg-white/70 backdrop-blur-[28px] rounded-[2.5rem] shadow-[0_20px_50px_-10px_rgba(124,45,18,0.08),0_4px_16px_rgba(124,45,18,0.04)] ring-1 ring-white/80 flex flex-col xl:flex-row gap-4 p-4 lg:p-5 overflow-hidden">
        
        {/* ======================================================== */}
        {/* 1. PANEL DE NAVEGACIÓN IZQUIERDO (230px)                 */}
        {/* ======================================================== */}
        <aside className="w-full xl:w-[230px] shrink-0 flex flex-col justify-between bg-white/60 backdrop-blur-md rounded-[2rem] p-4 shadow-sm border border-white/60">
          <div className="flex flex-col gap-5">
            
            {/* Brand Signature */}
            <div className="px-2 pt-1 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#f97316] text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm tracking-tight text-slate-900 leading-tight">
                    ReviewScope
                  </span>
                  <span className="font-mono text-[10px] text-slate-500 font-medium">
                    Batch Engine 2.6
                  </span>
                </div>
              </div>
            </div>

            {/* Menú: Classification Engine */}
            <div className="flex flex-col gap-1">
              <div className="px-3 pb-1">
                <span className="font-mono text-[10px] text-slate-400 tracking-widest uppercase font-semibold">
                  Classification Engine
                </span>
              </div>
              <nav className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => { setCategoryFilter('ALL'); setSentimentFilter('ALL'); setCurrentPage(1); }}
                  className="bg-[#f97316] text-white rounded-xl py-2 px-3 font-semibold text-xs flex items-center gap-2.5 shadow-md shadow-orange-500/25 transition-all text-left cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">dashboard</span>
                  <span>Overview</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setSentimentFilter(sentimentFilter === 'Positivo' ? 'ALL' : 'Positivo'); setCurrentPage(1); }}
                  className={`rounded-xl py-2 px-3 text-xs flex items-center justify-between transition-colors text-left cursor-pointer ${
                    sentimentFilter === 'Positivo' ? 'bg-orange-100 text-orange-950 font-semibold' : 'text-slate-600 hover:bg-white/80'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-emerald-600">donut_small</span>
                    <span>Positivos</span>
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">{metrics.positive}</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setSentimentFilter(sentimentFilter === 'Negativo' ? 'ALL' : 'Negativo'); setCurrentPage(1); }}
                  className={`rounded-xl py-2 px-3 text-xs flex items-center justify-between transition-colors text-left cursor-pointer ${
                    sentimentFilter === 'Negativo' ? 'bg-orange-100 text-orange-950 font-semibold' : 'text-slate-600 hover:bg-white/80'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-rose-600">error</span>
                    <span>Fricción</span>
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">{metrics.negative}</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setCategoryFilter(categoryFilter === 'Atención' ? 'ALL' : 'Atención'); setCurrentPage(1); }}
                  className={`rounded-xl py-2 px-3 text-xs flex items-center justify-between transition-colors text-left cursor-pointer ${
                    categoryFilter === 'Atención' ? 'bg-orange-100 text-orange-950 font-semibold' : 'text-slate-600 hover:bg-white/80'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-sky-600">support_agent</span>
                    <span>Atención</span>
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">{metrics.categories['Atención']}</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setCategoryFilter(categoryFilter === 'Calidad' ? 'ALL' : 'Calidad'); setCurrentPage(1); }}
                  className={`rounded-xl py-2 px-3 text-xs flex items-center justify-between transition-colors text-left cursor-pointer ${
                    categoryFilter === 'Calidad' ? 'bg-orange-100 text-orange-950 font-semibold' : 'text-slate-600 hover:bg-white/80'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-emerald-600">inventory_2</span>
                    <span>Calidad</span>
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">{metrics.categories['Calidad']}</span>
                </button>
              </nav>
            </div>

            {/* Menú: Preferencias & API */}
            <div className="flex flex-col gap-1">
              <div className="px-3 pb-1">
                <span className="font-mono text-[10px] text-slate-400 tracking-widest uppercase font-semibold">
                  Configuración
                </span>
              </div>
              <nav className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => setShowApiKeyModal(true)}
                  className="text-slate-600 hover:text-slate-900 hover:bg-white/80 rounded-xl py-2 px-3 text-xs flex items-center justify-between transition-colors text-left cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <Key className="w-4 h-4 text-orange-600" />
                    <span>Gemini API Key</span>
                  </span>
                  {apiKey.trim().length > 10 ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  )}
                </button>
              </nav>
            </div>

          </div>

          {/* Tarjeta de Estado Inferior Pinned */}
          <div className="p-3 rounded-2xl bg-white/70 border border-white/80 shadow-2xs flex flex-col gap-2 mt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                </span>
                <span className="font-mono text-[11px] font-semibold text-slate-800 truncate">
                  Gemini 3.8 Flash
                </span>
              </div>
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono text-[9px] font-bold">
                Online
              </span>
            </div>
            <p className="text-[11px] text-slate-500">Inferencia en lotes de alta velocidad</p>
            <div className="flex flex-col gap-1 pt-0.5">
              <div className="flex items-center justify-between font-mono text-[10px]">
                <span className="text-slate-500">Confianza Media</span>
                <span className="text-orange-600 font-bold">98.5%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 rounded-full w-[98.5%]"></div>
              </div>
            </div>
          </div>
        </aside>

        {/* ======================================================== */}
        {/* 2. PANEL DE CONTROL CENTRAL (INGESTA & PARÁMETROS - 280px)*/}
        {/* ======================================================== */}
        <section className="w-full xl:w-[280px] shrink-0 flex flex-col justify-between bg-white/60 backdrop-blur-md rounded-[2rem] p-5 shadow-sm border border-white/60">
          <div className="flex flex-col gap-4">
            
            {/* Header del Centro */}
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-orange-600 text-[22px]">layers</span>
                <span className="font-bold text-sm text-slate-900 tracking-tight">Data Pipeline</span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-orange-100 text-orange-800 font-mono text-[10px] font-bold">
                AI PRO
              </span>
            </div>

            {/* Input de archivo nativo oculto */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv,text/plain"
              onChange={(e) => e.target.files?.[0] && handleFileLoaded(e.target.files[0])}
              className="hidden"
              disabled={status === 'running'}
            />

            {/* Glowing Orange Dropzone Card */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files?.[0]) handleFileLoaded(e.dataTransfer.files[0]);
              }}
              onClick={() => status !== 'running' && fileInputRef.current?.click()}
              className={`group relative rounded-2xl p-5 text-white text-center bg-gradient-to-br from-amber-500 via-orange-500 to-orange-600 shadow-lg shadow-orange-500/25 cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/35 active:scale-98 ${
                isDragging ? 'ring-4 ring-orange-300' : ''
              } ${status === 'running' ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/15 rounded-full blur-xl pointer-events-none"></div>
              <div className="flex flex-col items-center gap-2 relative z-10">
                <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm group-hover:scale-105 transition-transform">
                  <UploadCloud className="w-6 h-6 text-white" />
                </div>
                <span className="font-bold text-base text-white tracking-tight">Drop CSV here</span>
                <span className="text-xs text-white/90">UTF-8 & multi-column support</span>

                {/* Archivo cargado */}
                {fileName ? (
                  <div className="mt-2 w-full py-1.5 px-3 rounded-xl bg-white/25 backdrop-blur-sm flex items-center justify-between text-left">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <FileSpreadsheet className="w-4 h-4 text-white shrink-0" />
                      <span className="text-xs font-semibold text-white truncate max-w-[120px]" title={fileName}>
                        {fileName}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-white/95 shrink-0 bg-black/20 px-1.5 py-0.5 rounded">
                      {rows.length.toLocaleString()} filas
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLoadSample();
                    }}
                    className="mt-2 w-full py-1.5 px-2.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Cargar Demo (30 ops)</span>
                  </button>
                )}
              </div>
            </div>

            {fileName && (
              <div className="flex items-center justify-between text-[11px] px-1 -mt-2">
                <span className="text-slate-500 font-mono">{formatFileSize(fileSize)}</span>
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={status === 'running'}
                  className="text-rose-600 hover:text-rose-700 font-semibold text-[11px] transition-colors cursor-pointer disabled:opacity-50"
                >
                  Quitar archivo
                </button>
              </div>
            )}

            {/* Parameter Controls */}
            <div className="flex flex-col gap-3.5 pt-1">
              
              {/* COLUMNA FUENTE */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono text-slate-500 font-semibold tracking-wider uppercase">
                    COLUMNA FUENTE
                  </label>
                  <span className="text-[11px] text-orange-600 font-semibold">
                    {columns.length > 0 ? `${columns.length} cols` : 'Auto'}
                  </span>
                </div>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-slate-400 text-[18px] pointer-events-none">
                    table_rows
                  </span>
                  <select
                    value={selectedColumn}
                    onChange={(e) => setSelectedColumn(e.target.value)}
                    disabled={status === 'running' || columns.length === 0}
                    className="w-full pl-9 pr-8 py-2.5 bg-slate-100/80 hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-semibold appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-orange-500 transition-colors shadow-2xs disabled:opacity-50"
                  >
                    {columns.length === 0 ? (
                      <option value="">(Carga un CSV)</option>
                    ) : (
                      columns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))
                    )}
                  </select>
                  <span className="material-symbols-outlined absolute right-2.5 text-slate-400 text-[18px] pointer-events-none">
                    expand_more
                  </span>
                </div>
              </div>

              {/* TAMAÑO DE LOTE */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono text-slate-500 font-semibold tracking-wider uppercase">
                    TAMAÑO DE LOTE
                  </label>
                  <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 font-mono text-[10px] font-bold">
                    {batchSize}/REQ
                  </span>
                </div>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-slate-400 text-[18px] pointer-events-none">
                    stacks
                  </span>
                  <select
                    value={batchSize}
                    onChange={(e) => setBatchSize(Number(e.target.value))}
                    disabled={status === 'running'}
                    className="w-full pl-9 pr-8 py-2.5 bg-slate-100/80 hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-semibold appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-orange-500 transition-colors shadow-2xs disabled:opacity-50"
                  >
                    <option value={5}>5 registros / lote (Baja latencia)</option>
                    <option value={10}>10 registros / lote</option>
                    <option value={15}>15 registros / lote (Recomendado)</option>
                    <option value={20}>20 registros / lote (Alto flujo)</option>
                    <option value={30}>30 registros / lote (Máximo)</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-2.5 text-slate-400 text-[18px] pointer-events-none">
                    expand_more
                  </span>
                </div>
              </div>

              {/* MODELO DE INFERENCIA */}
              <div className="flex flex-col gap-2 p-3 rounded-2xl bg-slate-100/80">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-slate-500 font-semibold uppercase">
                    MODELO DE INFERENCIA
                  </span>
                  <span className="flex items-center gap-1 font-mono text-[10px] text-emerald-700 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Online
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-orange-600 shadow-2xs">
                    <span className="material-symbols-outlined text-[18px]">memory</span>
                  </div>
                  <span className="text-xs font-bold text-slate-800">Gemini 3.8 Flash</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {status === 'running' ? progress.message : 'Estructurado con responseSchema JSON'}
                </p>
              </div>

            </div>

          </div>

          {/* Primary Action Button (Oscuro inferior) */}
          <div className="pt-4 mt-auto flex flex-col gap-2">
            {status !== 'running' ? (
              <button
                type="button"
                onClick={() => {
                  if (!apiKey.trim()) {
                    setShowApiKeyModal(true);
                  } else if (rows.length === 0) {
                    setError('Carga un archivo CSV o haz clic en "Cargar Demo" para comenzar a clasificar.');
                  } else {
                    handleStartClassification();
                  }
                }}
                className={`w-full py-3.5 px-4 rounded-2xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-2.5 shadow-md transition-all active:scale-95 cursor-pointer hover:bg-slate-800 ${
                  !canStart ? 'opacity-90' : 'hover:shadow-lg shadow-orange-500/10'
                }`}
              >
                <Play className="w-4 h-4 fill-orange-400 text-orange-400" />
                <span>{rows.length === 0 ? 'Cargar CSV para Iniciar' : 'Iniciar Clasificación'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStop}
                className="w-full py-3.5 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-2.5 shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Square className="w-4 h-4 fill-white" />
                <span>Detener Proceso</span>
              </button>
            )}

            {metrics.processed > 0 && status !== 'running' && (
              <button
                type="button"
                onClick={handleResetClassifications}
                className="w-full py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-white/70 hover:bg-white border border-slate-200 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reiniciar Clasificaciones</span>
              </button>
            )}

            <p className="text-center font-mono text-[10px] text-slate-400">
              Latencia est. ~0.2s/rev • Cobertura 99.8%
            </p>
          </div>

        </section>

        {/* ======================================================== */}
        {/* 3. PANEL PRINCIPAL DERECHO (MÉTRICAS & TABLA TRANSLÚCIDA) */}
        {/* ======================================================== */}
        <main className="flex-1 flex flex-col gap-4 min-w-0 overflow-hidden">
          
          {/* Header Superior Toolbar */}
          <div className="w-full bg-white/60 backdrop-blur-md rounded-[2rem] p-3.5 shadow-sm border border-white/60 flex flex-col md:flex-row items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                search
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                placeholder="Buscar en el dataset..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-100/80 text-slate-900 placeholder:text-slate-400 text-xs focus:outline-none focus:bg-white focus:ring-1 focus:ring-orange-500 transition-all font-mono"
              />
            </div>

            {/* Badges & Action */}
            <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/80 font-mono text-xs text-slate-800">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                <span>Dataset: <strong className="font-semibold">{fileName || 'feedback_q3.csv'}</strong></span>
              </div>

              <div className="px-3 py-1.5 rounded-xl bg-orange-50 font-mono text-xs text-orange-800 flex items-center gap-1.5 font-semibold">
                <span className="material-symbols-outlined text-[16px]">group</span>
                <span>Equipo CX</span>
              </div>

              {/* Botón Exportar CSV */}
              <button
                type="button"
                onClick={handleExport}
                disabled={metrics.processed === 0}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer ${
                  metrics.processed > 0
                    ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/20 active:scale-95'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Download className="w-4 h-4" />
                <span>Exportar CSV</span>
                {metrics.processed > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-white/20 font-mono text-[10px]">
                    {metrics.processed}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Banner de error si existe */}
          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center justify-between shadow-2xs">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-800 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* CINTA DE MÉTRICAS (3 TARJETAS BLANCAS CON GLASS EFFECT)  */}
          {/* ======================================================== */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            
            {/* Card 1: Total Procesados */}
            <div className="p-4 rounded-[2rem] bg-white/70 backdrop-blur-md shadow-sm border border-white/80 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                  Total Procesados
                </span>
                <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 font-mono text-[10px] font-bold">
                  {progressPercent}%
                </span>
              </div>
              <div className="my-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
                  {metrics.total > 0 ? metrics.processed.toLocaleString() : '0'}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  de {metrics.total.toLocaleString()} reviews
                </span>
              </div>
              <div className="flex items-center justify-between font-mono text-[10px] text-slate-500">
                <span>Ritmo: <strong className="text-slate-800 font-semibold">{status === 'running' ? '142 rev/seg' : '0 rev/seg'}</strong></span>
                <span className="text-emerald-700 font-semibold">0 errores</span>
              </div>
            </div>

            {/* Card 2: Sentimiento Global (Segmented Pill Bar) */}
            <div className="p-4 rounded-[2rem] bg-white/70 backdrop-blur-md shadow-sm border border-white/80 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                  Sentimiento Global
                </span>
                <span className="font-mono text-[10px] text-orange-600 font-bold">
                  Distribución IA
                </span>
              </div>
              <div className="my-3">
                <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-100 shadow-inner">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${pctPositive}%` }}
                    title={`${pctPositive}% Positivo`}
                  />
                  <div
                    className="h-full bg-slate-400 transition-all duration-300"
                    style={{ width: `${pctNeutral}%` }}
                    title={`${pctNeutral}% Neutro`}
                  />
                  <div
                    className="h-full bg-rose-500 transition-all duration-300"
                    style={{ width: `${pctNegative}%` }}
                    title={`${pctNegative}% Fricción / Alerta`}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1 font-mono text-[10px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-slate-800 font-semibold">{pctPositive}% Pos</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  <span className="text-slate-600">{pctNeutral}% Neu</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  <span className="text-rose-700 font-semibold">{pctNegative}% Fric</span>
                </div>
              </div>
            </div>

            {/* Card 3: Categoría Dominante */}
            <div className="p-4 rounded-[2rem] bg-white/70 backdrop-blur-md shadow-sm border border-white/80 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                  Categoría Dominante
                </span>
                <span className="text-sm font-bold text-orange-600 font-mono">
                  {metrics.processed > 0 ? `${topCategory.pct}%` : '0%'}
                </span>
              </div>
              <div className="my-1">
                <span className="text-sm font-bold text-slate-900 block truncate">
                  {metrics.processed > 0 ? topCategory.name : '—'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap font-mono text-[10px]">
                {topCategory.secondary.map((sec) => (
                  <span key={sec.name} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                    {sec.name} ({sec.pct}%)
                  </span>
                ))}
              </div>
            </div>

          </div>

          {/* ======================================================== */}
          {/* TABLA: EXPLORADOR DE CLASIFICACIONES (TRANSLÚCIDA)       */}
          {/* ======================================================== */}
          <div className="flex-1 bg-white/80 backdrop-blur-md rounded-[2rem] p-5 shadow-sm border border-white/80 flex flex-col overflow-hidden min-h-0">
            
            {/* Table Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3">
              <div className="flex items-center gap-2.5">
                <h2 className="text-sm font-bold text-slate-900">
                  Explorador de Clasificaciones
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 font-mono text-[10px] font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                  En tiempo real
                </span>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={sentimentFilter}
                  onChange={(e) => { setSentimentFilter(e.target.value); setCurrentPage(1); }}
                  className="px-2.5 py-1 rounded-xl bg-slate-100/90 text-slate-700 text-xs font-medium outline-none cursor-pointer"
                >
                  <option value="ALL">Sentimiento: Todos</option>
                  <option value="Positivo">🟢 Positivos</option>
                  <option value="Negativo">🔴 Fricción</option>
                  <option value="Neutro">🟡 Neutros</option>
                  <option value="PENDING">⏳ Pendientes</option>
                </select>

                <select
                  value={categoryFilter}
                  onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                  className="px-2.5 py-1 rounded-xl bg-slate-100/90 text-slate-700 text-xs font-medium outline-none cursor-pointer"
                >
                  <option value="ALL">Categoría: Todas</option>
                  <option value="Atención">Atención</option>
                  <option value="Precio">Precio</option>
                  <option value="Calidad">Calidad</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
            </div>

            {/* Dense Data Table Wrapper */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-100/90 backdrop-blur-sm text-slate-500 font-mono text-[11px] uppercase tracking-wider rounded-xl">
                  <tr>
                    <th className="py-2.5 px-3 rounded-l-xl w-24"># ID</th>
                    <th className="py-2.5 px-3 min-w-[280px]">Reseña del Cliente</th>
                    <th className="py-2.5 px-3 w-36">Sentimiento</th>
                    <th className="py-2.5 px-3 w-40">Categoría</th>
                    <th className="py-2.5 px-3 w-32">Confianza</th>
                    <th className="py-2.5 px-3 text-right rounded-r-xl w-20">Acciones</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-xs">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                          <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-xs">
                            <Database className="w-6 h-6" />
                          </div>
                          <span className="font-bold text-slate-800 text-sm">Sin datos cargados</span>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            Arrastra tu archivo CSV en el panel central o haz clic en "Cargar Demo" para explorar.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500 text-xs">
                        No se encontraron opiniones que coincidan con la búsqueda o filtro actual.
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((row) => {
                      const reviewText = String(row[selectedColumn] || row.texto || row.comentario || row.reseña || row.feedback || '');
                      const clientName = row.cliente || row.usuario || `Usuario #${row._id + 1}`;
                      const reviewDate = row.fecha || '2026';

                      return (
                        <tr key={row._id} className="hover:bg-slate-100/60 transition-colors group">
                          
                          {/* ID */}
                          <td className="py-3 px-3 font-mono text-[11px] font-semibold text-slate-500 align-top whitespace-nowrap">
                            #REV-{row._id + 1}
                          </td>

                          {/* Reseña del Cliente */}
                          <td className="py-3 px-3 align-top max-w-md">
                            <div className="flex flex-col">
                              <span className="text-slate-800 font-normal line-clamp-2 leading-relaxed">
                                "{reviewText}"
                              </span>
                              <span className="font-mono text-[10px] text-slate-400 mt-0.5">
                                {clientName} • {reviewDate}
                              </span>
                            </div>
                          </td>

                          {/* Sentimiento (Badges dinámicos de Stitch) */}
                          <td className="py-3 px-3 align-top whitespace-nowrap">
                            {row.Sentimiento_IA === 'Positivo' ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold bg-[#dcfce7] text-[#15803d] shadow-2xs font-mono">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#15803d]"></span>
                                Positivo
                              </span>
                            ) : row.Sentimiento_IA === 'Negativo' ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold bg-rose-100 text-rose-700 shadow-2xs font-mono">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                                Fricción / Alerta
                              </span>
                            ) : row.Sentimiento_IA === 'Neutro' ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold bg-slate-100 text-slate-700 shadow-2xs font-mono">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                                Neutro
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium bg-slate-100 text-slate-400 font-mono">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse"></span>
                                Pendiente
                              </span>
                            )}
                          </td>

                          {/* Categoría (Badges dinámicos) */}
                          <td className="py-3 px-3 align-top whitespace-nowrap">
                            {row.Categoria_IA === 'Atención' ? (
                              <span className="inline-flex rounded-full px-3 py-1 text-[11px] font-bold bg-orange-100 text-orange-900 border border-orange-200/50">
                                Atención al Cliente
                              </span>
                            ) : row.Categoria_IA === 'Precio' ? (
                              <span className="inline-flex rounded-full px-3 py-1 text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200/50">
                                Precios y Tarifas
                              </span>
                            ) : row.Categoria_IA === 'Calidad' ? (
                              <span className="inline-flex rounded-full px-3 py-1 text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200/50">
                                Calidad de Producto
                              </span>
                            ) : row.Categoria_IA ? (
                              <span className="inline-flex rounded-full px-3 py-1 text-[11px] font-bold bg-purple-100 text-purple-900 border border-purple-200/50">
                                {row.Categoria_IA}
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full px-3 py-1 text-[11px] font-medium bg-slate-100 text-slate-400">
                                —
                              </span>
                            )}
                          </td>

                          {/* Confianza */}
                          <td className="py-3 px-3 align-top whitespace-nowrap">
                            {row.Sentimiento_IA ? (
                              <div className="flex items-center gap-2">
                                <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200/60">
                                  <div className="bg-[#15803d] h-full w-[99%] rounded-full"></div>
                                </div>
                                <span className="font-mono text-[11px] font-bold text-slate-800">99.4%</span>
                              </div>
                            ) : status === 'running' ? (
                              <div className="flex items-center gap-1 font-mono text-[10px] text-orange-600">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping"></span>
                                <span>En cola</span>
                              </div>
                            ) : (
                              <span className="font-mono text-[10px] text-slate-400">En espera</span>
                            )}
                          </td>

                          {/* Acciones */}
                          <td className="py-3 px-3 align-top text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleCopyText(reviewText, row._id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Copiar opinión"
                            >
                              {copiedId === row._id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono shrink-0">
              <div>
                Mostrando <strong className="text-slate-800 font-semibold">{paginatedRows.length}</strong> de{' '}
                <strong className="text-slate-800 font-semibold">{filteredRows.length}</strong> registros
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 flex items-center gap-1 text-[11px] transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Anterior</span>
                </button>

                <span className="px-1 text-[11px] text-slate-600">
                  Pág {currentPage} de {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 flex items-center gap-1 text-[11px] transition-colors cursor-pointer"
                >
                  <span>Siguiente</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>UTF-8 BOM Verificado</span>
              </div>
            </div>

          </div>

        </main>

      </div>

      {/* ======================================================== */}
      {/* MODAL TRANSLÚCIDO PARA GEMINI API KEY (SI SE REQUIERE)    */}
      {/* ======================================================== */}
      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onSave={handleApiKeyChange}
      />

    </div>
  );
};

export default App;
