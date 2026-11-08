import React, { useState } from 'react';
import { Scale, X, Check } from 'lucide-react';
import { Product } from '../../types/database';
import { Language, translations } from '../../i18n/translations';

interface BulkWeightModalProps {
  product: Product;
  lang: Language;
  onConfirm: (weightKg: number) => void;
  onClose: () => void;
}

export const BulkWeightModal: React.FC<BulkWeightModalProps> = ({
  product,
  lang,
  onConfirm,
  onClose,
}) => {
  const t = translations[lang];
  const [weight, setWeight] = useState<string>('0.500');

  const numWeight = parseFloat(weight) || 0;
  const totalPrice = Math.round(numWeight * product.precio_venta * 100) / 100;

  const handleAddPreset = (grams: number) => {
    const cur = parseFloat(weight) || 0;
    const next = Math.max(0.05, Math.round((cur + grams / 1000) * 1000) / 1000);
    setWeight(next.toFixed(3));
  };

  const handleSetExact = (kg: number) => {
    setWeight(kg.toFixed(3));
  };

  const handleConfirm = () => {
    if (numWeight > 0) {
      onConfirm(numWeight);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md overflow-hidden shadow-2xl text-slate-100">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">{t.bulkScale}</h3>
              <p className="text-xs text-slate-400">{product.nombre}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Weight Display & Calculation */}
        <div className="p-5 space-y-4">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
            <span className="text-xs text-slate-400 font-mono">
              Precio: ${product.precio_venta.toFixed(2)} / {product.unidad_medida}
            </span>
            <div className="mt-2 flex items-center justify-center gap-2">
              <input
                type="number"
                step="0.05"
                min="0.01"
                max={product.stock_actual}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-36 text-center text-3xl font-bold font-mono bg-slate-900 border border-slate-700 rounded-lg py-1 px-2 text-emerald-400 focus:outline-none focus:border-emerald-500"
                autoFocus
              />
              <span className="text-xl font-bold text-slate-300 font-mono">
                {product.unidad_medida}
              </span>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-sm">
              <span className="text-slate-400">Total a cobrar:</span>
              <span className="text-2xl font-bold font-mono text-white">
                ${totalPrice.toFixed(2)} <span className="text-xs text-slate-400">MXN</span>
              </span>
            </div>
          </div>

          {/* Quick presets buttons for grocery store weight scale */}
          <div>
            <span className="text-xs text-slate-400 font-medium block mb-2">
              Pesos Frecuentes / Rápidos:
            </span>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: '100g', val: 0.1 },
                { label: '250g (1/4)', val: 0.25 },
                { label: '500g (1/2)', val: 0.5 },
                { label: '750g (3/4)', val: 0.75 },
                { label: '1.0 kg', val: 1.0 },
                { label: '1.5 kg', val: 1.5 },
                { label: '2.0 kg', val: 2.0 },
                { label: '3.0 kg', val: 3.0 },
              ].map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handleSetExact(p.val)}
                  className={`py-2 px-1 text-xs font-mono font-medium rounded-lg border transition-colors ${
                    Math.abs(numWeight - p.val) < 0.001
                      ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300 font-bold'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700/60'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => handleAddPreset(50)}
                className="flex-1 py-1 text-xs font-mono bg-slate-800/60 border border-slate-700 text-slate-300 rounded hover:bg-slate-700"
              >
                +50g
              </button>
              <button
                type="button"
                onClick={() => handleAddPreset(100)}
                className="flex-1 py-1 text-xs font-mono bg-slate-800/60 border border-slate-700 text-slate-300 rounded hover:bg-slate-700"
              >
                +100g
              </button>
              <button
                type="button"
                onClick={() => handleAddPreset(250)}
                className="flex-1 py-1 text-xs font-mono bg-slate-800/60 border border-slate-700 text-slate-300 rounded hover:bg-slate-700"
              >
                +250g
              </button>
            </div>
          </div>

          {/* Stock availability indicator */}
          <div className="text-xs text-slate-400 flex items-center justify-between px-1">
            <span>Existencia actual:</span>
            <span
              className={`font-mono font-semibold ${
                product.stock_actual < numWeight ? 'text-rose-400' : 'text-slate-200'
              }`}
            >
              {product.stock_actual} {product.unidad_medida}
            </span>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 py-3 border-t border-slate-800 flex items-center justify-end gap-3 bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
          >
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={numWeight <= 0 || product.stock_actual < numWeight}
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:pointer-events-none rounded-lg transition-colors shadow-sm"
          >
            <Check className="w-4 h-4" />
            <span>Agregar al Ticket (${totalPrice.toFixed(2)})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
