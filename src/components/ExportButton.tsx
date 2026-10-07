import React from 'react';
import { Download } from 'lucide-react';
import type { ReviewRow } from '../types';
import { exportToCsv } from '../utils/csvExporter';

interface ExportButtonProps {
  rows: ReviewRow[];
  originalFilename: string;
  disabled?: boolean;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  rows,
  originalFilename,
  disabled = false,
}) => {
  const classifiedCount = rows.filter((r) => r.Sentimiento_IA).length;
  const canExport = !disabled && classifiedCount > 0;

  const handleExport = () => {
    if (!canExport) return;
    exportToCsv(rows, originalFilename || 'reviews_clasificadas.csv');
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={!canExport}
      className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all duration-200 shadow-md ${
        canExport
          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25 active:scale-98 ring-1 ring-white/20'
          : 'bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed'
      }`}
      title={
        canExport
          ? `Exportar ${classifiedCount} reseñas enriquecidas a CSV compatible con Excel`
          : 'Clasifica al menos una reseña para habilitar la descarga'
      }
    >
      <Download className="w-4 h-4" />
      <span>Exportar CSV Enriquecido</span>
      {canExport && (
        <span className="ml-1 text-[10px] bg-emerald-700/80 px-1.5 py-0.5 rounded-full font-mono">
          {classifiedCount}
        </span>
      )}
    </button>
  );
};
