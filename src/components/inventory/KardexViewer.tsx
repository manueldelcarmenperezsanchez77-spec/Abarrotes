import React, { useState } from 'react';
import { X, Search, FileText, ArrowDownRight, ArrowUpRight, AlertOctagon, RotateCcw } from 'lucide-react';
import { KardexMovement } from '../../types/database';
import { Language, translations } from '../../i18n/translations';

interface KardexViewerProps {
  kardex: KardexMovement[];
  lang: Language;
  onClose: () => void;
}

export const KardexViewer: React.FC<KardexViewerProps> = ({ kardex, lang, onClose }) => {
  const t = translations[lang];
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredKardex = kardex.filter((mov) => {
    if (filterType !== 'all' && mov.tipo !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        (mov.producto_nombre && mov.producto_nombre.toLowerCase().includes(q)) ||
        mov.referencia_id.toLowerCase().includes(q) ||
        mov.motivo.toLowerCase().includes(q) ||
        (mov.usuario_nombre && mov.usuario_nombre.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const getMovementBadge = (tipo: KardexMovement['tipo']) => {
    switch (tipo) {
      case 'ENTRADA_COMPRA':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded">
            <ArrowDownRight className="w-3.5 h-3.5" /> ENTRADA COMPRA
          </span>
        );
      case 'SALIDA_VENTA':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded">
            <ArrowUpRight className="w-3.5 h-3.5" /> VENTA POS
          </span>
        );
      case 'MERMA_CADUCIDAD':
      case 'MERMA_DANADO':
      case 'MERMA_ROBO':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded">
            <AlertOctagon className="w-3.5 h-3.5" /> MERMA
          </span>
        );
      case 'AJUSTE_INVENTARIO':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded">
            <RotateCcw className="w-3.5 h-3.5" /> AJUSTE FÍSICO
          </span>
        );
      default:
        return (
          <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
            {tipo}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-5 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl text-slate-100 flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">{t.kardexAudit}</h3>
              <p className="text-xs text-slate-400 font-mono">
                Libro Mayor de Movimientos de Inventario (Kardex Relacional FIFO)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters Toolbar */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por producto, folio o motivo..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'ENTRADA_COMPRA', label: 'Entradas' },
              { id: 'SALIDA_VENTA', label: 'Ventas' },
              { id: 'MERMA_DANADO', label: 'Mermas' },
              { id: 'AJUSTE_INVENTARIO', label: 'Ajustes' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterType(f.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                  filterType === f.id
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Kardex Table */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase tracking-wider bg-slate-950/40">
                  <th className="py-2.5 px-3">Fecha & Hora</th>
                  <th className="py-2.5 px-3">Tipo Movimiento</th>
                  <th className="py-2.5 px-3">Producto</th>
                  <th className="py-2.5 px-3 text-right">Cantidad</th>
                  <th className="py-2.5 px-3 text-right">Saldo Ant. → Nuevo</th>
                  <th className="py-2.5 px-3">Referencia / Folio</th>
                  <th className="py-2.5 px-3">Usuario</th>
                  <th className="py-2.5 px-3">Motivo / Auditoría</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredKardex.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-slate-400 whitespace-nowrap text-[11px]">
                      {row.timestamp}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {getMovementBadge(row.tipo)}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-200 whitespace-nowrap max-w-[200px] truncate">
                      {row.producto_nombre || row.producto_id}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-right tabular-nums whitespace-nowrap">
                      {row.tipo.startsWith('ENTRADA') ? '+' : '-'}
                      {row.cantidad}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-right tabular-nums whitespace-nowrap text-slate-300">
                      <span className="text-slate-400">{row.stock_anterior}</span>
                      <span className="mx-1.5 text-slate-500">→</span>
                      <span className="font-bold text-white">{row.stock_nuevo}</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-emerald-400 font-semibold whitespace-nowrap text-[11px]">
                      {row.referencia_id}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap text-[11px]">
                      {row.usuario_nombre || row.usuario_id}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 text-[11px] max-w-[220px] truncate">
                      {row.motivo}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredKardex.length === 0 && (
            <div className="py-12 text-center text-slate-500 text-xs">
              No hay movimientos registrados que coincidan con el filtro.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 bg-slate-900">
          <span>
            Total registros auditados: <strong className="text-white font-mono">{filteredKardex.length}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 font-medium"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
