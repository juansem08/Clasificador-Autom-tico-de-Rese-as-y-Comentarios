import { GoogleGenAI, Type } from '@google/genai'
import { ClassificationResult, ReviewItem, Sentiment, Category } from '../types'

/**
 * Servicio de IA para clasificar comentarios de clientes usando el SDK oficial @google/genai
 * y el modelo gemini-2.5-flash con Structured Outputs garantizado por JSON Schema.
 */
export class GeminiService {
  private client: GoogleGenAI | null = null
  private currentApiKey: string = ''

  constructor(apiKey?: string) {
    if (apiKey) {
      this.initClient(apiKey)
    }
  }

  public initClient(apiKey: string): void {
    const trimmed = apiKey.trim()
    if (!trimmed) {
      throw new Error('La API Key de Gemini no puede estar vacía.')
    }
    this.currentApiKey = trimmed
    this.client = new GoogleGenAI({ apiKey: trimmed })
  }

  public hasClient(): boolean {
    return this.client !== null && this.currentApiKey.length > 0
  }

  /**
   * Valida la API key realizando una prueba ultraligera con gemini-2.5-flash
   */
  public async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const testClient = new GoogleGenAI({ apiKey: apiKey.trim() })
      const res = await testClient.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'ping',
        config: {
          maxOutputTokens: 5
        }
      })
      return !!res.text
    } catch (error) {
      console.error('Error al validar Gemini API Key:', error)
      return false
    }
  }

  /**
   * Clasifica un lote (batch) de comentarios de clientes forzando salida estructurada en JSON.
   * Garantiza las propiedades 'id', 'sentimiento' y 'categoria'.
   */
  public async classifyBatch(
    items: ReviewItem[],
    options?: { apiKey?: string; includeRationale?: boolean }
  ): Promise<ClassificationResult[]> {
    const activeApiKey = options?.apiKey || this.currentApiKey

    if (!activeApiKey) {
      throw new Error(
        'Falta la Gemini API Key. Por favor configúrala en la barra superior o en ajustes.'
      )
    }

    if (!this.client || this.currentApiKey !== activeApiKey) {
      this.initClient(activeApiKey)
    }

    if (!items || items.length === 0) {
      return []
    }

    const promptInstructions = `Eres un auditor senior experto en Customer Experience y clasificación de reseñas para ReviewClassifier AI.
Analiza cada uno de los siguientes comentarios de clientes y clasifícalo objetivamente:
- 'sentimiento': Debe ser estrictamente uno de: "Positivo", "Negativo" o "Neutro".
- 'categoria': Debe ser estrictamente una de: "Atención" (soporte, trato del personal, tiempos de respuesta), "Precio" (tarifas, cobros, cargos ocultos, promociones, reembolsos), "Calidad" (estabilidad, fallos, características, confiabilidad, cumplimiento de promesas) u "Otro" (temas no englobados en los anteriores).

Comentarios a clasificar (formato JSON):
${JSON.stringify(items, null, 2)}`

    try {
      // LLM call forzando Structured JSON Output mediante responseSchema estricto
      const response = await this.client!.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: promptInstructions,
        config: {
          temperature: 0.1, // Baja temperatura para máxima consistencia y fidelidad
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            description: 'Lista clasificada de comentarios analizados',
            items: {
              type: Type.OBJECT,
              properties: {
                id: {
                  type: Type.INTEGER,
                  description: 'ID exacto correspondiente al comentario evaluado'
                },
                sentimiento: {
                  type: Type.STRING,
                  enum: ['Positivo', 'Negativo', 'Neutro'],
                  description: 'Sentimiento del cliente: Positivo, Negativo o Neutro'
                },
                categoria: {
                  type: Type.STRING,
                  enum: ['Atención', 'Precio', 'Calidad', 'Otro'],
                  description: 'Categoría de clasificación: Atención, Precio, Calidad u Otro'
                },
                confidence: {
                  type: Type.NUMBER,
                  description: 'Nivel de certeza de la clasificación entre 0.0 y 1.0'
                },
                explanation: {
                  type: Type.STRING,
                  description: 'Breve justificación de 1 frase para la clasificación'
                }
              },
              required: ['id', 'sentimiento', 'categoria']
            }
          }
        }
      })

      const rawText = response.text || ''
      if (!rawText.trim()) {
        throw new Error('La respuesta de Gemini vino vacía.')
      }

      // Limpieza preventiva en caso de que venga con bloques markdown ```json ```
      const cleanedJson = rawText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim()

      const parsed: any[] = JSON.parse(cleanedJson)

      if (!Array.isArray(parsed)) {
        throw new Error('El formato devuelto por Gemini no es un arreglo JSON válido.')
      }

      // Validar y mapear resultados garantizando tipos y valores válidos
      const validSentiments: Sentiment[] = ['Positivo', 'Negativo', 'Neutro']
      const validCategories: Category[] = ['Atención', 'Precio', 'Calidad', 'Otro']

      const results: ClassificationResult[] = parsed.map((item) => {
        const id = Number(item.id)
        const rawSentiment = String(item.sentimiento || '').trim()
        const rawCategory = String(item.categoria || '').trim()

        const sentimiento: Sentiment = validSentiments.includes(rawSentiment as Sentiment)
          ? (rawSentiment as Sentiment)
          : 'Neutro'

        const categoria: Category = validCategories.includes(rawCategory as Category)
          ? (rawCategory as Category)
          : 'Otro'

        const confidence = typeof item.confidence === 'number'
          ? Math.min(1.0, Math.max(0.0, item.confidence))
          : 0.95

        return {
          id,
          sentimiento,
          categoria,
          confidence,
          explanation: item.explanation || undefined
        }
      })

      return results
    } catch (error: any) {
      console.error('Error en GeminiService.classifyBatch:', error)
      throw new Error(`Fallo en la inferencia con gemini-2.5-flash: ${error.message || error}`)
    }
  }
}

export const geminiService = new GeminiService()
