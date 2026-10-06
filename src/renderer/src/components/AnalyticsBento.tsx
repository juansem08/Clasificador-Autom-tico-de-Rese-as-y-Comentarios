import React from 'react'
import { AnalyticsMetrics } from '../types'

interface AnalyticsBentoProps {
  metrics: AnalyticsMetrics
}

export const AnalyticsBento: React.FC<AnalyticsBentoProps> = ({ metrics }) => {
  const {
    totalProcessed,
    positiveCount,
    negativeCount,
    neutralCount,
    positivePercentage,
    negativePercentage,
    neutralPercentage,
    categoryCounts,
    avgConfidence
  } = metrics

  // Category percentages
  const safeTotal = totalProcessed || 1
  const atencionPct = Math.round(((categoryCounts['Atención'] || 0) / safeTotal) * 100)
  const precioPct = Math.round(((categoryCounts['Precio'] || 0) / safeTotal) * 100)
  const calidadPct = Math.round(((categoryCounts['Calidad'] || 0) / safeTotal) * 100)
  const otroPct = Math.round(((categoryCounts['Otro'] || 0) / safeTotal) * 100)

  const strokeDash = `${Math.min(100, Math.max(0, avgConfidence))}, 100`

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg items-stretch w-full">
      {/* Card 1: Sentiment Polarization Bar */}
      <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm border border-outline-variant/20 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-space-sm">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-[#059669] text-[20px]">
                pie_chart
              </span>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">
                Sentiment Distribution
              </h3>
            </div>
            <span className="font-code-sm text-code-sm text-on-surface-variant font-medium">
              n={totalProcessed.toLocaleString()}
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
            Realtime sentiment breakdown with multi-lingual normalization.
          </p>

          {/* Distribution Stacked Bar */}
          <div className="w-full h-4 bg-surface-container rounded-full overflow-hidden flex mb-space-md border border-outline-variant/20">
            <div
              className="bg-[#10b981] h-full transition-all duration-300"
              style={{ width: `${positivePercentage}%` }}
              title={`Positivo: ${positivePercentage}%`}
            ></div>
            <div
              className="bg-[#f59e0b] h-full transition-all duration-300"
              style={{ width: `${neutralPercentage}%` }}
              title={`Neutro: ${neutralPercentage}%`}
            ></div>
            <div
              className="bg-[#ef4444] h-full transition-all duration-300"
              style={{ width: `${negativePercentage}%` }}
              title={`Negativo: ${negativePercentage}%`}
            ></div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-body-sm font-body-sm">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></span>
                <span className="text-on-surface font-medium">Positive</span>
              </div>
              <div className="flex items-center gap-space-sm">
                <span className="font-code-sm text-code-sm text-on-surface-variant">
                  {positiveCount.toLocaleString()} reviews
                </span>
                <span className="font-label-sm text-label-sm text-[#065f46] font-bold">
                  {positivePercentage}%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-body-sm font-body-sm">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></span>
                <span className="text-on-surface font-medium">Neutral / Mixed</span>
              </div>
              <div className="flex items-center gap-space-sm">
                <span className="font-code-sm text-code-sm text-on-surface-variant">
                  {neutralCount.toLocaleString()} reviews
                </span>
                <span className="font-label-sm text-label-sm text-[#92400e] font-bold">
                  {neutralPercentage}%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-body-sm font-body-sm">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]"></span>
                <span className="text-on-surface font-medium">Negative / Detractor</span>
              </div>
              <div className="flex items-center gap-space-sm">
                <span className="font-code-sm text-code-sm text-on-surface-variant">
                  {negativeCount.toLocaleString()} reviews
                </span>
                <span className="font-label-sm text-label-sm text-[#991b1b] font-bold">
                  {negativePercentage}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card 2: Top Friction Vector Categories */}
      <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm border border-outline-variant/20 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-space-sm">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-primary text-[20px]">
                category
              </span>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">
                Taxonomy Breakdown
              </h3>
            </div>
            <span className="font-code-sm text-code-sm text-on-surface-variant font-medium">
              4 vectors
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
            Classification distributed across primary operational business vectors.
          </p>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-body-sm font-body-sm">
                <span className="text-on-surface font-medium">Atención / Support</span>
                <span className="font-code-sm text-code-sm text-on-surface font-bold">
                  {atencionPct}% ({categoryCounts['Atención'] || 0})
                </span>
              </div>
              <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-300"
                  style={{ width: `${atencionPct}%` }}
                ></div>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-body-sm font-body-sm">
                <span className="text-on-surface font-medium">Precio / Pricing</span>
                <span className="font-code-sm text-code-sm text-on-surface font-bold">
                  {precioPct}% ({categoryCounts['Precio'] || 0})
                </span>
              </div>
              <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                <div
                  className="bg-tertiary h-full rounded-full transition-all duration-300"
                  style={{ width: `${precioPct}%` }}
                ></div>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-body-sm font-body-sm">
                <span className="text-on-surface font-medium">Calidad / Quality</span>
                <span className="font-code-sm text-code-sm text-on-surface font-bold">
                  {calidadPct}% ({categoryCounts['Calidad'] || 0})
                </span>
              </div>
              <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                <div
                  className="bg-[#10b981] h-full rounded-full transition-all duration-300"
                  style={{ width: `${calidadPct}%` }}
                ></div>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-body-sm font-body-sm">
                <span className="text-on-surface font-medium">Otro / General</span>
                <span className="font-code-sm text-code-sm text-on-surface font-bold">
                  {otroPct}% ({categoryCounts['Otro'] || 0})
                </span>
              </div>
              <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                <div
                  className="bg-[#f59e0b] h-full rounded-full transition-all duration-300"
                  style={{ width: `${otroPct}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card 3: AI Confidence Gauge & Precision Metrics */}
      <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm border border-outline-variant/20 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-space-sm">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-[#059669] text-[20px]">
                verified
              </span>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">
                Model Confidence Metric
              </h3>
            </div>
            <span className="font-label-xs text-label-xs bg-[#ecfdf5] text-[#065f46] px-1.5 py-0.5 rounded font-bold border border-[#a7f3d0]">
              High Precision
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
            Weighted mean confidence score across Gemini 2.5 Flash batch inference.
          </p>

          <div className="flex items-center justify-between py-space-sm">
            <div className="flex flex-col">
              <span className="font-display-lg text-display-lg text-on-surface font-bold tracking-tight">
                {avgConfidence > 0 ? `${avgConfidence}%` : '--'}
              </span>
              <span className="font-label-xs text-label-xs text-[#065f46] font-medium flex items-center gap-1 mt-0.5">
                <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                <span>Optimized Structured Ingestion</span>
              </span>
            </div>

            {/* Radial Inline SVG Graphic */}
            <div className="relative w-20 h-20 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-surface-container"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                ></path>
                <path
                  className="text-primary transition-all duration-500"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeDasharray={strokeDash}
                  strokeLinecap="round"
                  strokeWidth="3.5"
                ></path>
              </svg>
              <span className="material-symbols-outlined absolute text-primary text-[22px]">
                auto_awesome
              </span>
            </div>
          </div>
        </div>

        <div className="pt-space-sm bg-surface-container-low p-space-sm rounded-lg flex items-center justify-between border border-outline-variant/20">
          <span className="font-label-xs text-label-xs text-on-surface-variant">
            Low Confidence Threshold: &lt; 0.85
          </span>
          <span className="font-code-sm text-code-sm text-on-surface font-bold">
            0 rows flagged
          </span>
        </div>
      </div>
    </div>
  )
}
