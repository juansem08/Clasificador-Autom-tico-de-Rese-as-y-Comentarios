import Papa from 'papaparse';
import type { ReviewRow } from '../types';

export function exportToCsv(rows: ReviewRow[], originalFilename: string = 'reviews_clasificadas.csv'): void {
  if (!rows || rows.length === 0) return;

  // Filtrar claves internas como _id, _status, _error
  const sanitizedRows = rows.map((row) => {
    const cleanRow: Record<string, any> = {};
    
    // Primero agregar las columnas originales
    Object.keys(row).forEach((key) => {
      if (!key.startsWith('_') && key !== 'Sentimiento_IA' && key !== 'Categoria_IA') {
        cleanRow[key] = row[key];
      }
    });

    // Añadir columnas de IA al final
    cleanRow['Sentimiento_IA'] = row.Sentimiento_IA || '';
    cleanRow['Categoria_IA'] = row.Categoria_IA || '';

    return cleanRow;
  });

  // Generar CSV con PapaParse
  const csvString = Papa.unparse(sanitizedRows, {
    quotes: true,
    delimiter: ',',
  });

  // Agregar BOM (\uFEFF) para compatibilidad nativa con Microsoft Excel en español
  const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  
  // Nombre de salida descriptivo
  const cleanBaseName = originalFilename.replace(/\.csv$/i, '');
  link.setAttribute('download', `${cleanBaseName}_enriquecido.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
