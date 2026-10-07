import React, { useState, useRef, useMemo } from 'react';
import Papa from 'papaparse';
import { Header } from './components/Header';
import { FileDropzone } from './components/FileDropzone';
import { ConfigPanel } from './components/ConfigPanel';
import { ControlBar } from './components/ControlBar';
import { MetricsOverview } from './components/MetricsOverview';
import { ReviewFeed } from './components/ReviewFeed';
import { ExportButton } from './components/ExportButton';
import { SAMPLE_CSV_CONTENT } from './services/sampleData';
import { GeminiClassifierService } from './services/geminiService';
import type { ReviewRow, ProcessingState, BatchProgress, ProcessingMetrics, ClassifiedReview } from './types';
import { Sparkles, Cpu, CheckCircle2 } from 'lucide-react';

export const App: React.FC = () => {
  // Estado de API Key con persistencia automática en localStorage
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('gemini_api_key') || '';
  });

  // Estado de archivo y datos
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [rows, setRows] = useState<ReviewRow[]>([]);

  // Configuración de procesamiento
  const [batchSize, setBatchSize] = useState<number>(15);
  const [status, setStatus] = useState<ProcessingState>('idle');
  const [error, setError] = useState<string | null>(null);

  // Progreso
  const [progress, setProgress] = useState<BatchProgress>({
    currentBatch: 0,
    totalBatches: 0,
    batchSize: 15,
    processedRows: 0,
    totalRows: 0,
    message: '',
  });

  // Controlador de cancelación
  const abortControllerRef = useRef<AbortController | null>(null);

  // Persistir API Key al cambiar
  const handleApiKeyChange = (newKey: string) => {
    setApiKey(newKey);
    localStorage.setItem('gemini_api_key', newKey.trim());
  };

  // Helper para autodetección de columna de opiniones
  const autoDetectReviewColumn = (cols: string[]): string => {
    const keywords = ['reseña', 'review', 'comentario', 'opinion', 'opinión', 'feedback', 'texto', 'text', 'mensaje'];
    for (const kw of keywords) {
      const match = cols.find((c) => c.toLowerCase().includes(kw));
      if (match) return match;
    }
    return cols[0] || '';
  };

  // Carga de archivo CSV local mediante PapaParse
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

  // Carga del dataset de demostración precargado
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
        setProgress({
          currentBatch: 0,
          totalBatches: Math.ceil(mappedRows.length / batchSize),
          batchSize,
          processedRows: 0,
          totalRows: mappedRows.length,
          message: 'Demo de 30 opiniones cargado',
        });
      },
    });
  };

  // Descartar archivo
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

  // Reiniciar solo clasificaciones conservando el CSV cargado
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

  // Detener el procesamiento en curso
  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setStatus('paused');
    setProgress((prev) => ({
      ...prev,
      message: 'Proceso detenido.',
    }));
  };

  // Iniciar la clasificación de opiniones con Gemini
  const handleStartClassification = async () => {
    if (!apiKey.trim()) {
      setError('Ingresa una Gemini API Key en la barra superior.');
      return;
    }
    if (!selectedColumn) {
      setError('Selecciona la columna con las opiniones.');
      return;
    }
    if (rows.length === 0) {
      setError('No hay filas cargadas para procesar.');
      return;
    }

    setError(null);
    setStatus('running');

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const classifier = new GeminiClassifierService(apiKey.trim(), 'gemini-2.5-flash');

    // Identificar qué filas necesitan procesamiento
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
          message: `Lote ${b + 1}/${totalBatches}... (${processedCount}/${rows.length})`,
        });

        // Preparar lote con ID y texto
        const batchPayload = currentBatchItems.map(({ row }) => ({
          id: row._id,
          text: String(row[selectedColumn] || ''),
        }));

        // Llamada a la IA
        const classifications: ClassifiedReview[] = await classifier.classifyBatch(
          batchPayload,
          abortController.signal
        );

        // Actualizar filas en tiempo real
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
          message: `Lote ${b + 1} listo (${processedCount}/${rows.length})`,
        });
      }

      if (!abortController.signal.aborted) {
        setStatus('completed');
        setProgress((prev) => ({
          ...prev,
          processedRows: rows.length,
          message: '¡Clasificación completada! Ya puedes exportar.',
        }));
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setStatus('paused');
        setProgress((prev) => ({
          ...prev,
          message: 'Proceso detenido por el usuario.',
        }));
      } else {
        setStatus('error');
        setError(err?.message || 'Error inesperado durante la clasificación');
        console.error('Error durante la clasificación:', err);
      }
    }
  };

  // Cálculo reactivo de métricas
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

  const canStart = Boolean(
    apiKey.trim().length > 10 &&
    selectedColumn &&
    rows.length > 0 &&
    status !== 'running'
  );

  const samplePreviewText = useMemo(() => {
    if (rows.length > 0 && selectedColumn) {
      return String(rows[0][selectedColumn] || '');
    }
    return '';
  }, [rows, selectedColumn]);

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-slate-950 text-slate-100">
      
      {/* 1. Header Desktop Superior */}
      <Header apiKey={apiKey} onApiKeyChange={handleApiKeyChange} />

      {/* 2. Workspace Desktop: Panel Dividido (Sidebar Izquierdo + Mesa de Trabajo Derecha) */}
      <main className="flex-1 min-h-0 w-full px-4 py-3 grid grid-cols-12 gap-3.5 overflow-hidden">
        
        {/* Panel Izquierdo: Configuración, Controles y KPIs (33% ancho en desktop) */}
        <aside className="col-span-12 lg:col-span-4 xl:col-span-4 flex flex-col gap-3 overflow-y-auto pr-1 min-h-0">
          
          {/* Tarjeta 1: CSV Dropzone */}
          <FileDropzone
            fileName={fileName}
            fileSize={fileSize}
            totalRows={rows.length}
            onFileLoaded={handleFileLoaded}
            onReset={handleReset}
            onLoadSample={handleLoadSample}
            disabled={status === 'running'}
          />

          {/* Tarjeta 2: Configuración de Columna y Lotes */}
          <ConfigPanel
            columns={columns}
            selectedColumn={selectedColumn}
            onColumnChange={setSelectedColumn}
            batchSize={batchSize}
            onBatchSizeChange={setBatchSize}
            disabled={status === 'running'}
            samplePreviewText={samplePreviewText}
            hasFile={Boolean(fileName)}
          />

          {/* Tarjeta 3: Controles de Ejecución */}
          <ControlBar
            status={status}
            progress={progress}
            canStart={canStart}
            onStart={handleStartClassification}
            onStop={handleStop}
            onReset={handleResetClassifications}
            error={error}
          />

          {/* Tarjeta 4: Métricas de Sentimiento y Categorías */}
          <MetricsOverview metrics={metrics} />

        </aside>

        {/* Panel Derecho: Tabla / Feed con Scroll Independiente y Exportación (67% ancho) */}
        <section className="col-span-12 lg:col-span-8 xl:col-span-8 h-full min-h-0 flex flex-col">
          <ReviewFeed
            rows={rows}
            selectedColumn={selectedColumn}
            onLoadSample={handleLoadSample}
            exportButtonNode={
              <ExportButton
                rows={rows}
                originalFilename={fileName || 'resenas_clasificadas.csv'}
                disabled={status === 'running'}
              />
            }
          />
        </section>

      </main>

      {/* 3. Barra de Estado Inferior de Escritorio */}
      <footer className="h-6 w-full border-t border-slate-900 bg-slate-950/95 px-4 flex items-center justify-between text-[10px] text-slate-500 shrink-0 select-none">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1 text-slate-400">
            <Cpu className="w-3 h-3 text-indigo-400" />
            <span>Modelo: gemini-2.5-flash</span>
          </span>
          <span>•</span>
          <span>Codificación: UTF-8 BOM (Excel compatible)</span>
        </div>
        <div className="flex items-center space-x-2">
          {status === 'running' ? (
            <span className="flex items-center space-x-1 text-indigo-400 font-medium animate-pulse">
              <Sparkles className="w-2.5 h-2.5" />
              <span>Procesando lote...</span>
            </span>
          ) : rows.length > 0 ? (
            <span className="flex items-center space-x-1 text-emerald-400">
              <CheckCircle2 className="w-2.5 h-2.5" />
              <span>{rows.length} registros en memoria</span>
            </span>
          ) : (
            <span>Listo</span>
          )}
          <span>•</span>
          <span>v1.0.0 Desktop</span>
        </div>
      </footer>

    </div>
  );
};

export default App;
