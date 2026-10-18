import React, { useState, useEffect } from 'react';
import { Key, X } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (savedKey: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  // 1. Estado apiKey en el componente para gestionar el valor del input
  const [apiKey, setApiKey] = useState<string>('');

  // 1. useEffect: al montar el componente (y al abrirse), lee si ya existe una llave guardada en localStorage
  useEffect(() => {
    const saved = localStorage.getItem('gemini_api_key');
    if (saved) {
      setApiKey(saved);
    }
  }, []);

  // Sincronizar si cambia el estado de apertura
  useEffect(() => {
    if (isOpen) {
      const savedKey = localStorage.getItem('gemini_api_key') || '';
      setApiKey(savedKey);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 3. Acción de Guardar y Cerrar
  const handleSaveAndClose = () => {
    const trimmedKey = apiKey.trim();
    // Guardar en localStorage
    localStorage.setItem('gemini_api_key', trimmedKey);
    // Actualizar estado padre/global si se proporciona callback
    if (onSave) {
      onSave(trimmedKey);
    }
    // Cerrar el modal
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center">
              <Key className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Gemini API Key</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Introduce tu API Key de Google AI Studio para activar la inferencia de Gemini 2.5 Flash. Se guarda automáticamente en tu navegador.
        </p>
        
        {/* 2. Manejo del Input: conectado a onChange para actualizar apiKey mientras escribe */}
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSaveAndClose();
            }
          }}
          placeholder="AIzaSy..."
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
        />

        <div className="flex justify-end gap-2 pt-2">
          {/* 3. Botón "Guardar y Cerrar" que persiste en localStorage, actualiza estado y cierra */}
          <button
            type="button"
            onClick={handleSaveAndClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            Guardar y Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;
