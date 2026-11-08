import React from 'react';
import { Printer, CheckCircle, X } from 'lucide-react';
import { CashCutRecord } from '../../types/database';
import { Language, translations } from '../../i18n/translations';

interface CutTicketModalProps {
  cut: CashCutRecord;
  lang: Language;
  onClose: () => void;
}

export const CutTicketModal: React.FC<CutTicketModalProps> = ({ cut, lang, onClose }) => {
  const t = translations[lang];

  const handlePrint = () => {
    window.print();
  };

  const isSquare = Math.abs(cut.diferencia) < 0.05;
  const isSurplus = cut.diferencia > 0.05;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl text-slate-100 flex flex-col my-auto max-h-[95vh]">
        {/* Top Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-bold">
              Comprobante de Corte {cut.tipo_corte}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Ticket Receipt */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-950/60 flex justify-center">
          <div
            id="printable-receipt"
            className="w-full max-w-[340px] bg-white text-slate-900 p-5 rounded-md shadow-md font-mono text-xs select-text leading-tight"
          >
            {/* Header */}
            <div className="text-center pb-3 border-b border-dashed border-slate-400">
              <h2 className="text-sm font-black uppercase">{t.storeName}</h2>
              <p className="text-[11px] text-slate-600 mt-0.5">{t.storeAddress}</p>
              <div className="mt-2 py-1 bg-slate-100 font-extrabold text-sm border border-slate-300">
                CORTE DE CAJA {cut.tipo_corte === 'X' ? 'PARCIAL (CORTE X)' : 'TOTAL DEL DÍA (CORTE Z)'}
              </div>
            </div>

            {/* Info */}
            <div className="py-2.5 border-b border-dashed border-slate-400 text-[11px] space-y-0.5">
              <div className="flex justify-between">
                <span>FOLIO CORTE:</span>
                <span className="font-bold">{cut.folio}</span>
              </div>
              <div className="flex justify-between">
                <span>FECHA Y HORA:</span>
                <span>{cut.fecha_hora}</span>
              </div>
              <div className="flex justify-between">
                <span>CAJERO AUDITADO:</span>
                <span>{cut.cajero_nombre}</span>
              </div>
              <div className="flex justify-between">
                <span>TICKETS COBRADOS:</span>
                <span className="font-bold">{cut.cantidad_tickets} tickets</span>
              </div>
              <div className="flex justify-between">
                <span>TICKET PROMEDIO:</span>
                <span>${cut.ticket_promedio.toFixed(2)}</span>
              </div>
            </div>

            {/* Sales breakdown by method */}
            <div className="py-2.5 border-b border-dashed border-slate-400 text-[11px] space-y-1">
              <div className="font-bold text-slate-800 uppercase mb-1">
                VENTAS POR MÉTODO DE PAGO:
              </div>
              <div className="flex justify-between">
                <span>1. EFECTIVO EN VENTAS:</span>
                <span className="tabular-nums font-semibold">${cut.ventas_efectivo.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>2. TARJETAS (DÉB/CRÉD):</span>
                <span className="tabular-nums font-semibold">${cut.ventas_tarjeta.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>3. TRANSFERENCIA SPEI:</span>
                <span className="tabular-nums font-semibold">${cut.ventas_transferencia.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>4. CRÉDITO / FIADO:</span>
                <span className="tabular-nums font-semibold">${cut.ventas_fiado.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-300 font-bold">
                <span>TOTAL VENTAS DEL TURNO:</span>
                <span className="tabular-nums">${cut.total_ventas.toFixed(2)}</span>
              </div>
            </div>

            {/* Cash Drawer Flow Reconciliation */}
            <div className="py-2.5 border-b border-dashed border-slate-400 text-[11px] space-y-1">
              <div className="font-bold text-slate-800 uppercase mb-1">
                CONCILIACIÓN DE EFECTIVO EN CAJÓN:
              </div>
              <div className="flex justify-between">
                <span>(+) FONDO INICIAL DE CAMBIO:</span>
                <span className="tabular-nums">${cut.fondo_fijo.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>(+) VENTAS EN EFECTIVO:</span>
                <span className="tabular-nums">${cut.ventas_efectivo.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>(+) ENTRADAS EXTRA DE EFECTIVO:</span>
                <span className="tabular-nums">${cut.ingresos_extra.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>(-) RETIROS / SANGRÍAS / PAGOS:</span>
                <span className="tabular-nums">-${cut.retiros_sangria.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-300 font-bold">
                <span>(=) EFECTIVO TEÓRICO EN CAJA:</span>
                <span className="tabular-nums">${cut.efectivo_teorico.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-extrabold text-sm pt-1 border-t border-slate-900">
                <span>(=) EFECTIVO CONTADO FÍSICO:</span>
                <span className="tabular-nums">${cut.efectivo_contado.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-1 font-bold">
                <span>DIFERENCIA DE ARQUEO:</span>
                <span
                  className={`tabular-nums ${
                    isSquare ? 'text-slate-900' : isSurplus ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {isSquare
                    ? '$0.00 (CAJA CUADRADA)'
                    : isSurplus
                    ? `+$${cut.diferencia.toFixed(2)} (SOBRANTE)`
                    : `-$${Math.abs(cut.diferencia).toFixed(2)} (FALTANTE)`}
                </span>
              </div>
            </div>

            {/* Denomination summary */}
            <div className="py-2 text-[10px] text-slate-600 border-b border-dashed border-slate-400">
              <div className="font-bold uppercase text-slate-700 mb-0.5">RESUMEN BILLETES:</div>
              <div className="grid grid-cols-3 gap-1">
                <span>$1000: {cut.desglose.b1000}</span>
                <span>$500: {cut.desglose.b500}</span>
                <span>$200: {cut.desglose.b200}</span>
                <span>$100: {cut.desglose.b100}</span>
                <span>$50: {cut.desglose.b50}</span>
                <span>$20: {cut.desglose.b20}</span>
              </div>
            </div>

            {/* Signature & Audit Stamp */}
            <div className="pt-6 text-center space-y-4">
              <div className="border-t border-slate-400 pt-1 w-44 mx-auto text-[10px]">
                Firma Cajero: {cut.cajero_nombre}
              </div>
              <div className="border-t border-slate-400 pt-1 w-44 mx-auto text-[10px]">
                Firma Supervisor / Administrador
              </div>
              <p className="text-[9px] text-slate-500 font-sans">
                AbarrotesPro Database Engine · Auditoría Inmutable
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 flex items-center justify-between gap-3 bg-slate-900">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors border border-slate-700"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>Imprimir Ticket de Corte</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
