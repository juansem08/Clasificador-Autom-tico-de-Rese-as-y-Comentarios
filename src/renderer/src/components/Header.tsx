import React from 'react'
import logoSvg from '../assets/logo.svg'

interface HeaderProps {
  apiKey: string
  onOpenApiKeyModal: () => void
  activeTab: string
  setActiveTab: (tab: string) => void
}

export const Header: React.FC<HeaderProps> = ({
  apiKey,
  onOpenApiKeyModal,
  activeTab,
  setActiveTab
}) => {
  const maskedKey = apiKey
    ? apiKey.slice(0, 6) + '••••' + apiKey.slice(-4)
    : 'No configurada'

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface-container-lowest/95 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-outline-variant/30">
      <div className="h-14 w-full px-space-lg flex items-center justify-between gap-space-md">
        {/* Left: Window Controls + Logo + Branding */}
        <div className="flex items-center gap-space-md shrink-0">
          <div className="flex items-center gap-1.5 pr-space-xs">
            <span className="w-3 h-3 rounded-full bg-[#ff5f56] inline-block opacity-85 hover:opacity-100 transition-opacity"></span>
            <span className="w-3 h-3 rounded-full bg-[#ffbd2e] inline-block opacity-85 hover:opacity-100 transition-opacity"></span>
            <span className="w-3 h-3 rounded-full bg-[#27c93f] inline-block opacity-85 hover:opacity-100 transition-opacity"></span>
          </div>

          <div className="h-4 w-px bg-outline-variant/50"></div>

          <div className="flex items-center gap-space-sm cursor-default">
            <img
              src={logoSvg}
              alt="ReviewClassifier AI Logo"
              className="h-8 w-auto object-contain"
            />
            <span className="font-headline-sm text-headline-sm text-on-surface tracking-tight font-semibold">
              ReviewClassifier AI
            </span>
            <span className="font-code-sm text-code-sm px-space-xs py-0.5 rounded bg-surface-container text-on-surface-variant font-medium text-[11px]">
              v2.0 Desktop Suite
            </span>
          </div>
        </div>

        {/* Center: Navigation Tabs */}
        <nav className="hidden lg:flex items-center gap-1 bg-surface-container-low p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('classifier-studio')}
            className={`px-space-md py-1.5 transition-colors font-medium rounded ${
              activeTab === 'classifier-studio'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
            }`}
          >
            Classifier Studio
          </button>
          <button
            onClick={() => setActiveTab('csv-datasets')}
            className={`font-label-sm text-label-sm px-space-md py-1.5 rounded transition-colors ${
              activeTab === 'csv-datasets'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
            }`}
          >
            CSV Datasets
          </button>
          <button
            onClick={() => setActiveTab('sentiment-analytics')}
            className={`font-label-sm text-label-sm px-space-md py-1.5 rounded transition-colors ${
              activeTab === 'sentiment-analytics'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
            }`}
          >
            Sentiment Analytics
          </button>
          <button
            onClick={onOpenApiKeyModal}
            className={`font-label-sm text-label-sm px-space-md py-1.5 rounded transition-colors ${
              activeTab === 'api-settings'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
            }`}
          >
            API Settings
          </button>
        </nav>

        {/* Right: Active Credentials & Gemini Status Badge */}
        <div className="flex items-center gap-space-md shrink-0">
          <div
            onClick={onOpenApiKeyModal}
            className="hidden xl:flex items-center bg-surface-container-low hover:bg-surface-container px-space-sm py-1 rounded gap-space-xs cursor-pointer transition-colors"
            title="Clic para configurar Gemini API Key"
          >
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
              lock
            </span>
            <span className="font-label-xs text-label-xs text-on-surface-variant font-medium">
              Gemini Key:
            </span>
            <span className="font-code-sm text-code-sm text-on-surface font-medium select-none">
              {maskedKey}
            </span>
            <span className="material-symbols-outlined text-[14px] text-primary ml-1">
              edit
            </span>
          </div>

          <div className="flex items-center gap-2 bg-[#ecfdf5] px-space-sm py-1 rounded border border-[#a7f3d0]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#059669]"></span>
            </span>
            <span className="font-label-xs text-label-xs text-[#065f46] font-semibold tracking-wide">
              Ready • Gemini 2.5 Flash
            </span>
          </div>

          <button
            onClick={onOpenApiKeyModal}
            className="w-8 h-8 rounded-full bg-primary hover:bg-on-primary-fixed-variant transition-colors flex items-center justify-center text-on-primary shadow-sm"
            title="Configuración de Cuenta & IA"
          >
            <span className="material-symbols-outlined text-[18px]">person</span>
          </button>
        </div>
      </div>
    </header>
  )
}
