import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Banknote,
  CreditCard,
  Send,
  BookUser,
  X,
  AlertTriangle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { PaymentMethod, Sale, ClientFiado, TransactionStepLog } from '../../types/database';
import { Language, translations } from '../../i18n/translations';
import { POSCheckoutService } from '../../services/microservices';
import { sound } from '../../utils/soundEffects';

interface PaymentModalProps {
  total: number;
  items: {
    producto_id: string;
    cantidad: number;
  }[];
  cajaSesionId: string;
  cajeroId: string;
  lang: Language;
  onSuccess: (sale: Sale) => void;
  onClose: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  total,
  items,
  cajaSesionId,
  cajeroId,
  lang,
  onSuccess,
  onClose,
}) => {
  const t = translations[lang];
  const [method, setMethod] = useState<PaymentMethod>('efectivo');
  const [cashReceived, setCashReceived] = useState<string>(total.toFixed(2));
  const [customerName, setCustomerName] = useState<string>('Público en General');
  const [selectedFiadoId, setSelectedFiadoId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [txLogs, setTxLogs] = useState<TransactionStepLog[] | null>(null);

  const clientsFiado: ClientFiado[] = POSCheckoutService.getClientsFiado();

  const numCash = parseFloat(cashReceived) || 0;
  const change = Math.max(0, Math.round((numCash - total) * 100) / 100);
  const isCashSufficient = method !== 'efectivo' || numCash >= total;

  const handleSetQuickCash = (amount: number) => {
    setCashReceived(amount.toFixed(2));
  };

  const handleExactCash = () => {
    setCashReceived(total.toFixed(2));
  };

  const handleSelectFiadoCustomer = (cliId: string) => {
    setSelectedFiadoId(cliId);
    const cli = clientsFiado.find((c) => c.id === cliId);
    if (cli) {
      setCustomerName(`${cli.nombre} (${cli.apodo})`);
    }
  };

  const selectedFiadoClient = clientsFiado.find((c) => c.id === selectedFiadoId);

  const handleSubmit = async () => {
    setErrorMessage(null);
    setTxLogs(null);

    if (method === 'fiado' && !selectedFiadoId) {
      setErrorMessage('Por favor seleccione un cliente registrado en la libreta de fiado.');
      sound.playErrorBuzzer();
      return;
    }

    if (
      method === 'fiado' &&
      selectedFiadoClient &&
      selectedFiadoClient.saldo_deudor + total > selectedFiadoClient.limite_credito
    ) {
      setErrorMessage(
        `Límite de crédito excedido para ${selectedFiadoClient.nombre}. Límite: $${selectedFiadoClient.limite_credito}, Saldo actual: $${selectedFiadoClient.saldo_deudor}, Total venta: $${total}`
      );
      sound.playErrorBuzzer();
      return;
    }

    setIsProcessing(true);

    // Simulate realistic async microservice transaction delay (300ms)
    setTimeout(() => {
      const result = POSCheckoutService.executeSale({
        caja_sesion_id: cajaSesionId,
        cajero_id: cajeroId,
        cliente_nombre: customerName,
        cliente_fiado_id: selectedFiadoId || undefined,
        tipo_pago: method,
        monto_pagado: method === 'efectivo' ? numCash : total,
        items,
      });

      setIsProcessing(false);
      setTxLogs(result.transactionLogs);

      if (result.success && result.data) {
        sound.playSaleSuccess();
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
        onSuccess(result.data);
      } else {
        sound.playErrorBuzzer();
        setErrorMessage(result.message || 'Error en el procedimiento almacenado sp_realizar_venta');
      }
    }, 280);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl text-slate-100 flex flex-col my-auto max-h-[95vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">{t.checkoutTitle}</h3>
            <p className="text-xs text-slate-400 font-mono">
              STORED PROCEDURE: sp_realizar_venta()
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Total Banner */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block uppercase font-mono tracking-wider">
              {t.totalToPay}
            </span>
            <span className="text-3xl font-extrabold font-mono text-emerald-400">
              ${total.toFixed(2)} <span className="text-xs text-slate-400 font-sans">MXN</span>
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 block font-mono">
              Artículos a procesar: <span className="text-white font-bold">{items.length}</span>
            </span>
            <span className="text-[11px] text-emerald-400/80 font-mono">
              IVA 16% Trasladado Incluido
            </span>
          </div>
        </div>

        {/* Content body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Payment Method Selector */}
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-2">
              {t.paymentMethod}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'efectivo' as const, label: t.cash, icon: Banknote },
                { id: 'tarjeta' as const, label: t.card, icon: CreditCard },
                { id: 'transferencia' as const, label: t.transfer, icon: Send },
                { id: 'fiado' as const, label: t.creditFiado, icon: BookUser },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = method === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.id)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-sm'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-5 h-5 mb-1" />
                    <span className="whitespace-nowrap">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cash Specific Calculations */}
          {method === 'efectivo' && (
            <div className="space-y-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">
                    {t.amountReceived}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-mono text-lg font-bold">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.5"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-xl font-bold font-mono bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <span className="text-xs text-slate-300 font-medium block mb-1">
                    {t.changeToReturn}
                  </span>
                  <div className="bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 flex items-center justify-between">
                    <span className="text-2xl font-bold font-mono text-emerald-400">
                      ${change.toFixed(2)}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">MXN</span>
                  </div>
                </div>
              </div>

              {/* Quick Mexican Peso bill buttons */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-slate-400 font-medium">{t.quickBills}:</span>
                  <button
                    type="button"
                    onClick={handleExactCash}
                    className="text-[11px] font-mono font-bold text-emerald-400 hover:underline"
                  >
                    {t.exactAmount} (${total.toFixed(2)})
                  </button>
                </div>
                <div className="grid grid-cols-6 gap-1.5">
                  {[20, 50, 100, 200, 500, 1000].map((denom) => (
                    <button
                      key={denom}
                      type="button"
                      onClick={() => handleSetQuickCash(denom)}
                      className={`py-1.5 px-1 text-xs font-mono font-semibold rounded border transition-colors ${
                        numCash === denom
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                      }`}
                    >
                      ${denom}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Fiado (Store credit) Specific Customer Selector */}
          {method === 'fiado' && (
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <label className="text-xs text-slate-300 font-medium block">
                {t.selectFiadoCustomer} (Libreta de Cuentas)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {clientsFiado.map((cli) => {
                  const isSelected = selectedFiadoId === cli.id;
                  const availableCredit = cli.limite_credito - cli.saldo_deudor;
                  const canAfford = availableCredit >= total;

                  return (
                    <button
                      key={cli.id}
                      type="button"
                      onClick={() => handleSelectFiadoCustomer(cli.id)}
                      className={`text-left p-2.5 rounded-lg border text-xs transition-all ${
                        isSelected
                          ? 'bg-emerald-600/20 border-emerald-500 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="font-semibold text-slate-100">{cli.nombre}</div>
                      <div className="text-[11px] text-slate-400">{cli.apodo}</div>
                      <div className="mt-1 pt-1 border-t border-slate-800 flex justify-between font-mono text-[10px]">
                        <span>Deuda: ${cli.saldo_deudor.toFixed(2)}</span>
                        <span className={canAfford ? 'text-emerald-400' : 'text-rose-400'}>
                          Disp: ${availableCredit.toFixed(2)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedFiadoClient && (
                <div className="text-[11px] text-slate-400 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <div className="flex justify-between">
                    <span>Límite autorizado:</span>
                    <span className="font-mono">${selectedFiadoClient.limite_credito.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-slate-200 mt-0.5">
                    <span>Saldo resultante con esta venta:</span>
                    <span className="font-mono text-emerald-400">
                      ${(selectedFiadoClient.saldo_deudor + total).toFixed(2)} MXN
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Customer Name input */}
          {method !== 'fiado' && (
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                {t.customerName}
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Público en General / Nombre del cliente"
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          {/* Error display */}
          {errorMessage && (
            <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Fallo en Transacción (Rollback)</p>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Stored procedure step logs preview */}
          {txLogs && (
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] font-mono space-y-1">
              <span className="text-slate-400 font-bold block mb-1">
                Transaction Step Ledger:
              </span>
              {txLogs.map((log) => (
                <div key={log.step} className="flex items-center gap-2">
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
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between gap-3 bg-slate-900/90">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2.5 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-xl transition-colors"
          >
            {t.cancel}
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isProcessing || !isCashSufficient}
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:pointer-events-none rounded-xl transition-all shadow-md"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t.processingSale}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{t.completeSale}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
