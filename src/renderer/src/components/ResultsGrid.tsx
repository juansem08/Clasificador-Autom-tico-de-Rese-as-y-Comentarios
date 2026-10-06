import React, { useState, useMemo } from 'react'
import { ClassificationResult, CsvDatasetInfo, EnrichedRow } from '../types'
import { csvService } from '../services/csvService'

interface ResultsGridProps {
  dataset: CsvDatasetInfo | null
  resultsMap: Map<number, ClassificationResult>
}

export const ResultsGrid: React.FC<ResultsGridProps> = ({ dataset, resultsMap }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [sentimentFilter, setSentimentFilter] = useState<'All' | 'Positivo' | 'Negativo' | 'Neutro'>('All')
  const [categoryFilter, setCategoryFilter] = useState<string>('All')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 8
  const [isExporting, setIsExporting] = useState(false)
  const [copiedRowId, setCopiedRowId] = useState<number | null>(null)

  // Enriquecer datos con resultados actuales
  const enrichedRows: EnrichedRow[] = useMemo(() => {
    if (!dataset || dataset.data.length === 0) return []
    return csvService.enrichDataset(dataset.data, resultsMap)
  }, [dataset, resultsMap])

  // Filtrado reactivo en memoria
  const filteredRows = useMemo(() => {
    return enrichedRows.filter((row) => {
      const reviewText = String(row[dataset?.selectedReviewColumn || ''] || '').toLowerCase()
      const rowIdStr = String(row.__row_id__)
      const sentiment = row.Sentimiento_IA || 'Neutro'
      const category = row.Categoria_IA || 'Otro'

      const matchesSearch =
        searchTerm === '' ||
        reviewText.includes(searchTerm.toLowerCase()) ||
        rowIdStr.includes(searchTerm)

      const matchesSentiment =
        sentimentFilter === 'All' || sentiment === sentimentFilter

      const matchesCategory =
        categoryFilter === 'All' || category === categoryFilter

      return matchesSearch && matchesSentiment && matchesCategory
    })
  }, [enrichedRows, searchTerm, sentimentFilter, categoryFilter, dataset?.selectedReviewColumn])

  // Paginación
  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [filteredRows, currentPage, pageSize])

  // Manejo de exportación CSV con UTF-8 BOM
  const handleDownloadCsv = async () => {
    if (!dataset || dataset.data.length === 0) return
    setIsExporting(true)
    try {
      await csvService.exportAndDownload(dataset.data, resultsMap, dataset.fileName)
    } catch (err: any) {
      alert(`Error al exportar CSV: ${err.message}`)
    } finally {
      setTimeout(() => setIsExporting(false), 1200)
    }
  }

  // Copiar fila JSON
  const handleCopyRow = (row: EnrichedRow) => {
    navigator.clipboard.writeText(JSON.stringify(row, null, 2))
    setCopiedRowId(row.__row_id__)
    setTimeout(() => setCopiedRowId(null), 1500)
  }

  if (!dataset) {
    return null
  }

  const reviewColumn = dataset.selectedReviewColumn || dataset.headers[0] || 'review'

  return (
    <div className="w-full flex flex-col gap-space-lg">
      {/* Enriched Data Spreadsheet Preview Table Section */}
      <div className="w-full bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/20 overflow-hidden flex flex-col">
        {/* Table Filter Toolbar */}
        <div className="p-space-md bg-surface-container-lowest flex flex-col md:flex-row items-stretch md:items-center justify-between gap-space-md border-b border-outline-variant/20">
          <div className="flex flex-wrap items-center gap-space-sm">
            {/* Live Search Input */}
            <div className="relative min-w-[260px]">
              <span className="material-symbols-outlined absolute left-space-sm top-2 text-on-surface-variant text-[18px]">
                search
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                placeholder="Search feedback text, ID, or keywords..."
                className="w-full bg-surface-container-low font-body-sm text-body-sm text-on-surface pl-8 pr-12 py-1.5 rounded-lg outline-none focus:ring-1 focus:ring-primary border border-outline-variant/30"
              />
              <span className="absolute right-2 top-2 font-code-sm text-code-sm text-on-surface-variant bg-surface-container px-1 rounded text-[10px]">
                ⌘K
              </span>
            </div>

            {/* Sentiment Filter Chips */}
            <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-lg border border-outline-variant/20">
              <button
                type="button"
                onClick={() => {
                  setSentimentFilter('All')
                  setCurrentPage(1)
                }}
                className={`font-label-xs text-label-xs px-space-sm py-1 rounded transition-colors ${
                  sentimentFilter === 'All'
                    ? 'bg-surface-container-lowest text-on-surface font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                All ({enrichedRows.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setSentimentFilter('Positivo')
                  setCurrentPage(1)
                }}
                className={`font-label-xs text-label-xs px-space-sm py-1 rounded transition-colors ${
                  sentimentFilter === 'Positivo'
                    ? 'bg-surface-container-lowest text-[#065f46] font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Positive (
                {enrichedRows.filter((r) => r.Sentimiento_IA === 'Positivo').length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setSentimentFilter('Negativo')
                  setCurrentPage(1)
                }}
                className={`font-label-xs text-label-xs px-space-sm py-1 rounded transition-colors ${
                  sentimentFilter === 'Negativo'
                    ? 'bg-surface-container-lowest text-[#991b1b] font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Negative (
                {enrichedRows.filter((r) => r.Sentimiento_IA === 'Negativo').length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setSentimentFilter('Neutro')
                  setCurrentPage(1)
                }}
                className={`font-label-xs text-label-xs px-space-sm py-1 rounded transition-colors ${
                  sentimentFilter === 'Neutro'
                    ? 'bg-surface-container-lowest text-[#92400e] font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Neutral (
                {enrichedRows.filter((r) => r.Sentimiento_IA === 'Neutro').length})
              </button>
            </div>
          </div>

          <div className="flex items-center gap-space-sm shrink-0">
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="bg-surface-container-low font-label-xs text-label-xs text-on-surface font-medium pl-3 pr-8 py-1.5 rounded-lg outline-none cursor-pointer appearance-none border border-outline-variant/30"
              >
                <option value="All">All Categories (4 active)</option>
                <option value="Atención">Atención / Support</option>
                <option value="Precio">Precio / Pricing</option>
                <option value="Calidad">Calidad / Quality</option>
                <option value="Otro">Otro / General</option>
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1.5 text-on-surface-variant pointer-events-none text-[16px]">
                arrow_drop_down
              </span>
            </div>
          </div>
        </div>

        {/* High-Density Desktop Data Grid */}
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left font-body-sm text-body-sm text-on-surface border-collapse">
            <thead className="bg-surface-container-low text-on-surface-variant font-label-xs text-label-xs uppercase tracking-wider select-none border-b border-outline-variant/30">
              <tr>
                <th scope="col" className="py-2.5 px-space-md w-24">
                  Row ID
                </th>
                <th scope="col" className="py-2.5 px-space-md min-w-[340px]">
                  Original Customer Feedback ({reviewColumn})
                </th>
                <th scope="col" className="py-2.5 px-space-md w-32">
                  AI Sentiment
                </th>
                <th scope="col" className="py-2.5 px-space-md w-36">
                  AI Taxonomy
                </th>
                <th scope="col" className="py-2.5 px-space-md min-w-[280px]">
                  Gemini 2.5 Explanation Snippet
                </th>
                <th scope="col" className="py-2.5 px-space-md w-28 text-right">
                  Confidence
                </th>
                <th scope="col" className="py-2.5 px-space-md w-20 text-center">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {paginatedRows.length > 0 ? (
                paginatedRows.map((row) => {
                  const hasClassification = resultsMap.has(row.__row_id__)
                  const sentiment = row.Sentimiento_IA
                  const category = row.Categoria_IA
                  const feedbackText = String(row[reviewColumn] || '(Texto vacío)')

                  return (
                    <tr
                      key={row.__row_id__}
                      className="hover:bg-surface-container-low/70 transition-colors"
                    >
                      <td className="py-space-sm px-space-md font-code-sm text-code-sm text-on-surface-variant font-medium">
                        USR-{String(row.__row_id__).padStart(4, '0')}
                      </td>
                      <td className="py-space-sm px-space-md">
                        <p className="text-on-surface leading-snug line-clamp-2">
                          &quot;{feedbackText}&quot;
                        </p>
                      </td>
                      <td className="py-space-sm px-space-md">
                        {hasClassification ? (
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold border ${
                              sentiment === 'Positivo'
                                ? 'bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0]'
                                : sentiment === 'Negativo'
                                ? 'bg-[#fef2f2] text-[#991b1b] border-[#fecaca]'
                                : 'bg-[#fffbeb] text-[#92400e] border-[#fde68a]'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                sentiment === 'Positivo'
                                  ? 'bg-[#10b981]'
                                  : sentiment === 'Negativo'
                                  ? 'bg-[#ef4444]'
                                  : 'bg-[#f59e0b]'
                              }`}
                            ></span>
                            {sentiment}
                          </span>
                        ) : (
                          <span className="font-code-sm text-[11px] text-on-surface-variant bg-surface-container px-2 py-0.5 rounded">
                            Pendiente
                          </span>
                        )}
                      </td>
                      <td className="py-space-sm px-space-md">
                        {hasClassification ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                              category === 'Atención'
                                ? 'bg-primary/10 text-primary'
                                : category === 'Precio'
                                ? 'bg-tertiary/10 text-tertiary'
                                : category === 'Calidad'
                                ? 'bg-[#10b981]/10 text-[#065f46]'
                                : 'bg-[#f59e0b]/10 text-[#92400e]'
                            }`}
                          >
                            {category}
                          </span>
                        ) : (
                          <span className="font-code-sm text-[11px] text-outline">--</span>
                        )}
                      </td>
                      <td className="py-space-sm px-space-md text-on-surface-variant text-[13px] leading-snug">
                        {row.IA_Explicacion ||
                          (hasClassification
                            ? 'Clasificación estructurada inferida con gemini-2.5-flash.'
                            : 'Pendiente de procesamiento por lote.')}
                      </td>
                      <td className="py-space-sm px-space-md text-right font-code-sm text-code-sm">
                        {hasClassification ? (
                          <span className="text-[#065f46] font-semibold">
                            {((row.IA_Confianza || 0.95) * 100).toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-outline">--</span>
                        )}
                      </td>
                      <td className="py-space-sm px-space-md text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleCopyRow(row)}
                            className="text-on-surface-variant hover:text-primary transition-colors p-1"
                            title="Copiar Fila JSON"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              {copiedRowId === row.__row_id__ ? 'check' : 'content_copy'}
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="py-8 text-center text-on-surface-variant font-body-sm"
                  >
                    No se encontraron filas que coincidan con los filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination / Footer for Data Grid */}
        <div className="p-space-md bg-surface-container-low flex items-center justify-between font-label-xs text-label-xs text-on-surface-variant border-t border-outline-variant/20">
          <span>
            Showing{' '}
            <strong>
              {filteredRows.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} -{' '}
              {Math.min(currentPage * pageSize, filteredRows.length)}
            </strong>{' '}
            of <strong>{filteredRows.length.toLocaleString()}</strong> rows
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1 rounded bg-surface-container-lowest text-on-surface shadow-sm disabled:opacity-40 border border-outline-variant/30 cursor-pointer disabled:cursor-not-allowed"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <span className="px-space-sm font-code-sm text-code-sm text-on-surface font-semibold">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1 rounded bg-surface-container-lowest text-on-surface shadow-sm hover:bg-surface-container disabled:opacity-40 border border-outline-variant/30 cursor-pointer disabled:cursor-not-allowed"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* Persistent Sticky Export & Enterprise Integration Drawer */}
      <div className="sticky bottom-space-md z-40 bg-surface-container-lowest/95 backdrop-blur-md p-space-md rounded-xl shadow-lg border border-outline-variant/30 flex flex-col lg:flex-row items-center justify-between gap-space-md">
        {/* Classification State Indicator */}
        <div className="flex items-center gap-space-sm">
          <div className="w-8 h-8 rounded-full bg-[#ecfdf5] text-[#059669] flex items-center justify-center shrink-0 border border-[#a7f3d0]">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
          </div>
          <div className="flex flex-col">
            <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
              {resultsMap.size.toLocaleString()} of {dataset.totalRows.toLocaleString()}{' '}
              Enriched
            </span>
            <span className="font-code-sm text-code-sm text-on-surface-variant text-[11px]">
              UTF-8 BOM • Compatible con Microsoft Excel, Tableau y PowerBI
            </span>
          </div>
        </div>

        {/* Primary Export Actions */}
        <div className="flex items-center gap-space-sm w-full lg:w-auto justify-end">
          <button
            onClick={() => {
              const fullData = csvService.enrichDataset(dataset.data, resultsMap)
              navigator.clipboard.writeText(JSON.stringify(fullData, null, 2))
              alert('¡Dataset enriquecido copiado al portapapeles en formato JSON!')
            }}
            className="bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md px-space-md py-2 rounded-lg flex items-center gap-1.5 transition-colors border border-outline-variant/30"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">terminal</span>
            <span>Copy Webhook JSON</span>
          </button>

          <button
            onClick={handleDownloadCsv}
            disabled={isExporting}
            id="download-csv-btn"
            className="bg-primary hover:bg-on-primary-fixed-variant text-on-primary font-label-md text-label-md px-space-lg py-2 rounded-lg shadow flex items-center gap-2 transition-all transform active:scale-95 cursor-pointer disabled:opacity-75"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">
              {isExporting ? 'check' : 'download'}
            </span>
            <span className="font-semibold">
              {isExporting
                ? 'Generating UTF-8 BOM...'
                : 'Download Enriched .CSV (UTF-8 BOM)'}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
