import { contextBridge, ipcRenderer } from 'electron'

export interface ElectronAPI {
  openCsvFileDialog: () => Promise<{
    filePath: string
    fileName: string
    content: string
    sizeBytes: number
  } | null>
  saveCsvFileDialog: (args: {
    defaultName: string
    content: string
  }) => Promise<{ success: boolean; filePath?: string; canceled?: boolean }>
  getPlatform: () => Promise<{
    platform: string
    arch: string
    version: string
  }>
}

const electronAPI: ElectronAPI = {
  openCsvFileDialog: () => ipcRenderer.invoke('dialog:open-csv'),
  saveCsvFileDialog: (args) => ipcRenderer.invoke('dialog:save-csv', args),
  getPlatform: () => ipcRenderer.invoke('app:get-platform')
}

// Expose safe API to the renderer process
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', electronAPI)
  } catch (error) {
    console.error('Failed to expose electronAPI:', error)
  }
} else {
  // @ts-ignore (fallback if contextIsolation is disabled)
  window.electronAPI = electronAPI
}
