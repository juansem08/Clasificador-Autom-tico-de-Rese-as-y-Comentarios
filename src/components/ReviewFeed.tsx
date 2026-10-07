import React, { useState, useMemo } from 'react';
import { Search, MessageSquare, ChevronLeft, ChevronRight, Sparkles, Inbox } from 'lucide-react';
import type { ReviewRow, Sentiment, Category } from '../types';

interface ReviewFeedProps {
  rows: ReviewRow[];
  selectedColumn: string;
  exportButtonNode?: React.ReactNode;
  onLoadSample?: () => void;
}

export const ReviewFeed: React.FC<ReviewFeedProps> = ({
  rows,
  selectedColumn,
  exportButtonNode,
  onLoadSample,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filtrado reactivo
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const text = String(row[selectedColumn] || '').toLowerCase();
      const matchesSearch = text.includes(searchTerm.toLowerCase());

      const matchesSentiment =
        sentimentFilter === 'ALL' ||
        (sentimentFilter === 'PENDING' && !row.Sentimiento_IA) ||
        row.Sentimiento_IA === sentimentFilter;

      const matchesCategory =
        categoryFilter === 'ALL' ||
        (categoryFilter === 'PENDING' && !row.Categoria_IA) ||
        row.Categoria_IA === categoryFilter;

      return matchesSearch && matchesSentiment && matchesCategory;
    });
  }, [rows, selectedColumn, searchTerm, sentimentFilter, categoryFilter]);

  // Paginación
  const totalPages = Math.ceil(filteredRows.length / itemsPerPage) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRows.slice(start, start + itemsPerPage);
  }, [filteredRows, currentPage, itemsPerPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const getSentimentBadge = (sentiment?: Sentiment) => {
    switch (sentiment) {
      case 'Positivo':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
            🟢 Positivo
          </span>
        );
      case 'Negativo':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
            🔴 Negativo
          </span>
        );
      case 'Neutro':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
            🟡 Neutro
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700/50 shrink-0">
            ⏳ Pendiente
          </span>
        );
    }
  };

  const getCategoryBadge = (category?: Category) => {
    switch (category) {
      case 'Atención':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0">
            🏷️ Atención
          </span>
        );
      case 'Precio':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
            🏷️ Precio
          </span>
        );
      case 'Calidad':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
            🏷️ Calidad
          </span>
        );
      case 'Otro':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700/60 shrink-0">
            🏷️ Otro
          </span>
        );
      default:
        return (
          <span className="text-[11px] text-slate-500 italic shrink-0">
            Sin categorizar
          </span>
        );
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-4 border border-slate-800 flex flex-col h-full min-h-0">
      
      {/* Desktop Toolbar Superior */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-3 border-b border-slate-800/80 shrink-0">
        
        {/* Título y Conteos */}
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white tracking-wide uppercase">
              Tabla de Reseñas Enriquecidas
            </h3>
            <p className="text-[11px] text-slate-400">
              {rows.length > 0
                ? `${filteredRows.length} de ${rows.length} registros visibles`
                : 'Esperando datos para visualizar'}
            </p>
          </div>
        </div>

        {/* Buscador, Filtros y Botón Exportar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Input Buscador */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Buscar opinión..."
              disabled={rows.length === 0}
              className="text-xs bg-slate-900/90 text-slate-200 pl-8 pr-3 py-1.5 rounded-lg border border-slate-700/80 focus:border-indigo-500 outline-none w-36 sm:w-48 disabled:opacity-50"
            />
          </div>

          {/* Filtro Sentimiento */}
          <select
            value={sentimentFilter}
            onChange={(e) => {
              setSentimentFilter(e.target.value);
              setCurrentPage(1);
            }}
            disabled={rows.length === 0}
            className="text-xs bg-slate-900/90 text-slate-200 px-2 py-1.5 rounded-lg border border-slate-700/80 focus:border-indigo-500 outline-none disabled:opacity-50"
          >
            <option value="ALL">Sentimientos: Todos</option>
            <option value="Positivo">Positivo</option>
            <option value="Negativo">Negativo</option>
            <option value="Neutro">Neutro</option>
            <option value="PENDING">Pendientes</option>
          </select>

          {/* Filtro Categoría */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            disabled={rows.length === 0}
            className="text-xs bg-slate-900/90 text-slate-200 px-2 py-1.5 rounded-lg border border-slate-700/80 focus:border-indigo-500 outline-none disabled:opacity-50"
          >
            <option value="ALL">Categorías: Todas</option>
            <option value="Atención">Atención</option>
            <option value="Precio">Precio</option>
            <option value="Calidad">Calidad</option>
            <option value="Otro">Otro</option>
            <option value="PENDING">Sin Categoría</option>
          </select>

          {/* Botón de Exportar integrado en la barra de herramientas */}
          {exportButtonNode}
        </div>
      </div>

      {/* Área Central: Feed con Scroll Interno Dedicado */}
      <div className="flex-1 min-h-0 overflow-y-auto my-3 pr-1.5 space-y-2">
        {rows.length === 0 ? (
          /* Estado Vacío de Escritorio */
          <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-800 rounded-xl bg-slate-900/20">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3">
              <Inbox className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-200 mb-1">
              No hay opiniones cargadas en la mesa de trabajo
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mb-4">
              Carga tu archivo CSV en el panel izquierdo o inicia una prueba instantánea con el dataset de demostración.
            </p>
            {onLoadSample && (
              <button
                type="button"
                onClick={onLoadSample}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Cargar Demo de 30 Reseñas</span>
              </button>
            )}
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 text-xs">
            No se encontraron opiniones que coincidan con la búsqueda o filtros aplicados.
          </div>
        ) : (
          paginatedRows.map((row) => (
            <div
              key={row._id}
              className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              {/* ID e información de texto */}
              <div className="flex items-start space-x-2.5 overflow-hidden flex-1">
                <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700/50 shrink-0">
                  #{String(row._id + 1).padStart(3, '0')}
                </span>
                <p className="text-slate-200 font-normal leading-relaxed line-clamp-2" title={String(row[selectedColumn] || '')}>
                  "{row[selectedColumn]}"
                </p>
              </div>

              {/* Badges de Sentimiento y Categoría */}
              <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
                {getSentimentBadge(row.Sentimiento_IA)}
                {getCategoryBadge(row.Categoria_IA)}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Barra Inferior de Paginación */}
      {rows.length > 0 && (
        <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center space-x-3">
            <span>
              Página {currentPage} de {totalPages} ({filteredRows.length} registros)
            </span>
            <div className="flex items-center space-x-1 text-[11px]">
              <span>Mostrar:</span>
              {[10, 25, 50].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => {
                    setItemsPerPage(count);
                    setCurrentPage(1);
                  }}
                  className={`px-1.5 py-0.5 rounded ${
                    itemsPerPage === count
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-400'
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-800"
              title="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-800"
              title="Página siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
