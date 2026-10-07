import React from 'react';
import { ThumbsUp, ThumbsDown, Minus, Tag, Activity } from 'lucide-react';
import type { ProcessingMetrics } from '../types';

interface MetricsOverviewProps {
  metrics: ProcessingMetrics;
}

export const MetricsOverview: React.FC<MetricsOverviewProps> = ({ metrics }) => {
  const { processed, positive, negative, neutral, categories } = metrics;
  const processedOrOne = processed > 0 ? processed : 1;

  const pctPositive = Math.round((positive / processedOrOne) * 100);
  const pctNegative = Math.round((negative / processedOrOne) * 100);
  const pctNeutral = Math.round((neutral / processedOrOne) * 100);

  return (
    <div className="glass-panel rounded-xl p-3.5 border border-slate-800 bg-slate-900/40">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-200">
          <Activity className="w-3.5 h-3.5 text-indigo-400" />
          <span>Métricas de Análisis ({processed} clasificadas)</span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">
          {processed > 0 ? `${pctPositive}% pos • ${pctNegative}% neg` : 'Sin datos'}
        </span>
      </div>

      {/* Grid 3 KPIs Sentimiento */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {/* Positivo */}
        <div className="p-2 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-center">
          <div className="flex items-center justify-center space-x-1 text-emerald-400 text-[11px] mb-0.5">
            <ThumbsUp className="w-3 h-3" />
            <span className="font-semibold">Positivo</span>
          </div>
          <div className="flex items-baseline justify-center space-x-1">
            <span className="text-base font-bold text-white">{positive}</span>
            <span className="text-[10px] text-emerald-400/80">({pctPositive}%)</span>
          </div>
          <div className="mt-1 w-full h-1 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${pctPositive}%` }} />
          </div>
        </div>

        {/* Negativo */}
        <div className="p-2 rounded-lg bg-rose-950/20 border border-rose-500/20 text-center">
          <div className="flex items-center justify-center space-x-1 text-rose-400 text-[11px] mb-0.5">
            <ThumbsDown className="w-3 h-3" />
            <span className="font-semibold">Negativo</span>
          </div>
          <div className="flex items-baseline justify-center space-x-1">
            <span className="text-base font-bold text-white">{negative}</span>
            <span className="text-[10px] text-rose-400/80">({pctNegative}%)</span>
          </div>
          <div className="mt-1 w-full h-1 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-rose-500 rounded-full transition-all duration-300" style={{ width: `${pctNegative}%` }} />
          </div>
        </div>

        {/* Neutro */}
        <div className="p-2 rounded-lg bg-amber-950/20 border border-amber-500/20 text-center">
          <div className="flex items-center justify-center space-x-1 text-amber-400 text-[11px] mb-0.5">
            <Minus className="w-3 h-3" />
            <span className="font-semibold">Neutro</span>
          </div>
          <div className="flex items-baseline justify-center space-x-1">
            <span className="text-base font-bold text-white">{neutral}</span>
            <span className="text-[10px] text-amber-400/80">({pctNeutral}%)</span>
          </div>
          <div className="mt-1 w-full h-1 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full transition-all duration-300" style={{ width: `${pctNeutral}%` }} />
          </div>
        </div>
      </div>

      {/* Categorías en chips compactos */}
      <div>
        <div className="flex items-center space-x-1 text-[11px] text-slate-400 mb-1.5">
          <Tag className="w-3 h-3 text-indigo-400" />
          <span>Distribución por Categorías:</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 text-[11px]">
          <div className="flex items-center justify-between px-2 py-1 rounded bg-slate-900/80 border border-slate-800">
            <span className="text-slate-400">Atención:</span>
            <span className="font-bold text-sky-400">{categories['Atención'] || 0}</span>
          </div>
          <div className="flex items-center justify-between px-2 py-1 rounded bg-slate-900/80 border border-slate-800">
            <span className="text-slate-400">Precio:</span>
            <span className="font-bold text-purple-400">{categories['Precio'] || 0}</span>
          </div>
          <div className="flex items-center justify-between px-2 py-1 rounded bg-slate-900/80 border border-slate-800">
            <span className="text-slate-400">Calidad:</span>
            <span className="font-bold text-cyan-400">{categories['Calidad'] || 0}</span>
          </div>
          <div className="flex items-center justify-between px-2 py-1 rounded bg-slate-900/80 border border-slate-800">
            <span className="text-slate-400">Otro:</span>
            <span className="font-bold text-slate-300">{categories['Otro'] || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
