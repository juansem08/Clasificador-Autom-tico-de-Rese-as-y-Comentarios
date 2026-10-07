export type Sentiment = 'Positivo' | 'Negativo' | 'Neutro';
export type Category = 'Atención' | 'Precio' | 'Calidad' | 'Otro';

export interface ClassifiedReview {
  id: number;
  sentimiento: Sentiment;
  categoria: Category;
}

export interface ReviewRow {
  _id: number;
  [key: string]: any;
  Sentimiento_IA?: Sentiment;
  Categoria_IA?: Category;
  _status?: 'pending' | 'processing' | 'done' | 'error';
  _error?: string;
}

export interface ProcessingMetrics {
  total: number;
  processed: number;
  positive: number;
  negative: number;
  neutral: number;
  categories: {
    'Atención': number;
    'Precio': number;
    'Calidad': number;
    'Otro': number;
  };
}

export type ProcessingState = 'idle' | 'running' | 'paused' | 'completed' | 'error';

export interface BatchProgress {
  currentBatch: number;
  totalBatches: number;
  batchSize: number;
  processedRows: number;
  totalRows: number;
  message: string;
}

declare global {
  interface Window {
    electronAPI?: {
      minimizeWindow: () => void;
      maximizeWindow: () => void;
      closeWindow: () => void;
      isElectron?: boolean;
    };
  }
}

