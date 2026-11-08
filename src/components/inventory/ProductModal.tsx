import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { Product, Category, UnitOfMeasure } from '../../types/database';
import { Language, translations } from '../../i18n/translations';

interface ProductModalProps {
  product?: Product | null;
  categories: Category[];
  lang: Language;
  onSave: (prod: Partial<Product> & { nombre: string; precio_venta: number }) => void;
  onClose: () => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  categories,
  lang,
  onSave,
  onClose,
}) => {
  const t = translations[lang];

  const [nombre, setNombre] = useState<string>(product?.nombre || '');
  const [sku, setSku] = useState<string>(product?.sku || '');
  const [codigoBarras, setCodigoBarras] = useState<string>(product?.codigo_barras || '');
  const [categoriaId, setCategoriaId] = useState<string>(
    product?.categoria_id || categories[0]?.id || 'cat_granos'
  );
  const [unidadMedida, setUnidadMedida] = useState<UnitOfMeasure>(product?.unidad_medida || 'pza');
  const [precioCosto, setPrecioCosto] = useState<string>(product?.precio_costo?.toString() || '0');
  const [precioVenta, setPrecioVenta] = useState<string>(product?.precio_venta?.toString() || '0');
  const [stockActual, setStockActual] = useState<string>(product?.stock_actual?.toString() || '10');
  const [stockMinimo, setStockMinimo] = useState<string>(product?.stock_minimo?.toString() || '5');
  const [permiteFraccion, setPermiteFraccion] = useState<boolean>(
    product?.permite_fraccion || false
  );
  const [esFavorito, setEsFavorito] = useState<boolean>(product?.es_favorito || false);
  const [ubicacionPasillo, setUbicacionPasillo] = useState<string>(
    product?.ubicacion_pasillo || 'Mostrador'
  );

  const costNum = parseFloat(precioCosto) || 0;
  const priceNum = parseFloat(precioVenta) || 0;
  const marginPct =
    costNum > 0 ? Math.round(((priceNum - costNum) / costNum) * 100 * 100) / 100 : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || priceNum <= 0) return;

    onSave({
      id: product?.id,
      nombre: nombre.trim(),
      sku: sku.trim() || `SKU-${Date.now().toString().slice(-4)}`,
      codigo_barras: codigoBarras.trim() || `750${Date.now().toString().slice(-9)}`,
      categoria_id: categoriaId,
      unidad_medida: unidadMedida,
      precio_costo: costNum,
      precio_venta: priceNum,
      stock_actual: parseFloat(stockActual) || 0,
      stock_minimo: parseFloat(stockMinimo) || 5,
      permite_fraccion: permiteFraccion,
      es_favorito: esFavorito,
      ubicacion_pasillo: ubicacionPasillo.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl text-slate-100 flex flex-col my-auto max-h-[95vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">
            {product ? `${t.edit}: ${product.nombre}` : t.newProduct}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">
              Nombre Comercial del Producto *
            </label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Leche Entera 1L / Frijol Negro 1Kg"
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">SKU / Clave</label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Ej. LAC-001"
                className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Código de Barras (EAN-13)
              </label>
              <input
                type="text"
                value={codigoBarras}
                onChange={(e) => setCodigoBarras(e.target.value)}
                placeholder="Ej. 7501020512345"
                className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Categoría</label>
              <select
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Unidad de Medida
              </label>
              <select
                value={unidadMedida}
                onChange={(e) => setUnidadMedida(e.target.value as UnitOfMeasure)}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
              >
                <option value="pza">Pieza (pza)</option>
                <option value="kg">Kilogramo (kg - Granel)</option>
                <option value="lt">Litro (lt)</option>
                <option value="paq">Paquete (paq)</option>
              </select>
            </div>
          </div>

          {/* Pricing & Profit Calculation */}
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">
                  Precio Costo ($)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={precioCosto}
                  onChange={(e) => setPrecioCosto(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">
                  Precio Venta ($) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={precioVenta}
                  onChange={(e) => setPrecioVenta(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-slate-900 border border-slate-700 rounded-lg text-emerald-400 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">
                  Margen Calculado
                </label>
                <div className="px-2.5 py-1.5 text-xs font-mono font-bold bg-slate-900 border border-slate-800 rounded-lg text-emerald-400">
                  {marginPct}%
                </div>
              </div>
            </div>
          </div>

          {/* Stocks */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Stock Actual</label>
              <input
                type="number"
                step={unidadMedida === 'kg' ? '0.1' : '1'}
                value={stockActual}
                onChange={(e) => setStockActual(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Stock Mínimo (Alerta)
              </label>
              <input
                type="number"
                step="1"
                value={stockMinimo}
                onChange={(e) => setStockMinimo(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={permiteFraccion}
                onChange={(e) => setPermiteFraccion(e.target.checked)}
                className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0"
              />
              <span>Venta fraccionada por peso / báscula (Granel)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={esFavorito}
                onChange={(e) => setEsFavorito(e.target.checked)}
                className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0"
              />
              <span>Marcar como producto Frecuente / Favorito en POS</span>
            </label>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">
              Ubicación en Tienda
            </label>
            <input
              type="text"
              value={ubicacionPasillo}
              onChange={(e) => setUbicacionPasillo(e.target.value)}
              placeholder="Ej. Pasillo 2 Estante B / Refrigerador Central"
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Submit buttons */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-lg"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm"
            >
              <Check className="w-4 h-4" />
              <span>{t.save}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
