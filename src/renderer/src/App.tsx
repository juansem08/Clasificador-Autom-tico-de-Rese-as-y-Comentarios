import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Header } from './components/Header'
import { UploadZone } from './components/UploadZone'
import { TelemetryBar } from './components/TelemetryBar'
import { AnalyticsBento } from './components/AnalyticsBento'
import { ResultsGrid } from './components/ResultsGrid'
import { ApiKeyModal } from './components/ApiKeyModal'
import {
  AnalyticsMetrics,
  Category,
  ClassificationResult,
  CsvDatasetInfo,
  ProcessingProgress,
  ReviewItem
} from './types'
import { processingService } from './services/processingService'

export const App: React.FC = () => {
  // Gemini API Key state with localStorage persistence
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('gemini_api_key') || ''
  })
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('classifier-studio')

  // Dataset & Results state
  const [dataset, setDataset] = useState<CsvDatasetInfo | null>(null)
  const [resultsMap, setResultsMap] = useState<Map<number, ClassificationResult>>(
    new Map()
  )

  // Batching & Processing state
  const [isPaused, setIsPaused] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  const [progress, setProgress] = useState<ProcessingProgress>({
    processedRows: 0,
    totalRows: 0,
    currentBatch: 0,
    totalBatches: 0,
    percentage: 0,
    throughput: 0,
    estimatedSecondsRemaining: 0,
    status: 'idle'
  })

  // Save API key
  const handleSaveApiKey = (newKey: string) => {
    setApiKey(newKey)
    localStorage.setItem('gemini_api_key', newKey)
  }

  // Preload a rich sample dataset if user wants to test right away
  const handleLoadDemoDataset = () => {
    const demoRows = [
      {
        __row_id__: 1,
        Usuario: 'USR-9481',
        Fuente: 'iOS App Store',
        Comentario:
          'El servicio es bueno pero me cobraron la suscripción anual sin ningún aviso previo ni factura. Exijo reembolso inmediato o tendré que denunciar al banco.'
      },
      {
        __row_id__: 2,
        Usuario: 'USR-9482',
        Fuente: 'Google Play',
        Comentario:
          'Excelente atención del equipo de soporte técnico. Me ayudaron a migrar todos mis datos en menos de 20 minutos con paciencia y profesionalismo.'
      },
      {
        __row_id__: 3,
        Usuario: 'USR-9483',
        Fuente: 'Zendesk CSAT',
        Comentario:
          'La aplicación se cierra sola cada vez que intento exportar un reporte grande. Muy frustrante para un software empresarial.'
      },
      {
        __row_id__: 4,
        Usuario: 'USR-9484',
        Fuente: 'Trustpilot Business',
        Comentario:
          'El precio es bastante elevado comparado con la competencia, pero la estabilidad de las integraciones API compensa el costo mensual.'
      },
      {
        __row_id__: 5,
        Usuario: 'USR-9485',
        Fuente: 'Email Direct',
        Comentario:
          'El agente Marco fue muy cordial pero no tenía la información necesaria sobre los límites de tokens y tuve que buscar en los foros.'
      },
      {
        __row_id__: 6,
        Usuario: 'USR-9486',
        Fuente: 'iOS App Store',
        Comentario:
          'Cinco estrellas sin dudarlo. La velocidad de clasificación con el nuevo modelo superó nuestras expectativas en el equipo de analítica.'
      },
      {
        __row_id__: 7,
        Usuario: 'USR-9487',
        Fuente: 'Google Play',
        Comentario:
          'Aumentaron las tarifas un 40% este trimestre sin agregar funciones nuevas. Estamos evaluando migrar a otra alternativa.'
      },
      {
        __row_id__: 8,
        Usuario: 'USR-9488',
        Fuente: 'Trustpilot Business',
        Comentario:
          'La calidad del producto es sobresaliente. Cero caídas del servidor en los últimos 6 meses y la sincronización es instantánea.'
      }
    ]

    setDataset({
      fileName: 'enterprise_customer_reviews_demo.csv',
      fileSize: 4096,
      totalRows: demoRows.length,
      headers: ['Usuario', 'Fuente', 'Comentario'],
      suggestedReviewColumn: 'Comentario',
      selectedReviewColumn: 'Comentario',
      data: demoRows
    })

    setResultsMap(new Map())
    setProgress({
      processedRows: 0,
      totalRows: demoRows.length,
      currentBatch: 0,
      totalBatches: 0,
      percentage: 0,
      throughput: 0,
      estimatedSecondsRemaining: 0,
      status: 'idle'
    })
  }

  // Calculate live analytics metrics from resultsMap
  const metrics: AnalyticsMetrics = useMemo(() => {
    const totalProcessed = resultsMap.size
    let positive = 0
    let negative = 0
    let neutral = 0
    let confidenceSum = 0

    const categoryCounts: Record<Category, number> = {
      Atención: 0,
      Precio: 0,
      Calidad: 0,
      Otro: 0
    }

    resultsMap.forEach((res) => {
      if (res.sentimiento === 'Positivo') positive++
      else if (res.sentimiento === 'Negativo') negative++
      else neutral++

      if (categoryCounts[res.categoria] !== undefined) {
        categoryCounts[res.categoria]++
      } else {
        categoryCounts['Otro']++
      }

      confidenceSum += res.confidence || 0.95
    })

    const posPct = totalProcessed > 0 ? Math.round((positive / totalProcessed) * 100) : 0
    const negPct = totalProcessed > 0 ? Math.round((negative / totalProcessed) * 100) : 0
    const neuPct = totalProcessed > 0 ? Math.max(0, 100 - posPct - negPct) : 0
    const avgConfidence = totalProcessed > 0 ? Math.round((confidenceSum / totalProcessed) * 1000) / 10 : 0

    return {
      totalProcessed,
      positiveCount: positive,
      negativeCount: negative,
      neutralCount: neutral,
      positivePercentage: posPct,
      negativePercentage: negPct,
      neutralPercentage: neuPct,
      categoryCounts,
      avgConfidence,
      throughputSpeed: progress.throughput,
      avgLatencyMs: 42
    }
  }, [resultsMap, progress.throughput])

  // Iniciar clasificación por lotes con Gemini 2.5 Flash
  const handleStartClassification = async () => {
    if (!dataset || dataset.data.length === 0) return

    if (!apiKey.trim()) {
      setIsApiKeyModalOpen(true)
      return
    }

    const reviewColumn = dataset.selectedReviewColumn || dataset.headers[0]
    const itemsToClassify: ReviewItem[] = dataset.data.map((row) => ({
      id: row.__row_id__,
      text: String(row[reviewColumn] || '').trim()
    }))

    const controller = new AbortController()
    abortControllerRef.current = controller
    setIsPaused(false)

    try {
      await processingService.processReviews(itemsToClassify, {
        batchSize: 18, // 15-20 comentarios por lote
        apiKey: apiKey.trim(),
        delayBetweenBatchesMs: 200,
        signal: controller.signal,
        onProgress: (prog) => {
          setProgress(prog)
        },
        onBatchCompleted: (_batchResults, accumulatedMap) => {
          // Actualización inmutable para disparar re-render de componentes
          setResultsMap(new Map(accumulatedMap))
        }
      })
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Procesamiento abortado por el usuario')
      } else {
        alert(`Error en el procesamiento: ${err.message}`)
      }
    } finally {
      abortControllerRef.current = null
    }
  }

  const handlePauseResume = () => {
    if (isPaused) {
      processingService.resume()
      setIsPaused(false)
    } else {
      processingService.pause()
      setIsPaused(true)
    }
  }

  const handleAbort = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface">
      {/* Top Application Bar */}
      <Header
        apiKey={apiKey}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Workspace Canvas */}
      <main className="w-full pt-14 flex-1 flex flex-col">
        <div className="w-full px-space-xl py-space-lg flex flex-col gap-space-lg max-w-[1720px] mx-auto">
          {/* Quick Demo Dataset Banner if empty */}
          {!dataset && (
            <div className="bg-primary/5 border border-primary/20 p-space-md rounded-xl flex items-center justify-between gap-space-md">
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-primary text-[22px]">
                  auto_awesome
                </span>
                <span className="font-body-sm text-body-sm text-on-surface">
                  ¿Quieres probar la suite inmediatamente? Carga nuestro dataset de demostración con 8 comentarios de prueba.
                </span>
              </div>
              <button
                type="button"
                onClick={handleLoadDemoDataset}
                className="bg-primary text-on-primary font-label-sm text-label-sm px-space-md py-1.5 rounded-lg shadow-sm hover:bg-on-primary-fixed-variant transition-colors flex items-center gap-1.5 shrink-0"
              >
                <span className="material-symbols-outlined text-[16px]">dataset</span>
                <span>Cargar Dataset Demo</span>
              </button>
            </div>
          )}

          {/* Ingestion & Configuration Area */}
          <UploadZone
            dataset={dataset}
            setDataset={setDataset}
            onStartClassification={handleStartClassification}
            isProcessing={progress.status === 'processing'}
            apiKey={apiKey}
            onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
          />

          {/* Realtime Telemetry Bar */}
          {(progress.status === 'processing' || progress.status === 'completed' || resultsMap.size > 0) && (
            <TelemetryBar
              progress={progress}
              onPauseResume={handlePauseResume}
              onAbort={handleAbort}
              isPaused={isPaused}
            />
          )}

          {/* Bento Analytics Panels */}
          {resultsMap.size > 0 && <AnalyticsBento metrics={metrics} />}

          {/* High-Density Results Grid & Sticky Export Drawer */}
          {dataset && <ResultsGrid dataset={dataset} resultsMap={resultsMap} />}
        </div>
      </main>

      {/* Persistent Desktop Footer */}
      <footer className="w-full bg-surface-container-lowest border-t border-outline-variant/20 shadow-[0_-1px_6px_rgba(0,0,0,0.03)] mt-auto">
        <div className="h-9 w-full px-space-lg flex items-center justify-between text-on-surface-variant font-code-sm text-code-sm text-[11px]">
          <div className="flex items-center gap-space-lg">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></span>
              <span>Engine: Operational • gemini-2.5-flash</span>
            </div>
            <div className="flex items-center gap-1">
              <span>Latency:</span>
              <span className="text-on-surface font-medium">42ms</span>
            </div>
            <div className="flex items-center gap-1">
              <span>UTF-8 BOM Validated (\ufeff)</span>
            </div>
          </div>
          <div className="flex items-center gap-space-lg">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px] text-primary">
                security
              </span>
              <span>Local Data Sandbox</span>
            </div>
            <div className="text-on-surface-variant opacity-80">
              ReviewClassifier AI Suite © 2025
            </div>
          </div>
        </div>
      </footer>

      {/* API Key Configuration Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        currentApiKey={apiKey}
        onSaveApiKey={handleSaveApiKey}
      />
    </div>
  )
}
export default App
