import React, { useState } from 'react'
import { geminiService } from '../services/geminiService'

interface ApiKeyModalProps {
  isOpen: boolean
  onClose: () => void
  currentApiKey: string
  onSaveApiKey: (newKey: string) => void
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  currentApiKey,
  onSaveApiKey
}) => {
  const [inputKey, setInputKey] = useState(currentApiKey)
  const [isValidating, setIsValidating] = useState(false)
  const [testResult, setTestResult] = useState<{
    success?: boolean
    message?: string
  } | null>(null)

  if (!isOpen) return null

  const handleTestConnection = async () => {
    if (!inputKey.trim()) {
      setTestResult({ success: false, message: 'Ingresa una clave antes de probar.' })
      return
    }

    setIsValidating(true)
    setTestResult(null)

    try {
      const isValid = await geminiService.validateApiKey(inputKey.trim())
      if (isValid) {
        setTestResult({
          success: true,
          message: '¡Conexión exitosa con el modelo gemini-2.5-flash!'
        })
      } else {
        setTestResult({
          success: false,
          message: 'No se pudo conectar. Verifica la validez de la API key.'
        })
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Error al conectar: ${err.message}`
      })
    } finally {
      setIsValidating(false)
    }
  }

  const handleSave = () => {
    onSaveApiKey(inputKey.trim())
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/30 max-w-lg w-full p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[24px]">key</span>
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              Configuración de Gemini API
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Ingresa tu clave de API de Google Gemini para habilitar el modelo{' '}
          <strong className="text-on-surface">gemini-2.5-flash</strong> con Structured Output
          JSON Schema. Tu clave se almacena de forma segura en tu cliente local.
        </p>

        <div className="flex flex-col gap-1.5">
          <label className="font-label-sm text-label-sm text-on-surface font-medium">
            Google Gemini API Key
          </label>
          <input
            type="password"
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            placeholder="AIzaSy..."
            className="w-full bg-surface-container-low font-code-sm text-code-sm text-on-surface px-3 py-2 rounded-lg border border-outline-variant/40 focus:border-primary outline-none transition-colors"
          />
        </div>

        {testResult && (
          <div
            className={`p-3 rounded-lg text-body-sm flex items-center gap-2 border ${
              testResult.success
                ? 'bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0]'
                : 'bg-[#fef2f2] text-[#991b1b] border-[#fecaca]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {testResult.success ? 'check_circle' : 'error'}
            </span>
            <span>{testResult.message}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isValidating}
            className="bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm text-label-sm px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors border border-outline-variant/30 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">
              {isValidating ? 'sync' : 'network_check'}
            </span>
            <span>{isValidating ? 'Probando...' : 'Probar Conexión'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-on-surface-variant hover:text-on-surface font-label-sm text-label-sm px-3 py-2 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="bg-primary hover:bg-on-primary-fixed-variant text-on-primary font-label-sm text-label-sm px-4 py-2 rounded-lg shadow font-medium transition-colors"
            >
              Guardar Clave
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
