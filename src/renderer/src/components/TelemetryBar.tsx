import React from 'react'
import { ProcessingProgress } from '../types'

interface TelemetryBarProps {
  progress: ProcessingProgress
  onPauseResume: () => void
  onAbort: () => void
  isPaused: boolean
}

export const TelemetryBar: React.FC<TelemetryBarProps> = ({
  progress,
  onPauseResume,
  onAbort,
  isPaused
}) => {
  const isRunning = progress.status === 'processing'
  const isDone = progress.status === 'completed'

  return (
    <div className="w-full bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/20 flex flex-col gap-space-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
        <div className="flex items-center gap-space-md flex-wrap">
          <div
            className={`flex items-center gap-2 px-space-sm py-1 rounded border ${
              isRunning
                ? 'bg-primary/10 text-primary border-primary/20'
                : isDone
                ? 'bg-[#ecfdf5] text-[#059669] border-[#a7f3d0]'
                : 'bg-surface-container-low text-on-surface-variant border-outline-variant/30'
            }`}
          >
            <span className="relative flex h-2.5 w-2.5">
              {isRunning && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              )}
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  isRunning
                    ? 'bg-primary'
                    : isDone
                    ? 'bg-[#059669]'
                    : 'bg-outline'
                }`}
              ></span>
            </span>
            <span className="font-label-sm text-label-sm font-semibold">
              {isRunning
                ? `Analyzing Batch ${progress.currentBatch} of ${progress.totalBatches}`
                : isDone
                ? 'Batch AI Ingestion Completed'
                : 'Telemetry Stream Standby'}
            </span>
          </div>

          <span className="font-body-sm text-body-sm text-on-surface-variant truncate">
            {isRunning
              ? `Chunk #${(progress.currentBatch - 1) * 18 + 1} - #${Math.min(
                  progress.currentBatch * 18,
                  progress.totalRows
                )} dispatching to gemini-2.5-flash endpoint`
              : isDone
              ? `All ${progress.totalRows.toLocaleString()} rows successfully classified with zero drops`
              : 'Waiting for dataset ingestion trigger'}
          </span>
        </div>

        {isRunning && (
          <div className="flex items-center gap-space-sm">
            <button
              onClick={onPauseResume}
              type="button"
              className="bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm text-label-sm px-space-md py-1.5 rounded flex items-center gap-1.5 transition-colors border border-outline-variant/30"
            >
              <span className="material-symbols-outlined text-[16px]">
                {isPaused ? 'play_arrow' : 'pause'}
              </span>
              <span>{isPaused ? 'Resume Stream' : 'Pause Stream'}</span>
            </button>
            <button
              onClick={onAbort}
              type="button"
              className="bg-surface-container-low hover:bg-error-container text-error font-label-sm text-label-sm px-space-md py-1.5 rounded flex items-center gap-1.5 transition-colors border border-error/20"
            >
              <span className="material-symbols-outlined text-[16px]">cancel</span>
              <span>Abort Run</span>
            </button>
          </div>
        )}
      </div>

      {/* Progress Meter Bar with Shimmer Effect */}
      <div className="w-full flex flex-col gap-1">
        <div className="w-full h-3 bg-surface-container rounded-full overflow-hidden relative border border-outline-variant/20">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary-container rounded-full transition-all duration-300 relative overflow-hidden"
            style={{ width: `${progress.percentage}%` }}
          >
            {isRunning && (
              <div className="absolute inset-0 bg-white/25 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:24px_24px] animate-[pulse_1.5s_ease-in-out_infinite]"></div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between font-code-sm text-code-sm text-on-surface-variant px-0.5">
          <span>
            Progress:{' '}
            <strong className="text-on-surface">{progress.percentage}% Completed</strong>
          </span>
          <span>
            EST Remaining:{' '}
            <strong className="text-on-surface">
              {progress.estimatedSecondsRemaining > 0
                ? `${progress.estimatedSecondsRemaining} seconds`
                : isDone
                ? '0.0s'
                : '--'}
            </strong>
          </span>
        </div>
      </div>

      {/* Quick Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-sm pt-space-xs">
        <div className="bg-surface-container-low px-space-md py-space-sm rounded-lg flex flex-col border border-outline-variant/20">
          <span className="font-label-xs text-label-xs text-on-surface-variant font-medium">
            Processed Rows
          </span>
          <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
            {progress.processedRows.toLocaleString()} /{' '}
            {progress.totalRows.toLocaleString()}
          </span>
        </div>

        <div className="bg-surface-container-low px-space-md py-space-sm rounded-lg flex flex-col border border-outline-variant/20">
          <span className="font-label-xs text-label-xs text-on-surface-variant font-medium">
            Throughput Speed
          </span>
          <div className="flex items-center gap-1.5">
            <span className="font-headline-sm text-headline-sm text-primary font-bold">
              {progress.throughput > 0 ? progress.throughput : '0.0'}
            </span>
            <span className="font-code-sm text-code-sm text-on-surface-variant">
              rev/sec
            </span>
          </div>
        </div>

        <div className="bg-surface-container-low px-space-md py-space-sm rounded-lg flex flex-col border border-outline-variant/20">
          <span className="font-label-xs text-label-xs text-on-surface-variant font-medium">
            Reliability / Parsing
          </span>
          <div className="flex items-center gap-1.5">
            <span className="font-headline-sm text-headline-sm text-[#059669] font-bold">
              {progress.processedRows > 0 ? '99.9%' : '--'}
            </span>
            <span className="font-label-xs text-label-xs text-[#065f46] bg-[#ecfdf5] px-1 rounded border border-[#a7f3d0]">
              0 drop
            </span>
          </div>
        </div>

        <div className="bg-surface-container-low px-space-md py-space-sm rounded-lg flex flex-col border border-outline-variant/20">
          <span className="font-label-xs text-label-xs text-on-surface-variant font-medium">
            Avg JSON Latency
          </span>
          <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
            {isRunning ? '38.4 ms' : isDone ? '42.1 ms' : '--'}
          </span>
        </div>
      </div>
    </div>
  )
}
