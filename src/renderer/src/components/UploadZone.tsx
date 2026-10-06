import React, { useRef, useState } from 'react'
import { CsvDatasetInfo } from '../types'
import { csvService } from '../services/csvService'

interface UploadZoneProps {
  dataset: CsvDatasetInfo | null
  setDataset: (dataset: CsvDatasetInfo | null) => void
  onStartClassification: () => void
  isProcessing: boolean
  apiKey: string
  onOpenApiKeyModal: () => void
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  dataset,
  setDataset,
  onStartClassification,
  isProcessing,
  apiKey,
  onOpenApiKeyModal
}) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const [includeRationale, setIncludeRationale] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileProcess = async (file: File) => {
    try {
      const parsedDataset = await csvService.parseCsv(file)
      setDataset(parsedDataset)
    } catch (err: any) {
      alert(`Error al procesar archivo: ${err.message}`)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileProcess(e.target.files[0])
    }
  }

  // Native Electron Open Dialog fallback to standard input click
  const handleBrowseFiles = async () => {
    if (window.electronAPI && typeof window.electronAPI.openCsvFileDialog === 'function') {
      try {
        const res = await window.electronAPI.openCsvFileDialog()
        if (res && res.content) {
          const parsed = csvService.parseCsvString(res.content, res.fileName, res.sizeBytes)
          setDataset(parsed)
          return
        }
      } catch (err) {
        console.warn('Error en diálogo nativo Electron, usando fallback de archivo:', err)
      }
    }

    fileInputRef.current?.click()
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0])
    }
  }

  const handleColumnChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!dataset) return
    setDataset({
      ...dataset,
      selectedReviewColumn: e.target.value
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="flex flex-col gap-space-lg w-full">
      {/* Sub-header & Realtime Telemetry Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/20">
        <div className="flex flex-wrap items-center gap-space-md min-w-0">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-primary text-[20px]">
              smart_toy
            </span>
            <span className="font-headline-sm text-headline-sm text-on-surface">
              Gemini Orchestrator
            </span>
          </div>

          <div className="h-4 w-px bg-outline-variant/40 hidden sm:block"></div>

          <div className="flex items-center gap-1.5 bg-surface-container-low px-space-sm py-1 rounded">
            <span className="font-label-xs text-label-xs text-on-surface-variant font-medium">
              Model:
            </span>
            <span className="font-code-sm text-code-sm text-on-surface font-semibold">
              gemini-2.5-flash
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-surface-container-low px-space-sm py-1 rounded">
            <span className="font-label-xs text-label-xs text-on-surface-variant font-medium">
              Batching:
            </span>
            <span className="font-code-sm text-code-sm text-primary font-bold">
              15 - 20 rows/batch
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-surface-container-low px-space-sm py-1 rounded">
            <span className="font-label-xs text-label-xs text-on-surface-variant font-medium">
              Structured Output:
            </span>
            <span className="font-label-xs text-label-xs text-[#065f46] font-semibold bg-[#ecfdf5] px-1.5 py-0.5 rounded border border-[#a7f3d0]">
              Strict JSON Schema
            </span>
          </div>
        </div>

        <div className="flex items-center gap-space-sm shrink-0">
          <div
            onClick={onOpenApiKeyModal}
            className="flex items-center bg-surface-container-low hover:bg-surface-container px-space-sm py-1 rounded gap-1.5 cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[15px] text-outline">key</span>
            <span className="font-label-xs text-label-xs text-on-surface-variant">
              Active Token:
            </span>
            <span className="font-code-sm text-code-sm text-on-surface font-medium">
              {apiKey ? apiKey.slice(0, 6) + '•••' + apiKey.slice(-3) : 'Sin configurar'}
            </span>
            <button
              className="text-on-surface-variant hover:text-primary transition-colors flex items-center ml-1"
              title="Configurar credenciales de Gemini"
              type="button"
            >
              <span className="material-symbols-outlined text-[15px]">edit</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace Split: Upload Drag-and-Drop + Classifier Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-stretch">
        {/* 7 Columns: Ingest Dropzone & Active Dataset Overview */}
        <div className="lg:col-span-7 bg-surface-container-lowest p-space-lg rounded-xl shadow-sm border border-outline-variant/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-space-md">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary text-[20px]">
                  upload_file
                </span>
                <h2 className="font-headline-sm text-headline-sm text-on-surface">
                  Data Ingestion Hub
                </h2>
              </div>
              <span className="font-label-xs text-label-xs bg-surface-container text-on-surface-variant px-space-sm py-0.5 rounded">
                Multi-tenant Ready • BOM Preserved
              </span>
            </div>

            {/* Drag and Drop Target Area */}
            <div
              id="drop-area"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleBrowseFiles}
              className={`relative group rounded-xl p-space-xl text-center border-2 border-dashed transition-all cursor-pointer ${
                isDragOver
                  ? 'bg-primary/5 border-primary ring-2 ring-primary/20'
                  : 'bg-surface-container-low/60 hover:bg-surface-container border-outline-variant/60'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,.txt"
                onChange={handleFileInputChange}
                className="hidden"
              />

              <div className="flex flex-col items-center justify-center gap-space-sm pointer-events-none">
                <div className="w-14 h-14 rounded-full bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                  <span className="material-symbols-outlined text-primary text-[32px]">
                    cloud_upload
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                    Drag &amp; drop your feedback dataset (.CSV, .TSV)
                  </p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md mx-auto">
                    Compatible con UTF-8, Windows-1252, tildes y caracteres especiales en Microsoft Excel y PowerBI.
                  </p>
                </div>
                <div className="pt-space-xs">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleBrowseFiles()
                    }}
                    className="pointer-events-auto bg-surface-container-lowest hover:bg-surface-container text-on-surface font-label-md text-label-md px-space-lg py-2 rounded-lg shadow-sm border border-outline-variant/30 transition-colors inline-flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      folder_open
                    </span>
                    <span>Browse Local Drive</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Loaded File Preview Strip */}
          {dataset ? (
            <div className="mt-space-md pt-space-md bg-surface-container-low rounded-lg p-space-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md border border-outline-variant/30 animate-fadeIn">
              <div className="flex items-center gap-space-md min-w-0">
                <div className="w-10 h-10 rounded bg-[#ecfdf5] text-[#059669] flex items-center justify-center shrink-0 border border-[#a7f3d0]">
                  <span className="material-symbols-outlined text-[24px]">
                    description
                  </span>
                </div>
                <div className="min-w-0 flex flex-col">
                  <div className="flex items-center gap-space-xs">
                    <span className="font-label-md text-label-md text-on-surface font-semibold truncate">
                      {dataset.fileName}
                    </span>
                    <span className="font-label-xs text-label-xs bg-[#ecfdf5] text-[#065f46] px-1.5 py-0.5 rounded font-medium border border-[#a7f3d0]">
                      Valid Schema
                    </span>
                  </div>
                  <p className="font-code-sm text-code-sm text-on-surface-variant truncate">
                    {formatFileSize(dataset.fileSize)} • {dataset.totalRows.toLocaleString()}{' '}
                    rows • Column: &quot;{dataset.selectedReviewColumn}&quot;
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-space-xs shrink-0 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setDataset(null)}
                  className="font-label-sm text-label-sm px-space-sm py-1 rounded text-error hover:bg-error-container/40 transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                  <span>Unload</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-space-md pt-space-md text-center py-2 text-on-surface-variant font-body-sm text-body-sm italic">
              Ningún archivo cargado aún. Arrastra un archivo CSV o haz clic en examinar.
            </div>
          )}
        </div>

        {/* 5 Columns: AI Classification Rules & Action CTA */}
        <div className="lg:col-span-5 bg-surface-container-lowest p-space-lg rounded-xl shadow-sm border border-outline-variant/20 flex flex-col justify-between gap-space-md">
          <div className="flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary text-[20px]">
                  tune
                </span>
                <h2 className="font-headline-sm text-headline-sm text-on-surface">
                  Classifier Configuration
                </h2>
              </div>
              <span className="font-code-sm text-code-sm text-primary font-medium">
                Temp: 0.1
              </span>
            </div>

            {/* Column Selection Dropdown */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="font-label-sm text-label-sm text-on-surface font-medium">
                  Target Review Column
                </label>
                <span className="font-label-xs text-label-xs text-[#065f46] bg-[#ecfdf5] px-1.5 py-0.5 rounded border border-[#a7f3d0]">
                  Auto-detected
                </span>
              </div>
              <div className="relative">
                <select
                  disabled={!dataset || dataset.headers.length === 0}
                  value={dataset?.selectedReviewColumn || ''}
                  onChange={handleColumnChange}
                  className="w-full bg-surface-container-low font-body-md text-body-md text-on-surface px-space-md py-2 rounded-lg outline-none cursor-pointer appearance-none border border-outline-variant/30 focus:border-primary transition-colors disabled:opacity-60"
                >
                  {dataset && dataset.headers.length > 0 ? (
                    dataset.headers.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))
                  ) : (
                    <option value="">(Carga un CSV para seleccionar columna)</option>
                  )}
                </select>
                <span className="material-symbols-outlined absolute right-space-sm top-2.5 text-on-surface-variant pointer-events-none text-[20px]">
                  expand_more
                </span>
              </div>
            </div>

            {/* Output Taxonomies Badges */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="font-label-sm text-label-sm text-on-surface font-medium">
                  Output Taxonomies
                </label>
                <span className="font-label-xs text-label-xs text-on-surface-variant">
                  4 categories defined
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 p-space-sm bg-surface-container-low rounded-lg min-h-[46px] items-center border border-outline-variant/20">
                <span className="inline-flex items-center gap-1 bg-surface-container-lowest text-on-surface font-label-xs text-label-xs px-2 py-1 rounded shadow-sm border border-outline-variant/30">
                  <span className="w-2 h-2 rounded-full bg-primary"></span>
                  <span>Atención / Support</span>
                </span>
                <span className="inline-flex items-center gap-1 bg-surface-container-lowest text-on-surface font-label-xs text-label-xs px-2 py-1 rounded shadow-sm border border-outline-variant/30">
                  <span className="w-2 h-2 rounded-full bg-tertiary"></span>
                  <span>Precio / Pricing</span>
                </span>
                <span className="inline-flex items-center gap-1 bg-surface-container-lowest text-on-surface font-label-xs text-label-xs px-2 py-1 rounded shadow-sm border border-outline-variant/30">
                  <span className="w-2 h-2 rounded-full bg-[#10b981]"></span>
                  <span>Calidad / Quality</span>
                </span>
                <span className="inline-flex items-center gap-1 bg-surface-container-lowest text-on-surface font-label-xs text-label-xs px-2 py-1 rounded shadow-sm border border-outline-variant/30">
                  <span className="w-2 h-2 rounded-full bg-[#f59e0b]"></span>
                  <span>Otro / General</span>
                </span>
              </div>
            </div>

            {/* Chain-of-Thought Rationale Switch */}
            <div className="bg-surface-container-low p-space-sm rounded-lg flex items-center justify-between border border-outline-variant/20">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-on-surface font-medium">
                  Chain-of-Thought Rationale
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant text-[12px]">
                  Generate 1-sentence reasoning per classification
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeRationale}
                  onChange={(e) => setIncludeRationale(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>

          {/* Big CTA Button */}
          <button
            type="button"
            disabled={!dataset || isProcessing}
            onClick={onStartClassification}
            id="start-classification-btn"
            className={`w-full text-on-primary font-label-md text-label-md py-3 px-space-lg rounded-xl shadow-md flex items-center justify-center gap-2 transition-all transform ${
              !dataset || isProcessing
                ? 'bg-outline-variant cursor-not-allowed opacity-60'
                : 'bg-primary hover:bg-on-primary-fixed-variant active:scale-[0.99] cursor-pointer'
            }`}
          >
            {isProcessing ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[20px]">
                  sync
                </span>
                <span className="font-semibold tracking-wide">
                  Streaming Gemini Batches...
                </span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">bolt</span>
                <span className="font-semibold tracking-wide">
                  {dataset
                    ? `Start Batch AI Classification (${dataset.totalRows.toLocaleString()} rows)`
                    : 'Select a CSV Dataset to Begin'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
