import React from 'react';
import { Sliders, HelpCircle } from 'lucide-react';

interface ConfigPanelProps {
  columns: string[];
  selectedColumn: string;
  onColumnChange: (col: string) => void;
  batchSize: number;
  onBatchSizeChange: (size: number) => void;
  disabled?: boolean;
  samplePreviewText?: string;
  hasFile: boolean;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
  columns,
  selectedColumn,
  onColumnChange,
  batchSize,
  onBatchSizeChange,
  disabled = false,
  samplePreviewText,
  hasFile,
}) => {
  return (
    <div className="glass-panel rounded-xl p-3.5 border border-slate-800 bg-slate-900/40">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-1.5">
          <span className="flex items-center justify-center w-5 h-5 rounded-md bg-indigo-500/10 text-indigo-400 text-[11px] font-bold border border-indigo-500/20">
            2
          </span>
          <h2 className="text-xs font-semibold text-slate-200">
            Configuración de Análisis
          </h2>
        </div>
        <span className="text-[10px] text-indigo-400 font-semibold">
          {batchSize} reseñas/lote
        </span>
      </div>

      <div className="space-y-2.5 text-xs">
        {/* Desplegable de Columna */}
        <div>
          <label className="block text-[11px] font-medium text-slate-300 mb-1 flex items-center justify-between">
            <span>Columna de opiniones:</span>
            <span className="text-[10px] text-slate-400">
              {columns.length > 0 ? `${columns.length} cols` : 'Esperando CSV'}
            </span>
          </label>
          <div className="relative">
            <select
              value={selectedColumn}
              onChange={(e) => onColumnChange(e.target.value)}
              disabled={disabled || columns.length === 0}
              className="w-full text-xs bg-slate-900/90 text-slate-100 rounded-lg border border-slate-700/80 px-2.5 py-1.5 pr-7 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed appearance-none"
            >
              {columns.length === 0 ? (
                <option value="">(Carga un CSV para ver las columnas)</option>
              ) : (
                columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))
              )}
            </select>
            <div className="absolute right-2.5 top-2 pointer-events-none text-slate-400">
              <Sliders className="w-3 h-3" />
            </div>
          </div>
        </div>

        {/* Tamaño de Lote */}
        <div>
          <div className="flex items-center justify-between text-[11px] text-slate-300 mb-1">
            <span className="flex items-center space-x-1">
              <span>Tamaño de lote:</span>
              <span title="Cantidad de opiniones enviadas por petición a Gemini 2.5 Flash">
                <HelpCircle className="w-2.5 h-2.5 text-slate-400 cursor-help" />
              </span>
            </span>
            <span className="text-[10px] text-slate-400">Lotes por llamada</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {[10, 15, 20].map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => onBatchSizeChange(size)}
                disabled={disabled}
                className={`py-1 px-2 rounded-lg text-xs font-medium transition-all ${
                  batchSize === size
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 border border-indigo-500'
                    : 'bg-slate-900/80 hover:bg-slate-850 text-slate-300 border border-slate-800'
                } disabled:opacity-50`}
              >
                {size} / lote
              </button>
            ))}
          </div>
        </div>

        {/* Vista previa del texto */}
        {hasFile && samplePreviewText && (
          <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 text-[10px] text-slate-400 truncate">
            <span className="text-slate-400 font-medium">Ejemplo: </span>
            <span className="italic text-slate-300">"{samplePreviewText}"</span>
          </div>
        )}
      </div>
    </div>
  );
};
