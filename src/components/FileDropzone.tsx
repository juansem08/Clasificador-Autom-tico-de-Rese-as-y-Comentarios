import React, { useState, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, Check, X, Sparkles } from 'lucide-react';

interface FileDropzoneProps {
  fileName: string | null;
  fileSize: number | null;
  totalRows: number;
  onFileLoaded: (file: File) => void;
  onReset: () => void;
  onLoadSample?: () => void;
  disabled?: boolean;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  fileName,
  fileSize,
  totalRows,
  onFileLoaded,
  onReset,
  onLoadSample,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return '0 KB';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.csv') || file.type.includes('csv') || file.name.endsWith('.txt')) {
        onFileLoaded(file);
      } else {
        alert('Por favor selecciona un archivo con formato .csv');
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileLoaded(e.target.files[0]);
    }
  };

  return (
    <div className="glass-panel rounded-xl p-3.5 border border-slate-800 bg-slate-900/40">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-1.5">
          <span className="flex items-center justify-center w-5 h-5 rounded-md bg-indigo-500/10 text-indigo-400 text-[11px] font-bold border border-indigo-500/20">
            1
          </span>
          <h2 className="text-xs font-semibold text-slate-200">
            Archivo CSV de Entrada
          </h2>
        </div>

        {fileName ? (
          <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center space-x-1">
            <Check className="w-2.5 h-2.5" />
            <span>Listo</span>
          </span>
        ) : onLoadSample ? (
          <button
            type="button"
            onClick={onLoadSample}
            disabled={disabled}
            className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-all active:scale-95 disabled:opacity-50"
            title="Cargar 30 opiniones de prueba en español"
          >
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span>Probar Demo</span>
          </button>
        ) : null}
      </div>

      {/* Zona de Arrastre Compacta */}
      {!fileName ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center min-h-[96px] ${
            isDragging
              ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10'
              : 'border-slate-800 hover:border-indigo-500/50 bg-slate-900/60 hover:bg-slate-900/90'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv,text/plain"
            onChange={handleFileInputChange}
            className="hidden"
            disabled={disabled}
          />
          <UploadCloud className="w-5 h-5 text-indigo-400 mb-1" />
          <p className="text-xs font-medium text-slate-200">
            Arrastra tu CSV aquí o <span className="text-indigo-400 underline underline-offset-2">explorar</span>
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Formatos admitidos: .csv (UTF-8)
          </p>
        </div>
      ) : (
        /* Archivo cargado (Chip compacto) */
        <div className="bg-slate-900/80 rounded-xl p-2.5 border border-slate-700/60 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div className="truncate">
              <p className="font-semibold text-white truncate" title={fileName}>
                {fileName}
              </p>
              <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                <span>{formatFileSize(fileSize)}</span>
                <span>•</span>
                <span className="text-indigo-300 font-medium">{totalRows} registros</span>
              </div>
            </div>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={onReset}
              title="Descartar archivo"
              className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
