import { GoogleGenAI, Type } from '@google/genai';
import type { ClassifiedReview } from '../types';

export interface BatchItem {
  id: number;
  text: string;
}

export class GeminiClassifierService {
  private ai: GoogleGenAI;
  private modelName: string;

  constructor(apiKey: string, modelName: string = 'gemini-2.5-flash') {
    this.ai = new GoogleGenAI({ apiKey });
    this.modelName = modelName;
  }

  /**
   * Clasifica un lote de reseñas usando el SDK @google/genai y respuesta estructurada JSON.
   */
  async classifyBatch(
    items: BatchItem[],
    abortSignal?: AbortSignal,
    maxRetries: number = 3
  ): Promise<ClassifiedReview[]> {
    if (items.length === 0) return [];

    let attempt = 0;
    let delay = 1500;

    const formattedList = items
      .map((item) => `[ID: ${item.id}] "${item.text.replace(/"/g, "'").trim()}"`)
      .join('\n');

    const prompt = `Eres un sistema experto en análisis de sentimiento y categorización de opiniones de clientes en español.
Analiza cada una de las siguientes opiniones y asigna estrictamente:
1. "sentimiento": Uno de ["Positivo", "Negativo", "Neutro"].
2. "categoria": Uno de ["Atención", "Precio", "Calidad", "Otro"].

Opiniones a clasificar:
${formattedList}

Devuelve una clasificación para CADA una de las opiniones identificada por su ID numérico exacto.`;

    while (attempt < maxRetries) {
      if (abortSignal?.aborted) {
        throw new DOMException('Operación cancelada por el usuario', 'AbortError');
      }

      try {
        const response = await this.ai.models.generateContent({
          model: this.modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                classifications: {
                  type: Type.ARRAY,
                  description: 'Lista de clasificaciones de las reseñas por ID',
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: {
                        type: Type.INTEGER,
                        description: 'ID exacto del item analizado',
                      },
                      sentimiento: {
                        type: Type.STRING,
                        enum: ['Positivo', 'Negativo', 'Neutro'],
                      },
                      categoria: {
                        type: Type.STRING,
                        enum: ['Atención', 'Precio', 'Calidad', 'Otro'],
                      },
                    },
                    required: ['id', 'sentimiento', 'categoria'],
                  },
                },
              },
              required: ['classifications'],
            },
          },
        });

        const rawText = response.text?.trim() || '';
        if (!rawText) {
          throw new Error('Respuesta vacía recibida del modelo Gemini');
        }

        const parsed = JSON.parse(rawText);
        const results: ClassifiedReview[] = parsed.classifications || [];
        return results;
      } catch (err: any) {
        if (abortSignal?.aborted || err?.name === 'AbortError') {
          throw err;
        }

        attempt++;
        const isRateLimit =
          err?.status === 429 ||
          err?.message?.includes('429') ||
          err?.message?.includes('RESOURCE_EXHAUSTED') ||
          err?.message?.includes('quota');

        if (attempt >= maxRetries) {
          console.error(`Error en lote tras ${maxRetries} intentos:`, err);
          throw new Error(
            isRateLimit
              ? 'Límite de tasa de la API de Gemini excedido (HTTP 429). Por favor espera un momento o reduce el tamaño de lote.'
              : `Error al procesar lote con Gemini: ${err.message || 'Error desconocido'}`
          );
        }

        // Backoff exponencial para 429 o fallas de red
        const backoffTime = isRateLimit ? delay * 2 : delay;
        console.warn(`Reintento ${attempt}/${maxRetries} en ${backoffTime}ms debido a:`, err.message);
        await new Promise((resolve) => setTimeout(resolve, backoffTime));
        delay *= 1.5;
      }
    }

    return [];
  }
}
