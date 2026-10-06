import { ClassificationResult, ProcessingProgress, ReviewItem } from '../types'
import { geminiService } from './geminiService'

export interface BatchProcessingOptions {
  batchSize?: number // Tamaño de lote (15 a 20 por defecto)
  apiKey: string
  delayBetweenBatchesMs?: number // Pequeña pausa entre llamadas para regular cuota
  onProgress?: (progress: ProcessingProgress) => void
  onBatchCompleted?: (batchResults: ClassificationResult[], accumulatedMap: Map<number, ClassificationResult>) => void
  signal?: AbortSignal
}

/**
 * Motor de procesamiento en lotes (Batching Engine) para ReviewClassifier AI.
 * Procesa datasets de cientos o miles de filas en chunks controlados de 15 a 20 comentarios,
 * emitiendo telemetría fluida sin saturar la API ni congelar la UI de React.
 */
export class ProcessingService {
  private isPaused: boolean = false

  public pause(): void {
    this.isPaused = true
  }

  public resume(): void {
    this.isPaused = false
  }

  public getPaused(): boolean {
    return this.isPaused
  }

  /**
   * Procesa la lista completa de reseñas dividiéndola en batches de 15-20 elementos.
   */
  public async processReviews(
    items: ReviewItem[],
    options: BatchProcessingOptions
  ): Promise<Map<number, ClassificationResult>> {
    const {
      batchSize = 18, // Rango óptimo 15-20
      apiKey,
      delayBetweenBatchesMs = 150,
      onProgress,
      onBatchCompleted,
      signal
    } = options

    const totalRows = items.length
    const resultsMap = new Map<number, ClassificationResult>()

    if (totalRows === 0) {
      onProgress?.({
        processedRows: 0,
        totalRows: 0,
        currentBatch: 0,
        totalBatches: 0,
        percentage: 100,
        throughput: 0,
        estimatedSecondsRemaining: 0,
        status: 'completed'
      })
      return resultsMap
    }

    // Dividir items en lotes
    const batches: ReviewItem[][] = []
    for (let i = 0; i < totalRows; i += batchSize) {
      batches.push(items.slice(i, i + batchSize))
    }

    const totalBatches = batches.length
    let processedRows = 0
    const startTime = performance.now()

    // Telemetría inicial
    onProgress?.({
      processedRows: 0,
      totalRows,
      currentBatch: 0,
      totalBatches,
      percentage: 0,
      throughput: 0,
      estimatedSecondsRemaining: 0,
      status: 'processing'
    })

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      // Verificar si se solicitó cancelación mediante AbortSignal
      if (signal?.aborted) {
        onProgress?.({
          processedRows,
          totalRows,
          currentBatch: batchIndex,
          totalBatches,
          percentage: Math.round((processedRows / totalRows) * 100),
          throughput: 0,
          estimatedSecondsRemaining: 0,
          status: 'idle',
          errorMessage: 'Proceso cancelado por el usuario.'
        })
        throw new DOMException('Proceso abortado por el usuario', 'AbortError')
      }

      // Manejo de pausa
      while (this.isPaused) {
        if (signal?.aborted) throw new DOMException('Proceso abortado', 'AbortError')
        await new Promise((r) => setTimeout(r, 200))
      }

      const currentBatchItems = batches[batchIndex]
      let batchResults: ClassificationResult[] = []

      // Bloque try/catch específico por lote con reintento ante fallos transitorios
      let attempts = 0
      const maxAttempts = 2
      let success = false

      while (attempts < maxAttempts && !success) {
        try {
          attempts++
          batchResults = await geminiService.classifyBatch(currentBatchItems, { apiKey })
          success = true
        } catch (batchError: any) {
          console.warn(`Lote ${batchIndex + 1}/${totalBatches} falló en intento ${attempts}:`, batchError)
          if (attempts >= maxAttempts) {
            // Si el lote falla completamente, asignamos un fallback neutro para no romper el pipeline
            console.error(`Lote ${batchIndex + 1} marcado con fallback preventivo.`)
            batchResults = currentBatchItems.map((item) => ({
              id: item.id,
              sentimiento: 'Neutro',
              categoria: 'Otro',
              confidence: 0.5,
              explanation: 'Inferencia reintentada sin éxito. Se aplicó fallback seguro.'
            }))
            success = true
          } else {
            // Pausa con backoff antes del segundo intento
            await new Promise((r) => setTimeout(r, 1000 * attempts))
          }
        }
      }

      // Guardar resultados en el mapa consolidado
      for (const res of batchResults) {
        resultsMap.set(res.id, res)
      }

      processedRows += currentBatchItems.length

      // Calcular telemetría en tiempo real
      const elapsedSec = Math.max(0.1, (performance.now() - startTime) / 1000)
      const throughput = Math.round((processedRows / elapsedSec) * 10) / 10
      const remainingRows = totalRows - processedRows
      const estimatedSecondsRemaining = throughput > 0 ? Math.round((remainingRows / throughput) * 10) / 10 : 0
      const percentage = Math.min(100, Math.round((processedRows / totalRows) * 100))

      onProgress?.({
        processedRows,
        totalRows,
        currentBatch: batchIndex + 1,
        totalBatches,
        percentage,
        throughput,
        estimatedSecondsRemaining,
        status: processedRows >= totalRows ? 'completed' : 'processing'
      })

      onBatchCompleted?.(batchResults, resultsMap)

      // Pequeña pausa entre lotes para no saturar peticiones
      if (batchIndex < totalBatches - 1 && delayBetweenBatchesMs > 0) {
        await new Promise((r) => setTimeout(r, delayBetweenBatchesMs))
      }
    }

    return resultsMap
  }
}

export const processingService = new ProcessingService()
