import React, { useState } from 'react';
import { Sparkles, Key, Eye, EyeOff, CheckCircle2, AlertCircle, ExternalLink, Monitor } from 'lucide-react';

interface HeaderProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ apiKey, onApiKeyChange }) => {
  const [showKey, setShowKey] = useState(false);
  const isKeyConfigured = apiKey.trim().length > 15;

  return (
    <header className="w-full border-b border-slate-800/80 bg-slate-950/95 backdrop-blur-md shrink-0 select-none">
      <div className="w-full px-4 sm:px-6 py-2.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          
          {/* Logo y Título de Escritorio */}
          <div className="flex items-center space-x-3">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/25 ring-1 ring-white/20">
              <Sparkles className="w-4 h-4" />
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-950" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                  ReviewClassifier <span className="text-indigo-400 font-black">AI</span>
                </h1>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                  Gemini 2.5 Flash
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">
                  <Monitor className="w-3 h-3 text-indigo-400" />
                  <span>Desktop App</span>
                </span>
              </div>
            </div>
          </div>

          {/* Configuración de API Key */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex items-center w-full sm:w-auto">
              <div className="absolute left-2.5 text-slate-400 pointer-events-none">
                <Key className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => onApiKeyChange(e.target.value)}
                placeholder="Pega tu Gemini API Key..."
                className="w-full sm:w-64 pl-8 pr-8 py-1.5 text-xs bg-slate-900/90 text-slate-100 placeholder-slate-500 rounded-lg border border-slate-700/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                title={showKey ? 'Ocultar API Key' : 'Mostrar API Key'}
                className="absolute right-2 text-slate-400 hover:text-slate-200 p-0.5 transition-colors"
              >
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Badge de Estado */}
            <div className="flex items-center space-x-1.5">
              {isKeyConfigured ? (
                <div className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Configurada</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-medium animate-pulse">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Pendiente</span>
                </div>
              )}

              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                title="Obtener API Key gratuita en Google AI Studio"
                className="flex items-center space-x-1 px-2 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-indigo-300 border border-slate-800 text-xs transition-colors"
              >
                <span>Obtener Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

          </div>

        </div>
      </div>
    </header>
  );
};
