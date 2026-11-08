import React, { useState } from 'react';
import { X, ArrowDownRight, ArrowUpRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Product, User, TransactionStepLog } from '../../types/database';
import { Language, translations } from '../../i18n/translations';
import { CatalogInventoryService } from '../../services/microservices';
import { sound } from '../../utils/soundEffects';

interface StockMovementModalProps {
  mode: 'ENTRY' | 'EXIT';
  products: Product[];
  currentUser: User;
  lang: Language;
  onSuccess: () => void;
  onClose: () => void;
}

export const StockMovementModal: React.FC<StockMovementModalProps> = ({
  mode,
  products,
  currentUser,
  lang,
  onSuccess,
  onClose,
}) => {
  const t = translations[lang];

  // Common fields
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [quantity, setQuantity] = useState<string>('5');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [txLogs, setTxLogs] = useState<TransactionStepLog[] | null>(null);

  // Entry fields
  const [providerName, setProviderName] = useState<string>('Abarrotera Mayorista Central');
  const [invoiceRef, setInvoiceRef] = useState<string>(`FAC-${Date.now().toString().slice(-5)}`);
  const [unitCost, setUnitCost] = useState<string>(
    products[0]?.precio_costo?.toString() || '20'
  );
  const [newSellingPrice, setNewSellingPrice] = useState<string>(
    products[0]?.precio_venta?.toString() || '28'
  );
  const [batchNumber, setBatchNumber] = useState<string>(
    `L-${new Date().toISOString().substring(0, 10).replace(/-/g, '')}-A`
  );
  const [expiryDate, setExpiryDate] = useState<string>('2026-12-31');

  // Exit fields
  const [exitReasonType, setExitReasonType] = useState<
    'MERMA_CADUCIDAD' | 'MERMA_DANADO' | 'MERMA_ROBO' | 'AJUSTE_INVENTARIO'
  >('MERMA_DANADO');
  const [exitDetail, setExitDetail] = useState<string>('Producto roto en estiba o empaque abierto');

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find((p) => p.id === prodId);
    if (prod) {
      setUnitCost(prod.precio_costo.toString());
      setNewSellingPrice(prod.precio_venta.toString());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setTxLogs(null);

    const numQty = parseFloat(quantity) || 0;
    if (numQty <= 0 || !selectedProductId) {
      setErrorMessage('Por favor ingrese una cantidad válida mayor a cero.');
      sound.playErrorBuzzer();
      return;
    }

    setIsProcessing(true);

    if (mode === 'ENTRY') {
      const result = CatalogInventoryService.executeStockEntry({
        proveedor_nombre: providerName.trim(),
        factura_ref: invoiceRef.trim(),
        usuario_id: currentUser.id,
        items: [
          {
            producto_id: selectedProductId,
            cantidad: numQty,
            costo_unitario: parseFloat(unitCost) || 0,
            nuevo_precio_venta: parseFloat(newSellingPrice) || undefined,
            lote: batchNumber.trim(),
            fecha_caducidad: expiryDate,
          },
        ],
      });

      setIsProcessing(false);
      setTxLogs(result.transactionLogs);

      if (result.success) {
        sound.playSaleSuccess();
        setTimeout(() => onSuccess(), 400);
      } else {
        sound.playErrorBuzzer();
        setErrorMessage(result.message);
      }
    } else {
      // EXIT / MERMA
      const result = CatalogInventoryService.executeStockExit({
        producto_id: selectedProductId,
        cantidad: numQty,
        tipo_merma: exitReasonType,
        motivo: exitDetail.trim(),
        usuario_id: currentUser.id,
      });

      setIsProcessing(false);
      setTxLogs(result.transactionLogs);

      if (result.success) {
        sound.playSaleSuccess();
        setTimeout(() => onSuccess(), 400);
      } else {
        sound.playErrorBuzzer();
        setErrorMessage(result.message);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl text-slate-100 flex flex-col my-auto max-h-[95vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                mode === 'ENTRY'
                  ? 'bg-emerald-600/20 text-emerald-400'
                  : 'bg-rose-600/20 text-rose-400'
              }`}
            >
              {mode === 'ENTRY' ? (
                <ArrowDownRight className="w-5 h-5" />
              ) : (
                <ArrowUpRight className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {mode === 'ENTRY' ? t.entryTitle : t.exitTitle}
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {mode === 'ENTRY'
                  ? 'Procedimiento: sp_entrada_mercancia()'
                  : 'Procedimiento: sp_salida_merma()'}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Product selector */}
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">
              Producto a procesar *
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => handleProductChange(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500 font-medium"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.sku}] {p.nombre} (Stock: {p.stock_actual} {p.unidad_medida})
                </option>
              ))}
            </select>
          </div>

          {/* Current Stock Snapshot */}
          {selectedProduct && (
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">Existencia actual en almacén:</span>
              <span className="font-mono font-bold text-slate-100">
                {selectedProduct.stock_actual} {selectedProduct.unidad_medida}
              </span>
            </div>
          )}

          {/* Quantity */}
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">
              {mode === 'ENTRY' ? 'Cantidad a ingresar *' : 'Cantidad a dar de baja *'}
            </label>
            <input
              type="number"
              step={selectedProduct?.permite_fraccion ? '0.1' : '1'}
              min="0.05"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-3 py-2 text-base font-bold font-mono bg-slate-950 border border-slate-700 rounded-lg text-emerald-400 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Mode ENTRY fields */}
          {mode === 'ENTRY' && (
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    {t.provider}
                  </label>
                  <input
                    type="text"
                    required
                    value={providerName}
                    onChange={(e) => setProviderName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    {t.invoiceRef}
                  </label>
                  <input
                    type="text"
                    required
                    value={invoiceRef}
                    onChange={(e) => setInvoiceRef(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Costo Unitario ($)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={unitCost}
                    onChange={(e) => setUnitCost(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Nuevo Precio Venta ($)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={newSellingPrice}
                    onChange={(e) => setNewSellingPrice(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-700 rounded-lg text-emerald-400 focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Número de Lote
                  </label>
                  <input
                    type="text"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Fecha de Caducidad
                  </label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Mode EXIT fields */}
          {mode === 'EXIT' && (
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  {t.movementReason} *
                </label>
                <select
                  value={exitReasonType}
                  onChange={(e) =>
                    setExitReasonType(
                      e.target.value as
                        | 'MERMA_CADUCIDAD'
                        | 'MERMA_DANADO'
                        | 'MERMA_ROBO'
                        | 'AJUSTE_INVENTARIO'
                    )
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-rose-500"
                >
                  <option value="MERMA_DANADO">{t.reasonDamaged}</option>
                  <option value="MERMA_CADUCIDAD">{t.reasonExpired}</option>
                  <option value="AJUSTE_INVENTARIO">{t.reasonInventoryAdjustment}</option>
                  <option value="MERMA_ROBO">Pérdida / Extravío no justificado</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Detalles y Observaciones de Auditoría *
                </label>
                <textarea
                  rows={3}
                  required
                  value={exitDetail}
                  onChange={(e) => setExitDetail(e.target.value)}
                  placeholder="Describa el motivo específico de la merma..."
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Stored procedure step logs */}
          {txLogs && (
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[10px] font-mono space-y-0.5">
              <span className="text-slate-400 font-bold block mb-1">SQL Execution Plan:</span>
              {txLogs.map((log) => (
                <div key={log.step} className="flex items-center gap-1.5">
                  <span className="text-slate-500">{log.step}.</span>
                  <span
                    className={log.status === 'SUCCESS' ? 'text-emerald-400' : 'text-rose-400'}
                  >
                    [{log.operation}]
                  </span>
                  <span className="text-slate-300 truncate">{log.details}</span>
                </div>
              ))}
            </div>
          )}

          {/* Footer actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-lg"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className={`flex items-center gap-2 px-5 py-2 text-xs font-bold text-white rounded-lg shadow-sm ${
                mode === 'ENTRY'
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-rose-600 hover:bg-rose-500'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{t.confirmMovement}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
