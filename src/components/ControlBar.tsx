import React from 'react';
import { Square, RotateCcw, Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import type { BatchProgress, ProcessingState } from '../types';

interface ControlBarProps {
  status: ProcessingState;
  progress: BatchProgress;
  canStart: boolean;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  error?: string | null;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  status,
  progress,
  canStart,
  onStart,
  onStop,
  onReset,
  error,
}) => {
  const isRunning = status === 'running';
  const percent = progress.totalRows > 0 ? Math.round((progress.processedRows / progress.totalRows) * 100) : 0;

  return (
    <div className="glass-panel rounded-xl p-3.5 border border-slate-800 bg-slate-900/40">
      
      {/* Botones Principales */}
      <div className="flex items-center space-x-2">
        {!isRunning ? (
          <button
            type="button"
            onClick={onStart}
            disabled={!canStart}
            className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl font-semibold text-xs tracking-wide shadow-md transition-all duration-200 ${
              canStart
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-indigo-600/30 active:scale-98 ring-1 ring-white/20'
                : 'bg-slate-800/80 text-slate-500 border border-slate-700/50 cursor-not-allowed'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Iniciar Clasificación con IA</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onStop}
            className="flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl font-semibold text-xs tracking-wide bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/25 active:scale-98 transition-all"
          >
            <Square className="w-3.5 h-3.5 fill-white" />
            <span>Detener Proceso</span>
          </button>
        )}

        <button
          type="button"
          onClick={onReset}
          disabled={isRunning || progress.processedRows === 0}
          className="p-2.5 rounded-xl text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          title="Reiniciar clasificaciones"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progreso y Estado */}
      <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-xs">
        <div className="flex items-center justify-between text-[11px] mb-1">
          <div className="flex items-center space-x-1.5 truncate">
            {isRunning && <Loader2 className="w-3 h-3 text-indigo-400 animate-spin shrink-0" />}
            <span className="text-slate-300 font-medium truncate">
              {progress.message || 'Listo para clasificar'}
            </span>
          </div>
          {(isRunning || progress.processedRows > 0) && (
            <span className="font-bold text-indigo-400 shrink-0 ml-2">
              {percent}%
            </span>
          )}
        </div>

        {(isRunning || progress.processedRows > 0) && (
          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800 mt-1">
            <div
              className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all duration-300 shadow-sm shadow-indigo-500/50"
              style={{ width: `${percent}%` }}
            />
          </div>
        )}
      </div>

      {/* Alerta de Error */}
      {error && (
        <div className="mt-2.5 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300 flex items-start space-x-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
          <p className="leading-tight">{error}</p>
        </div>
      )}
    </div>
  );
};
