import React, { useState } from 'react';
import {
  X,
  Coins,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Printer,
  Calculator,
} from 'lucide-react';
import {
  CashRegisterSession,
  DenominationBreakdown,
  CashCutRecord,
  User,
  TransactionStepLog,
} from '../../types/database';
import { Language, translations } from '../../i18n/translations';
import { CashRegisterService } from '../../services/microservices';
import { sound } from '../../utils/soundEffects';

interface CorteModalProps {
  session: CashRegisterSession;
  tipo: 'X' | 'Z';
  currentUser: User;
  lang: Language;
  onSuccess: (cut: CashCutRecord) => void;
  onClose: () => void;
}

export const CorteModal: React.FC<CorteModalProps> = ({
  session,
  tipo,
  currentUser,
  lang,
  onSuccess,
  onClose,
}) => {
  const t = translations[lang];

  // Denominations state
  const [breakdown, setBreakdown] = useState<DenominationBreakdown>({
    b1000: 0,
    b500: 0,
    b200: 1,
    b100: 2,
    b50: 2,
    b20: 5,
    m20: 0,
    m10: 5,
    m5: 4,
    m2: 5,
    m1: 10,
    m05: 0,
  });

  const [notas, setNotas] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [txLogs, setTxLogs] = useState<TransactionStepLog[] | null>(null);

  const denominationsList: Array<{
    key: keyof DenominationBreakdown;
    label: string;
    val: number;
    isCoin?: boolean;
  }> = [
    { key: 'b1000', label: '$1,000 Billete', val: 1000 },
    { key: 'b500', label: '$500 Billete', val: 500 },
    { key: 'b200', label: '$200 Billete', val: 200 },
    { key: 'b100', label: '$100 Billete', val: 100 },
    { key: 'b50', label: '$50 Billete', val: 50 },
    { key: 'b20', label: '$20 Billete', val: 20 },
    { key: 'm20', label: '$20 Moneda', val: 20, isCoin: true },
    { key: 'm10', label: '$10 Moneda', val: 10, isCoin: true },
    { key: 'm5', label: '$5 Moneda', val: 5, isCoin: true },
    { key: 'm2', label: '$2 Moneda', val: 2, isCoin: true },
    { key: 'm1', label: '$1 Moneda', val: 1, isCoin: true },
    { key: 'm05', label: '$0.50 Moneda', val: 0.5, isCoin: true },
  ];

  // Calculate physical total
  const countedCash = denominationsList.reduce((acc, d) => {
    return acc + (breakdown[d.key] || 0) * d.val;
  }, 0);

  // Compute theoretical cash
  const sales = CashRegisterService.getActiveSession();
  const movs = CashRegisterService.getCashMovements(session.id);
  let extraIn = 0;
  let extraOut = 0;
  movs.forEach((m) => {
    if (m.tipo === 'ingreso') extraIn += m.monto;
    else extraOut += m.monto;
  });

  // Calculate sales cash
  const allSales = CashRegisterService.getActiveSession();
  // Using stored procedure calculation
  const handleCountChange = (key: keyof DenominationBreakdown, val: string) => {
    const parsed = parseInt(val, 10) || 0;
    setBreakdown((prev) => ({
      ...prev,
      [key]: Math.max(0, parsed),
    }));
  };

  const handleSubmit = () => {
    setIsProcessing(true);
    setTimeout(() => {
      let result;
      if (tipo === 'X') {
        result = CashRegisterService.executeCorteX({
          caja_sesion_id: session.id,
          cajero_id: currentUser.id,
          desglose: breakdown,
        });
      } else {
        result = CashRegisterService.executeCorteZ({
          caja_sesion_id: session.id,
          cajero_id: currentUser.id,
          desglose: breakdown,
          notas: notas.trim() || undefined,
        });
      }

      setIsProcessing(false);
      setTxLogs(result.transactionLogs);

      if (result.success && result.data) {
        sound.playSaleSuccess();
        onSuccess(result.data);
      } else {
        sound.playErrorBuzzer();
      }
    }, 280);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl text-slate-100 flex flex-col my-auto max-h-[95vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                tipo === 'X'
                  ? 'bg-amber-600/20 text-amber-400'
                  : 'bg-rose-600/20 text-rose-400'
              }`}
            >
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                {tipo === 'X' ? t.cashCutX : t.cashCutZ}
              </h3>
              <p className="text-xs text-slate-400">
                {tipo === 'X' ? t.cashCutXDesc : t.cashCutZDesc}
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

        {/* Live Arqueo Summary Card */}
        <div className="px-6 py-3.5 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-mono text-slate-400 block uppercase">
              {t.physicalCash} (Conteo de Arqueo)
            </span>
            <span className="text-2xl font-black font-mono text-emerald-400">
              ${countedCash.toFixed(2)} <span className="text-xs text-slate-400 font-sans">MXN</span>
            </span>
          </div>

          <div className="text-xs font-mono text-slate-300 bg-slate-900 px-3 py-2 rounded-xl border border-slate-800">
            <div>
              Fondo Inicial: <strong className="text-white">${session.monto_inicial.toFixed(2)}</strong>
            </div>
            <div className="text-[11px] text-slate-400">
              Cajero: {session.cajero_nombre}
            </div>
          </div>
        </div>

        {/* Content Body: Denomination Calculator Grid */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-emerald-400" />
                <span>{t.billsAndCoins}</span>
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                Capture la cantidad de piezas de cada valor
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {denominationsList.map((d) => {
                const count = breakdown[d.key] || 0;
                const sub = count * d.val;
                return (
                  <div
                    key={d.key}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-slate-200 block truncate">
                        {d.label}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 tabular-nums">
                        ${sub.toFixed(2)}
                      </span>
                    </div>

                    <input
                      type="number"
                      min="0"
                      value={count === 0 ? '' : count}
                      placeholder="0"
                      onChange={(e) => handleCountChange(d.key, e.target.value)}
                      className="w-16 px-2 py-1 text-center font-mono font-bold text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes for final closing */}
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">
              Observaciones / Justificación de Caja
            </label>
            <input
              type="text"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej. Caja cuadrada sin faltantes, retiro de remanente para depósito..."
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Stored Procedure Execution Logs */}
          {txLogs && (
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[10px] font-mono space-y-1">
              <span className="text-slate-400 font-bold block mb-1">
                Transaction Plan sp_corte_caja_{tipo.toLowerCase()}():
              </span>
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
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between gap-3 bg-slate-900/90">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-xl transition-colors"
          >
            {t.cancel}
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isProcessing}
            className={`flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white rounded-xl shadow-md transition-all ${
              tipo === 'X'
                ? 'bg-amber-600 hover:bg-amber-500'
                : 'bg-rose-600 hover:bg-rose-500'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {tipo === 'X'
                ? 'Generar Corte Parcial X'
                : 'Cerrar Turno Definitivo (Corte Z)'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
