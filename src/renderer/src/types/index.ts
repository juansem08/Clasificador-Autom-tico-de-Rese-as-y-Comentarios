export type Sentiment = 'Positivo' | 'Negativo' | 'Neutro'
export type Category = 'Atención' | 'Precio' | 'Calidad' | 'Otro'

export interface RawCsvRow {
  __row_id__: number
  [key: string]: any
}

export interface ReviewItem {
  id: number
  text: string
}

export interface ClassificationResult {
  id: number
  sentimiento: Sentiment
  categoria: Category
  confidence?: number
  explanation?: string
}

export interface EnrichedRow extends RawCsvRow {
  Sentimiento_IA?: Sentiment
  Categoria_IA?: Category
  IA_Explicacion?: string
  IA_Confianza?: number
}

export interface ProcessingProgress {
  processedRows: number
  totalRows: number
  currentBatch: number
  totalBatches: number
  percentage: number
  throughput: number // rows per second
  estimatedSecondsRemaining: number
  status: 'idle' | 'processing' | 'paused' | 'completed' | 'error'
  errorMessage?: string
}

export interface AnalyticsMetrics {
  totalProcessed: number
  positiveCount: number
  negativeCount: number
  neutralCount: number
  positivePercentage: number
  negativePercentage: number
  neutralPercentage: number
  categoryCounts: Record<Category, number>
  avgConfidence: number
  throughputSpeed: number
  avgLatencyMs: number
}

export interface CsvDatasetInfo {
  fileName: string
  fileSize: number
  totalRows: number
  headers: string[]
  suggestedReviewColumn: string
  selectedReviewColumn: string
  data: RawCsvRow[]
}
