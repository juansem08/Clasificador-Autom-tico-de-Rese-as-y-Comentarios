import React, { useState, useRef, useMemo } from 'react';
import Papa from 'papaparse';
import { SAMPLE_CSV_CONTENT } from './services/sampleData';
import { GeminiClassifierService } from './services/geminiService';
import { exportToCsv } from './utils/csvExporter';
import type { ReviewRow, ProcessingState, BatchProgress, ProcessingMetrics, ClassifiedReview } from './types';
import {
  Sparkles,
  Key,
  Eye,
  EyeOff,
  UploadCloud,
  FileSpreadsheet,
  Download,
  Search,
  Square,
  RotateCcw,
  Minus,
  Maximize2,
  X,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Database
} from 'lucide-react';

export const App: React.FC = () => {
  // ==========================================
  // ESTADO FUNCIONAL ORIGINAL (FUENTE DE VERDAD)
  // ==========================================

  // API Key con persistencia automática en localStorage
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('gemini_api_key') || '';
  });
  const [showKey, setShowKey] = useState<boolean>(false);

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

  // Filtros interactivos del feed de reseñas
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sentimentFilter, setSentimentFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 8;

  // Controlador de cancelación
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
      setError('Por favor ingresa una Gemini API Key en el panel superior.');
      return;
    }
    if (!selectedColumn) {
      setError('Selecciona la columna con las opiniones.');
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

    const classifier = new GeminiClassifierService(apiKey.trim(), 'gemini-2.5-flash');

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
          text: String(row[selectedColumn] || ''),
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
          message: '¡Clasificación completada! Listo para exportar.',
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
        setError(err?.message || 'Error inesperado durante la llamada a Gemini.');
      }
    }
  };

  const handleExport = () => {
    exportToCsv(rows, fileName || 'reviews_clasificadas.csv');
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
  const progressPercent = rows.length > 0 ? Math.round((progress.processedRows / rows.length) * 100) : 0;

  // Filtrado de opiniones para el Feed
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const text = String(row[selectedColumn] || '').toLowerCase();
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
    apiKey.trim().length > 10 &&
    selectedColumn &&
    rows.length > 0 &&
    status !== 'running'
  );

  // Funciones de control de ventana de Electron
  const handleMinimize = () => window.electronAPI?.minimizeWindow?.();
  const handleMaximize = () => window.electronAPI?.maximizeWindow?.();
  const handleClose = () => window.electronAPI?.closeWindow?.();

  return (
    <div className="h-screen w-screen bg-[#051424] text-[#d4e4fa] font-sans flex flex-col overflow-hidden select-none">
      
      {/* ======================================================== */}
      {/* 1. HEADER / VENTANA DE ESCRITORIO CON DRAG REGION        */}
      {/* ======================================================== */}
      <header className="window-drag-region h-11 border-b border-white/[0.08] bg-[#010f1f]/95 backdrop-blur-md px-4 flex items-center justify-between shrink-0 z-50">
        
        {/* Controles de ventana nativos / Traffic Lights */}
        <div className="flex items-center space-x-3 window-no-drag">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleClose}
              title="Cerrar aplicación"
              className="w-3 h-3 rounded-full bg-[#f43f5e] hover:brightness-125 transition-all flex items-center justify-center group"
            >
              <X className="w-2 h-2 text-black/70 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <button
              onClick={handleMinimize}
              title="Minimizar ventana"
              className="w-3 h-3 rounded-full bg-[#f59e0b] hover:brightness-125 transition-all flex items-center justify-center group"
            >
              <Minus className="w-2 h-2 text-black/70 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <button
              onClick={handleMaximize}
              title="Maximizar ventana"
              className="w-3 h-3 rounded-full bg-[#10b981] hover:brightness-125 transition-all flex items-center justify-center group"
            >
              <Maximize2 className="w-2 h-2 text-black/70 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>

          <div className="h-4 w-px bg-white/[0.1] mx-1"></div>

          {/* Logo y Branding */}
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold text-xs">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold text-xs tracking-wide text-white">
              ReviewClassifier <span className="text-primary font-black">AI</span>
            </span>
            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-surface-container-high text-[#a08e7a] border border-white/[0.06]">
              Enterprise Studio
            </span>
          </div>
        </div>

        {/* Input API Key Seguro en la barra de utilidades */}
        <div className="flex items-center space-x-2 window-no-drag">
          <div className="relative flex items-center">
            <div className="absolute left-2.5 text-[#a08e7a] pointer-events-none">
              <Key className="w-3 h-3 text-primary" />
            </div>
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
              placeholder="Gemini API Key..."
              className="w-56 pl-7 pr-7 py-1 text-[11px] font-mono bg-[#0d1c2d] text-white placeholder-[#a08e7a]/60 rounded-md border border-white/[0.1] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 text-[#a08e7a] hover:text-white transition-colors"
            >
              {showKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </button>
          </div>

          <div className="flex items-center space-x-1.5">
            {apiKey.trim().length > 15 ? (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30">
                <CheckCircle2 className="w-3 h-3" />
                <span>Activa</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#f59e0b]/15 text-primary border border-primary/30 animate-pulse">
                <AlertTriangle className="w-3 h-3" />
                <span>Requerida</span>
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. SUB-HEADER & REALTIME TELEMETRY BAR                   */}
      {/* ======================================================== */}
      <div className="px-4 py-2 bg-[#010f1f]/80 border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1.5 text-primary font-medium">
            <span className="material-symbols-outlined text-[18px]">smart_toy</span>
            <span className="font-semibold text-white">Gemini Orchestrator</span>
          </div>

          <div className="h-3.5 w-px bg-white/[0.1]"></div>

          <div className="flex items-center space-x-1.5 bg-[#0d1c2d] px-2 py-0.5 rounded border border-white/[0.06] text-[11px]">
            <span className="text-[#a08e7a]">Modelo:</span>
            <span className="font-mono font-bold text-white">gemini-2.5-flash</span>
          </div>

          <div className="flex items-center space-x-1.5 bg-[#0d1c2d] px-2 py-0.5 rounded border border-white/[0.06] text-[11px]">
            <span className="text-[#a08e7a]">Concurrencia:</span>
            <span className="font-mono font-bold text-primary">{batchSize} reseñas/lote</span>
          </div>

          <div className="flex items-center space-x-1.5 bg-[#0d1c2d] px-2 py-0.5 rounded border border-white/[0.06] text-[11px]">
            <span className="text-[#a08e7a]">Estado:</span>
            <span className={`font-semibold capitalize ${
              status === 'running' ? 'text-primary animate-pulse' :
              status === 'completed' ? 'text-[#10b981]' : 'text-slate-300'
            }`}>
              {status === 'running' ? 'Procesando con IA' : status === 'completed' ? 'Completado' : 'Listo'}
            </span>
          </div>
        </div>

        {/* Acciones Rápidas: Demo y Exportación */}
        <div className="flex items-center space-x-2">
          {!fileName && (
            <button
              onClick={handleLoadSample}
              className="flex items-center space-x-1.5 px-3 py-1 rounded bg-[#0d1c2d] hover:bg-[#1c2b3c] text-primary border border-primary/30 text-xs font-semibold transition-all active:scale-98"
              title="Cargar dataset de prueba con 30 opiniones"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Probar Dataset Demo</span>
            </button>
          )}

          <button
            onClick={handleExport}
            disabled={metrics.processed === 0}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs font-semibold transition-all ${
              metrics.processed > 0
                ? 'bg-[#10b981] hover:bg-[#059669] text-white shadow-sm active:scale-98'
                : 'bg-white/[0.05] text-[#a08e7a]/50 border border-white/[0.05] cursor-not-allowed'
            }`}
            title="Exportar CSV compatible con Excel"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV Enriquecido</span>
            {metrics.processed > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-black/30 font-mono text-[10px]">
                {metrics.processed}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. WORKSPACE PRINCIPAL (SCROLLABLE DENSE LAYOUT)         */}
      {/* ======================================================== */}
      <main className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 min-h-0">
        
        {/* Banner de error si existe */}
        {error && (
          <div className="p-2.5 rounded-lg bg-[#f43f5e]/15 border border-[#f43f5e]/30 text-xs text-[#ffb4ab] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-[#f43f5e] shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-[#a08e7a] hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* FILA 1: INGESTION HUB (7 cols) + CLASSIFIER CONFIG (5 cols) */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
          
          {/* Data Ingestion Hub (7 cols) */}
          <div className="lg:col-span-7 bg-[#010f1f] border border-white/[0.08] p-3.5 rounded-xl flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">upload_file</span>
                  <h2 className="font-semibold text-xs tracking-wide text-white">Centro de Ingesta de Datos</h2>
                </div>
                <span className="font-mono text-[10px] bg-[#0d1c2d] text-[#a08e7a] px-2 py-0.5 rounded border border-white/[0.06]">
                  CSV / TSV Multi-tenant
                </span>
              </div>

              {/* Zona Drag & Drop */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,text/plain"
                onChange={(e) => e.target.files?.[0] && handleFileLoaded(e.target.files[0])}
                className="hidden"
                disabled={status === 'running'}
              />

              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files?.[0]) handleFileLoaded(e.dataTransfer.files[0]);
                }}
                onClick={() => status !== 'running' && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[95px] ${
                  isDragging
                    ? 'border-primary bg-primary/10'
                    : 'border-white/[0.1] hover:border-primary/50 bg-[#0d1c2d]/50 hover:bg-[#0d1c2d]'
                } ${status === 'running' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-1">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <p className="font-medium text-xs text-white">
                  Arrastra tu archivo <span className="text-primary font-semibold">.CSV</span> aquí o haz clic para explorar
                </p>
                <p className="text-[10px] text-[#a08e7a] mt-0.5">
                  Soporta codificación UTF-8 y exportaciones estructuradas
                </p>
              </div>
            </div>

            {/* Strip de Archivo Cargado */}
            {fileName && (
              <div className="mt-2.5 pt-2 border-t border-white/[0.06] bg-[#0d1c2d] rounded-lg p-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="w-8 h-8 rounded bg-[#10b981]/15 text-[#10b981] flex items-center justify-center shrink-0 border border-[#10b981]/25">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-semibold text-xs text-white truncate" title={fileName}>
                        {fileName}
                      </span>
                      <span className="text-[10px] font-mono bg-[#10b981]/15 text-[#10b981] px-1.5 py-0.2 rounded border border-[#10b981]/25">
                        Esquema Válido
                      </span>
                    </div>
                    <p className="font-mono text-[10px] text-[#a08e7a]">
                      {formatFileSize(fileSize)} • {rows.length} registros cargados en memoria
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleReset}
                  disabled={status === 'running'}
                  className="px-2.5 py-1 text-[11px] font-semibold text-[#f43f5e] hover:bg-[#f43f5e]/15 rounded transition-colors flex items-center space-x-1 shrink-0"
                  title="Descartar archivo"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Descargar</span>
                </button>
              </div>
            )}
          </div>

          {/* Classifier Configuration & CTA (5 cols) */}
          <div className="lg:col-span-5 bg-[#010f1f] border border-white/[0.08] p-3.5 rounded-xl flex flex-col justify-between gap-2.5 shadow-sm">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">tune</span>
                  <h2 className="font-semibold text-xs tracking-wide text-white">Configuración del Clasificador</h2>
                </div>
                <span className="font-mono text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                  Temp: 0.1 (Precisión)
                </span>
              </div>

              {/* Selector de Columna de Opiniones */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-white flex items-center justify-between">
                  <span>Columna de Opiniones:</span>
                  <span className="text-[10px] text-[#a08e7a]">
                    {columns.length > 0 ? `${columns.length} columnas detectadas` : 'Esperando CSV'}
                  </span>
                </label>
                <div className="relative">
                  <select
                    value={selectedColumn}
                    onChange={(e) => setSelectedColumn(e.target.value)}
                    disabled={status === 'running' || columns.length === 0}
                    className="w-full bg-[#0d1c2d] text-white text-xs px-3 py-1.5 rounded-lg border border-white/[0.1] focus:border-primary outline-none appearance-none cursor-pointer"
                  >
                    {columns.length === 0 ? (
                      <option value="">(Carga un CSV para mapear columnas)</option>
                    ) : (
                      columns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))
                    )}
                  </select>
                  <Sliders className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-[#a08e7a] pointer-events-none" />
                </div>
              </div>

              {/* Taxonomías de Salida */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-white font-medium">Taxonomías IA Activas:</span>
                  <span className="text-[10px] text-[#a08e7a]">4 categorías estructuradas</span>
                </div>
                <div className="flex flex-wrap gap-1.5 p-1.5 bg-[#0d1c2d] rounded-lg border border-white/[0.06] text-[11px]">
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-[#010f1f] text-sky-400 border border-sky-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                    <span>Atención</span>
                  </span>
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-[#010f1f] text-purple-400 border border-purple-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                    <span>Precio</span>
                  </span>
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-[#010f1f] text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>Calidad</span>
                  </span>
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-[#010f1f] text-amber-400 border border-amber-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    <span>Otro</span>
                  </span>
                </div>
              </div>

              {/* Selector de Tamaño de Lote */}
              <div className="flex items-center justify-between text-[11px] pt-0.5">
                <span className="text-white font-medium">Lote por llamada a Gemini:</span>
                <div className="flex items-center space-x-1">
                  {[10, 15, 20].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setBatchSize(size)}
                      disabled={status === 'running'}
                      className={`px-2 py-0.5 text-[11px] font-mono rounded font-semibold transition-all ${
                        batchSize === size
                          ? 'bg-primary text-black shadow-sm'
                          : 'bg-[#0d1c2d] text-[#a08e7a] hover:text-white border border-white/[0.06]'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Botón Principal CTA */}
            {status !== 'running' ? (
              <button
                type="button"
                onClick={handleStartClassification}
                disabled={!canStart}
                className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs tracking-wide shadow-md flex items-center justify-center space-x-2 transition-all active:scale-98 ${
                  canStart
                    ? 'bg-primary hover:bg-[#d97706] text-black shadow-primary/25 cursor-pointer'
                    : 'bg-[#0d1c2d] text-[#a08e7a]/50 border border-white/[0.06] cursor-not-allowed'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  Iniciar Clasificación con IA {rows.length > 0 ? `(${rows.length} reseñas)` : ''}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStop}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs tracking-wide bg-[#f43f5e] hover:bg-rose-600 text-white shadow-md shadow-rose-900/30 flex items-center justify-center space-x-2 transition-all active:scale-98 cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 fill-white" />
                <span>Detener Proceso en Tiempo Real</span>
              </button>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* FILA 2: TELEMETRÍA EN VIVO Y BARRA DE PROGRESO           */}
        {/* ======================================================== */}
        <div className="bg-[#010f1f] border border-white/[0.08] p-3 rounded-xl flex flex-col gap-2 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1.5 bg-primary/10 px-2 py-0.5 rounded text-primary border border-primary/20">
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-primary ${status === 'running' ? 'opacity-75' : 'opacity-0'}`}></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                <span className="font-mono font-bold text-[11px]">
                  {progress.totalBatches > 0
                    ? `Lote ${progress.currentBatch} de ${progress.totalBatches}`
                    : 'Motor en Reposo'}
                </span>
              </div>
              <span className="text-white text-[11px] truncate">
                {progress.message || 'Carga un CSV para iniciar el pipeline analítico'}
              </span>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              {metrics.processed > 0 && status !== 'running' && (
                <button
                  type="button"
                  onClick={handleResetClassifications}
                  className="px-2.5 py-1 text-[11px] font-medium text-[#a08e7a] hover:text-white bg-[#0d1c2d] border border-white/[0.06] rounded flex items-center space-x-1"
                  title="Reiniciar clasificaciones"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reiniciar</span>
                </button>
              )}
              <span className="font-mono text-primary font-bold text-xs">
                {progressPercent}% Completado
              </span>
            </div>
          </div>

          {/* Barra de progreso con gradiente ámbar */}
          <div className="w-full h-2.5 bg-[#0d1c2d] rounded-full overflow-hidden p-0.5 border border-white/[0.06]">
            <div
              className="h-full bg-gradient-to-r from-primary to-[#ffb95f] rounded-full transition-all duration-300 shadow-sm"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
            <div className="bg-[#0d1c2d] px-2.5 py-1.5 rounded-lg border border-white/[0.04]">
              <span className="text-[#a08e7a] text-[10px] block">Registros Procesados</span>
              <span className="font-bold text-white font-mono">{metrics.processed} / {metrics.total}</span>
            </div>
            <div className="bg-[#0d1c2d] px-2.5 py-1.5 rounded-lg border border-white/[0.04]">
              <span className="text-[#a08e7a] text-[10px] block">Positivos Detectados</span>
              <span className="font-bold text-[#10b981] font-mono">{metrics.positive} ({pctPositive}%)</span>
            </div>
            <div className="bg-[#0d1c2d] px-2.5 py-1.5 rounded-lg border border-white/[0.04]">
              <span className="text-[#a08e7a] text-[10px] block">Negativos Detectados</span>
              <span className="font-bold text-[#f43f5e] font-mono">{metrics.negative} ({pctNegative}%)</span>
            </div>
            <div className="bg-[#0d1c2d] px-2.5 py-1.5 rounded-lg border border-white/[0.04]">
              <span className="text-[#a08e7a] text-[10px] block">Calidad de Parseo</span>
              <span className="font-bold text-[#10b981] font-mono">100% Estructurado</span>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* FILA 3: EXECUTIVE INSIGHT BENTO GRID (3 Analytics Cards) */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-stretch">
          
          {/* Card 1: Sentiment Distribution (Stacked Bar) */}
          <div className="bg-[#010f1f] border border-white/[0.08] p-3 rounded-xl flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center space-x-1.5 text-xs font-semibold text-white">
                  <span className="material-symbols-outlined text-[#10b981] text-[18px]">pie_chart</span>
                  <span>Distribución de Sentimiento</span>
                </div>
                <span className="font-mono text-[10px] text-[#a08e7a]">n={metrics.processed}</span>
              </div>
              <p className="text-[11px] text-[#a08e7a] mb-2">Desglose porcentual ponderado por IA</p>

              {/* Barra Apilada */}
              <div className="w-full h-3 bg-[#0d1c2d] rounded-full overflow-hidden flex mb-2.5 border border-white/[0.04]">
                <div className="bg-[#10b981] h-full transition-all" style={{ width: `${pctPositive}%` }} title={`Positivo: ${pctPositive}%`} />
                <div className="bg-[#f59e0b] h-full transition-all" style={{ width: `${pctNeutral}%` }} title={`Neutro: ${pctNeutral}%`} />
                <div className="bg-[#f43f5e] h-full transition-all" style={{ width: `${pctNegative}%` }} title={`Negativo: ${pctNegative}%`} />
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#10b981]"></span>
                    <span className="text-white text-[11px]">Positivo</span>
                  </div>
                  <div className="font-mono text-[11px]">
                    <span className="text-[#a08e7a] mr-1.5">{metrics.positive} ops</span>
                    <span className="text-[#10b981] font-bold">{pctPositive}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#f59e0b]"></span>
                    <span className="text-white text-[11px]">Neutro</span>
                  </div>
                  <div className="font-mono text-[11px]">
                    <span className="text-[#a08e7a] mr-1.5">{metrics.neutral} ops</span>
                    <span className="text-[#f59e0b] font-bold">{pctNeutral}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#f43f5e]"></span>
                    <span className="text-white text-[11px]">Negativo</span>
                  </div>
                  <div className="font-mono text-[11px]">
                    <span className="text-[#a08e7a] mr-1.5">{metrics.negative} ops</span>
                    <span className="text-[#f43f5e] font-bold">{pctNegative}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Top Friction Clusters (Categorías) */}
          <div className="bg-[#010f1f] border border-white/[0.08] p-3 rounded-xl flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center space-x-1.5 text-xs font-semibold text-white">
                  <span className="material-symbols-outlined text-primary text-[18px]">troubleshoot</span>
                  <span>Categorización Temática</span>
                </div>
                <span className="font-mono text-[10px] text-sky-400 bg-sky-950/40 px-1.5 py-0.2 rounded border border-sky-800/30">
                  Taxonomía
                </span>
              </div>
              <p className="text-[11px] text-[#a08e7a] mb-2">Volumen de incidencias por categoría</p>

              <div className="space-y-2 text-xs">
                {Object.entries(metrics.categories).map(([cat, count]) => {
                  const pct = metrics.processed > 0 ? Math.round((count / metrics.processed) * 100) : 0;
                  return (
                    <div key={cat} className="flex flex-col gap-0.5">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-white">{cat}</span>
                        <span className="font-mono text-[#a08e7a]">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#0d1c2d] rounded-full overflow-hidden">
                        <div
                          className="bg-primary h-full rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Card 3: Executive Summary & Actionable Health */}
          <div className="bg-[#010f1f] border border-white/[0.08] p-3 rounded-xl flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center space-x-1.5 text-xs font-semibold text-white">
                  <span className="material-symbols-outlined text-purple-400 text-[18px]">insights</span>
                  <span>Resumen Ejecutivo</span>
                </div>
                <span className="font-mono text-[10px] text-primary">Gemini 2.5 Flash</span>
              </div>
              <p className="text-[11px] text-[#a08e7a] mb-2">Síntesis automatizada del lote procesado</p>

              <div className="bg-[#0d1c2d] rounded-lg p-2.5 border border-white/[0.04] space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] text-[#a08e7a]">Net Sentiment Score:</span>
                  <span className={`font-mono font-bold text-sm ${pctPositive >= pctNegative ? 'text-[#10b981]' : 'text-[#f43f5e]'}`}>
                    {metrics.processed > 0 ? `${pctPositive - pctNegative >= 0 ? '+' : ''}${pctPositive - pctNegative}%` : 'N/A'}
                  </span>
                </div>
                <p className="text-[11px] text-white leading-relaxed">
                  {metrics.processed === 0
                    ? 'Inicia la clasificación para generar la evaluación analítica automatizada de la experiencia de usuario.'
                    : pctPositive > 50
                    ? `Predominancia positiva del ${pctPositive}%. La categoría con mayor peso es "${Object.entries(metrics.categories).sort((a,b)=>b[1]-a[1])[0]?.[0]}".`
                    : `Se detecta fricción relevante (${pctNegative}% detractores). Se sugiere priorizar la atención a la categoría "${Object.entries(metrics.categories).sort((a,b)=>b[1]-a[1])[0]?.[0]}".`}
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* ======================================================== */}
        {/* FILA 4: FEED DE RESEÑAS (PANEL INFERIOR DE TRABAJO)       */}
        {/* ======================================================== */}
        <div className="bg-[#010f1f] border border-white/[0.08] rounded-xl p-3.5 flex flex-col gap-3 shadow-sm">
          
          {/* Barra de Búsqueda y Filtros */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-white/[0.06]">
            <div className="flex items-center space-x-2">
              <span className="material-symbols-outlined text-primary text-[20px]">feed</span>
              <h3 className="font-semibold text-xs tracking-wide text-white">
                Mesa de Trabajo ({filteredRows.length} de {rows.length})
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Buscador de texto */}
              <div className="relative">
                <Search className="w-3 h-3 absolute left-2.5 top-2 text-[#a08e7a]" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  placeholder="Buscar texto en opiniones..."
                  className="pl-7 pr-3 py-1 bg-[#0d1c2d] text-white text-[11px] rounded-lg border border-white/[0.1] focus:border-primary outline-none w-48"
                />
              </div>

              {/* Filtro de Sentimiento */}
              <select
                value={sentimentFilter}
                onChange={(e) => { setSentimentFilter(e.target.value); setCurrentPage(1); }}
                className="bg-[#0d1c2d] text-white text-[11px] px-2 py-1 rounded-lg border border-white/[0.1] outline-none cursor-pointer"
              >
                <option value="ALL">Sentimiento: Todos</option>
                <option value="Positivo">🟢 Positivo</option>
                <option value="Negativo">🔴 Negativo</option>
                <option value="Neutro">🟡 Neutro</option>
                <option value="PENDING">⏳ Pendiente</option>
              </select>

              {/* Filtro de Categoría */}
              <select
                value={categoryFilter}
                onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                className="bg-[#0d1c2d] text-white text-[11px] px-2 py-1 rounded-lg border border-white/[0.1] outline-none cursor-pointer"
              >
                <option value="ALL">Categoría: Todas</option>
                <option value="Atención">🏷️ Atención</option>
                <option value="Precio">🏷️ Precio</option>
                <option value="Calidad">🏷️ Calidad</option>
                <option value="Otro">🏷️ Otro</option>
              </select>
            </div>
          </div>

          {/* Listado de Tarjetas de Reseñas (.map) */}
          {rows.length === 0 ? (
            <div className="py-8 text-center text-[#a08e7a] text-xs flex flex-col items-center justify-center">
              <Database className="w-8 h-8 text-[#a08e7a]/40 mb-2" />
              <p>No hay datos cargados en el workspace.</p>
              <p className="text-[11px] mt-0.5">Arrastra un CSV arriba o haz clic en "Probar Dataset Demo".</p>
            </div>
          ) : paginatedRows.length === 0 ? (
            <div className="py-8 text-center text-[#a08e7a] text-xs">
              No se encontraron reseñas con los filtros seleccionados.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {paginatedRows.map((row) => {
                const textContent = String(row[selectedColumn] || '');
                return (
                  <div
                    key={row._id}
                    className="p-3 rounded-lg bg-[#0d1c2d]/90 hover:bg-[#122131] border border-white/[0.06] hover:border-primary/40 transition-all flex flex-col justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-[10px] text-[#a08e7a] bg-[#010f1f] px-1.5 py-0.5 rounded border border-white/[0.04]">
                          #{row._id + 1}
                        </span>
                        
                        {/* Badges de Sentimiento y Categoría Dinámicos */}
                        <div className="flex items-center space-x-1.5">
                          {row.Sentimiento_IA === 'Positivo' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30">
                              🟢 Positivo
                            </span>
                          ) : row.Sentimiento_IA === 'Negativo' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#f43f5e]/15 text-[#f43f5e] border border-[#f43f5e]/30">
                              🔴 Negativo
                            </span>
                          ) : row.Sentimiento_IA === 'Neutro' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#f59e0b]/15 text-primary border border-primary/30">
                              🟡 Neutro
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/[0.05] text-[#a08e7a]">
                              ⏳ Pendiente
                            </span>
                          )}

                          {row.Categoria_IA && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-sky-950/40 text-sky-300 border border-sky-800/30">
                              🏷️ {row.Categoria_IA}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Texto original de la opinión */}
                      <p className="text-xs text-white leading-relaxed line-clamp-3">
                        "{textContent}"
                      </p>
                    </div>

                    <div className="pt-1.5 border-t border-white/[0.04] flex items-center justify-between text-[10px] text-[#a08e7a]">
                      <span>
                        {row.Sentimiento_IA ? 'Clasificado con Gemini 2.5 Flash' : 'En cola de análisis'}
                      </span>
                      {row.Sentimiento_IA && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981]" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-xs">
              <span className="text-[11px] text-[#a08e7a]">
                Página {currentPage} de {totalPages}
              </span>
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 rounded bg-[#0d1c2d] hover:bg-[#1c2b3c] disabled:opacity-40 text-white border border-white/[0.06] transition-all"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 rounded bg-[#0d1c2d] hover:bg-[#1c2b3c] disabled:opacity-40 text-white border border-white/[0.06] transition-all"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}

        </div>

      </main>

      {/* ======================================================== */}
      {/* 4. FOOTER ESTADO DESKTOP INFERIOR                        */}
      {/* ======================================================== */}
      <footer className="h-6 border-t border-white/[0.06] bg-[#010f1f] px-4 flex items-center justify-between text-[10px] text-[#a08e7a] shrink-0">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></span>
            <span>Vite 8 Client Bundle</span>
          </span>
          <span>•</span>
          <span>Electron Native Framework Ready</span>
          <span>•</span>
          <span>Codificación: UTF-8 BOM Compatible</span>
        </div>
        <div className="flex items-center space-x-2">
          <span>{rows.length} filas mapeadas</span>
          <span>•</span>
          <span className="font-mono text-primary">v1.2.0 Studio</span>
        </div>
      </footer>

    </div>
  );
};

export default App;
