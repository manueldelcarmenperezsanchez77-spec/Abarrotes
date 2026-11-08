import React from 'react';
import { Printer, CheckCircle, ArrowRight } from 'lucide-react';
import { Sale } from '../../types/database';
import { Language, translations } from '../../i18n/translations';

interface ReceiptModalProps {
  sale: Sale;
  lang: Language;
  onNewSale: () => void;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  sale,
  lang,
  onNewSale,
}) => {
  const t = translations[lang];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl text-slate-100 flex flex-col my-auto max-h-[95vh]">
        {/* Modal Top Banner */}
        <div className="px-5 py-3.5 bg-emerald-950/60 border-b border-emerald-800/60 flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span className="text-sm font-semibold tracking-wide">
              {t.ticketReceipt} Registrado
            </span>
          </div>
          <span className="text-xs font-mono text-emerald-300 font-bold bg-emerald-900/80 px-2 py-0.5 rounded">
            {sale.folio_ticket}
          </span>
        </div>

        {/* Printable Thermal Receipt (Simulating 80mm ESC/POS Printer) */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-950/50 flex justify-center">
          <div
            id="printable-receipt"
            className="w-full max-w-[340px] bg-white text-slate-900 p-5 rounded-md shadow-md font-mono text-xs select-text leading-tight"
          >
            {/* Store Header */}
            <div className="text-center pb-3 border-b border-dashed border-slate-400">
              <h2 className="text-sm font-extrabold uppercase tracking-tight">
                {t.storeName}
              </h2>
              <p className="text-[11px] text-slate-600 mt-0.5">{t.storeAddress}</p>
              <p className="text-[10px] text-slate-500">{t.storePhone}</p>
            </div>

            {/* Ticket Info */}
            <div className="py-2.5 border-b border-dashed border-slate-400 text-[11px] space-y-0.5">
              <div className="flex justify-between">
                <span>FOLIO:</span>
                <span className="font-bold">{sale.folio_ticket}</span>
              </div>
              <div className="flex justify-between">
                <span>FECHA:</span>
                <span>{sale.created_at}</span>
              </div>
              <div className="flex justify-between">
                <span>CAJERO:</span>
                <span>{sale.cajero_nombre}</span>
              </div>
              <div className="flex justify-between">
                <span>CLIENTE:</span>
                <span className="truncate max-w-[170px]">{sale.cliente_nombre}</span>
              </div>
            </div>

            {/* Items Table */}
            <div className="py-2.5 border-b border-dashed border-slate-400">
              <div className="grid grid-cols-12 text-[10px] font-bold pb-1 text-slate-700">
                <span className="col-span-2">CANT</span>
                <span className="col-span-6">DESCRIPCIÓN</span>
                <span className="col-span-4 text-right">IMPORTE</span>
              </div>

              <div className="divide-y divide-slate-100">
                {sale.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 text-[11px] py-1">
                    <span className="col-span-2 font-semibold">
                      {item.cantidad} {item.unidad_medida}
                    </span>
                    <span className="col-span-6 truncate pr-1" title={item.producto_nombre}>
                      {item.producto_nombre}
                    </span>
                    <span className="col-span-4 text-right tabular-nums font-semibold">
                      ${item.subtotal.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals & Breakdown */}
            <div className="py-2.5 space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-600">
                <span>SUBTOTAL (SIN IVA):</span>
                <span className="tabular-nums">${sale.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>IVA (16% TRASLADADO):</span>
                <span className="tabular-nums">${sale.iva.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-black pt-1 border-t border-slate-900 mt-1">
                <span>TOTAL A PAGAR:</span>
                <span className="tabular-nums font-mono">${sale.total.toFixed(2)} MXN</span>
              </div>
              <div className="flex justify-between text-slate-700 pt-1">
                <span className="uppercase">FORMA DE PAGO:</span>
                <span className="font-semibold uppercase">{sale.tipo_pago}</span>
              </div>
              {sale.tipo_pago === 'efectivo' && (
                <>
                  <div className="flex justify-between text-slate-700">
                    <span>EFECTIVO ENTREGADO:</span>
                    <span className="tabular-nums">${sale.monto_pagado.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>CAMBIO ENTREGADO:</span>
                    <span className="tabular-nums">${sale.cambio.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Barcode & Footer note */}
            <div className="pt-3 border-t border-dashed border-slate-400 text-center">
              {/* Simulated Code128 Barcode */}
              <div className="flex items-center justify-center gap-[2px] h-9 my-1">
                {Array.from({ length: 42 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-full bg-black ${
                      (i * 7) % 3 === 0 ? 'w-[3px]' : (i * 3) % 2 === 0 ? 'w-[2px]' : 'w-[1px]'
                    }`}
                  />
                ))}
              </div>
              <p className="text-[10px] tracking-widest text-slate-700">{sale.folio_ticket}</p>
              <p className="text-[10px] text-slate-500 mt-2 font-sans font-medium">
                {t.thanksMessage}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="px-5 py-3 border-t border-slate-800 flex items-center justify-between gap-3 bg-slate-900">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors border border-slate-700"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>{t.printTicket}</span>
          </button>

          <button
            type="button"
            onClick={onNewSale}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors shadow-sm"
          >
            <span>{t.newSale}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
