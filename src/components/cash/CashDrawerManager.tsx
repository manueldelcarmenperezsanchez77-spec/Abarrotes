import React, { useState } from 'react';
import {
  Landmark,
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  FileCheck2,
  Lock,
  Unlock,
  AlertCircle,
  Eye,
} from 'lucide-react';
import {
  CashRegisterSession,
  User,
  CashCutRecord,
  CashMovement,
  Sale,
} from '../../types/database';
import { Language, translations } from '../../i18n/translations';
import { CashRegisterService, POSCheckoutService } from '../../services/microservices';
import { CorteModal } from './CorteModal';
import { CutTicketModal } from './CutTicketModal';

interface CashDrawerManagerProps {
  currentUser: User;
  activeSession?: CashRegisterSession;
  lang: Language;
}

export const CashDrawerManager: React.FC<CashDrawerManagerProps> = ({
  currentUser,
  activeSession,
  lang,
}) => {
  const t = translations[lang];

  // Modals state
  const [corteType, setCorteType] = useState<'X' | 'Z' | null>(null);
  const [viewingCutTicket, setViewingCutTicket] = useState<CashCutRecord | null>(null);
  const [isCashMovementOpen, setIsCashMovementOpen] = useState<boolean>(false);
  const [movementType, setMovementType] = useState<'ingreso' | 'retiro_sangria'>('retiro_sangria');
  const [movementAmount, setMovementAmount] = useState<string>('200');
  const [movementReason, setMovementReason] = useState<string>(
    'Retiro parcial por seguridad / resguardo en caja fuerte'
  );

  // New shift opening modal state
  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState<boolean>(false);
  const [initialFloat, setInitialFloat] = useState<string>('500');
  const [shiftNotes, setShiftNotes] = useState<string>('Fondo fijo de cambio matutino');

  const sales: Sale[] = POSCheckoutService.getSales();
  const cutsHistory: CashCutRecord[] = CashRegisterService.getCashCuts();
  const sessionCashMovements: CashMovement[] = activeSession
    ? CashRegisterService.getCashMovements(activeSession.id)
    : [];

  // Filter sales for active session
  const currentSessionSales = activeSession
    ? sales.filter((s) => s.caja_sesion_id === activeSession.id && s.estado === 'completada')
    : [];

  let salesEfectivo = 0;
  let salesTarjeta = 0;
  let salesTransfer = 0;
  let salesFiado = 0;

  currentSessionSales.forEach((s) => {
    if (s.tipo_pago === 'efectivo') salesEfectivo += s.total;
    else if (s.tipo_pago === 'tarjeta') salesTarjeta += s.total;
    else if (s.tipo_pago === 'transferencia') salesTransfer += s.total;
    else if (s.tipo_pago === 'fiado') salesFiado += s.total;
  });

  let totalExtraIn = 0;
  let totalSangrias = 0;

  sessionCashMovements.forEach((m) => {
    if (m.tipo === 'ingreso') totalExtraIn += m.monto;
    else totalSangrias += m.monto;
  });

  const fondoInicial = activeSession?.monto_inicial || 0;
  const theoreticalCash = Math.round(
    (fondoInicial + salesEfectivo + totalExtraIn - totalSangrias) * 100
  ) / 100;
  const totalTurnoVentas = Math.round(
    (salesEfectivo + salesTarjeta + salesTransfer + salesFiado) * 100
  ) / 100;

  const handleCashMovementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;
    const num = parseFloat(movementAmount) || 0;
    if (num <= 0) return;

    CashRegisterService.recordCashMovement({
      caja_sesion_id: activeSession.id,
      tipo: movementType,
      monto: num,
      motivo: movementReason.trim(),
      usuario_id: currentUser.id,
    });

    setIsCashMovementOpen(false);
  };

  const handleOpenShiftSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(initialFloat) || 0;
    CashRegisterService.openSession({
      cajero_id: currentUser.id,
      monto_inicial: num,
      notas: shiftNotes.trim(),
    });
    setIsOpenShiftModalOpen(false);
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6 overflow-y-auto">
      {/* Shift Overview Header */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
              <Landmark className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-white tracking-tight">{t.cashTitle}</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {activeSession ? (
              <>
                Sesión: <strong className="text-slate-200 font-mono">{activeSession.id}</strong> ·
                Apertura: {activeSession.fecha_apertura} · Cajero: {activeSession.cajero_nombre}
              </>
            ) : (
              'No hay sesión de caja abierta actualmente.'
            )}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {activeSession && activeSession.estado === 'abierta' ? (
            <>
              <button
                type="button"
                onClick={() => setIsCashMovementOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 transition-colors"
              >
                <Coins className="w-4 h-4 text-amber-400" />
                <span>{t.registerMovement}</span>
              </button>

              <button
                type="button"
                onClick={() => setCorteType('X')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-600/20 text-amber-300 border border-amber-500/40 hover:bg-amber-600/30 transition-colors"
              >
                <FileCheck2 className="w-4 h-4" />
                <span>{t.cashCutX}</span>
              </button>

              <button
                type="button"
                onClick={() => setCorteType('Z')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors shadow-sm"
              >
                <Lock className="w-4 h-4" />
                <span>{t.cashCutZ}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsOpenShiftModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm"
            >
              <Unlock className="w-4 h-4" />
              <span>{t.openShift}</span>
            </button>
          )}
        </div>
      </div>

      {/* Cash Flow Ledger Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Theoretical Cash in drawer */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
              {t.expectedCash}
            </span>
            <div className="text-2xl font-black font-mono text-emerald-400 mt-1">
              ${theoreticalCash.toFixed(2)}{' '}
              <span className="text-xs text-slate-400 font-sans">MXN</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800 text-[11px] text-slate-400 font-mono flex justify-between">
            <span>Fondo Inicial:</span>
            <span className="text-slate-200">${fondoInicial.toFixed(2)}</span>
          </div>
        </div>

        {/* Card 2: Cash Sales */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
              Ventas en Efectivo
            </span>
            <div className="text-2xl font-black font-mono text-white mt-1">
              ${salesEfectivo.toFixed(2)}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800 text-[11px] text-slate-400 font-mono flex justify-between">
            <span>Tickets en Efectivo:</span>
            <span className="text-slate-200">
              {currentSessionSales.filter((s) => s.tipo_pago === 'efectivo').length}
            </span>
          </div>
        </div>

        {/* Card 3: Digital & Credit Sales */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
              Tarjetas & Transferencias
            </span>
            <div className="text-2xl font-black font-mono text-blue-400 mt-1">
              ${(salesTarjeta + salesTransfer).toFixed(2)}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800 text-[11px] text-slate-400 font-mono flex justify-between">
            <span>Fiado pendiente:</span>
            <span className="text-amber-400">${salesFiado.toFixed(2)}</span>
          </div>
        </div>

        {/* Card 4: Withdrawals / Sangrías */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
              Retiros / Sangrías de Caja
            </span>
            <div className="text-2xl font-black font-mono text-rose-400 mt-1">
              -${totalSangrias.toFixed(2)}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800 text-[11px] text-slate-400 font-mono flex justify-between">
            <span>Entradas Adicionales:</span>
            <span className="text-emerald-400">+${totalExtraIn.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Cash Drawer Movements History */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Coins className="w-4 h-4 text-emerald-400" />
            <span>Movimientos Extraordinarios de Efectivo del Turno</span>
          </h3>
          <span className="text-xs font-mono text-slate-400">
            {sessionCashMovements.length} movimientos
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase tracking-wider bg-slate-950/40">
                <th className="py-2.5 px-3">Hora</th>
                <th className="py-2.5 px-3">Tipo Movimiento</th>
                <th className="py-2.5 px-3 text-right">Monto</th>
                <th className="py-2.5 px-3">Usuario</th>
                <th className="py-2.5 px-3">Motivo / Justificación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {sessionCashMovements.map((mov) => (
                <tr key={mov.id} className="hover:bg-slate-800/40">
                  <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                    {mov.timestamp.substring(11, 19)}
                  </td>
                  <td className="py-2.5 px-3">
                    {mov.tipo === 'ingreso' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded font-semibold">
                        <ArrowDownLeft className="w-3.5 h-3.5" /> ENTRADA EFECTIVO
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded font-semibold">
                        <ArrowUpRight className="w-3.5 h-3.5" /> RETIRO / SANGRÍA
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-100 tabular-nums">
                    ${mov.monto.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-slate-300 text-[11px]">{mov.usuario_nombre}</td>
                  <td className="py-2.5 px-3 text-slate-400 text-[11px]">{mov.motivo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sessionCashMovements.length === 0 && (
          <div className="py-8 text-center text-slate-500 text-xs">
            No se han registrado sangrías o entradas adicionales en este turno.
          </div>
        )}
      </div>

      {/* History of Registered Cuts (X and Z) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-400" />
            <span>{t.cutHistory}</span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase tracking-wider bg-slate-950/40">
                <th className="py-3 px-3">Folio</th>
                <th className="py-3 px-3">Tipo</th>
                <th className="py-3 px-3">Fecha & Hora</th>
                <th className="py-3 px-3">Cajero</th>
                <th className="py-3 px-3 text-right">Ventas Totales</th>
                <th className="py-3 px-3 text-right">Efectivo Teórico</th>
                <th className="py-3 px-3 text-right">Efectivo Físico</th>
                <th className="py-3 px-3 text-center">Diferencia</th>
                <th className="py-3 px-3 text-right">Ticket</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {cutsHistory.map((cut) => {
                const isSquare = Math.abs(cut.diferencia) < 0.05;
                const isSurplus = cut.diferencia > 0.05;

                return (
                  <tr key={cut.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                      {cut.folio}
                    </td>
                    <td className="py-3 px-3 font-mono">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          cut.tipo_corte === 'X'
                            ? 'bg-amber-950 text-amber-300'
                            : 'bg-rose-950 text-rose-300'
                        }`}
                      >
                        CORTE {cut.tipo_corte}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">
                      {cut.fecha_hora}
                    </td>
                    <td className="py-3 px-3 text-slate-200">{cut.cajero_nombre}</td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-slate-100">
                      ${cut.total_ventas.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-400">
                      ${cut.efectivo_teorico.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-white">
                      ${cut.efectivo_contado.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-center font-mono">
                      {isSquare ? (
                        <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded">
                          CUADRADA
                        </span>
                      ) : isSurplus ? (
                        <span className="text-[10px] text-blue-400 font-semibold bg-blue-950/60 px-2 py-0.5 rounded">
                          +${cut.diferencia.toFixed(2)} SOBRANTE
                        </span>
                      ) : (
                        <span className="text-[10px] text-rose-400 font-semibold bg-rose-950/60 px-2 py-0.5 rounded">
                          -${Math.abs(cut.diferencia).toFixed(2)} FALTANTE
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => setViewingCutTicket(cut)}
                        className="p-1.5 text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-slate-800 transition-colors"
                        title="Ver Comprobante Imprimible"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {cutsHistory.length === 0 && (
          <div className="py-12 text-center text-slate-500 text-xs">
            Aún no se han generado cortes X o Z en el sistema.
          </div>
        )}
      </div>

      {/* Interactive Arqueo Modal for Corte X or Z */}
      {corteType && activeSession && (
        <CorteModal
          session={activeSession}
          tipo={corteType}
          currentUser={currentUser}
          lang={lang}
          onSuccess={(cut) => {
            setCorteType(null);
            setViewingCutTicket(cut);
          }}
          onClose={() => setCorteType(null)}
        />
      )}

      {/* Printable Cut Ticket Modal */}
      {viewingCutTicket && (
        <CutTicketModal
          cut={viewingCutTicket}
          lang={lang}
          onClose={() => setViewingCutTicket(null)}
        />
      )}

      {/* Cash Movement Modal (Sangría / Retiro o Entrada de Efectivo) */}
      {isCashMovementOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl text-slate-100">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">{t.registerMovement}</h3>
              <button
                onClick={() => setIsCashMovementOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCashMovementSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Tipo de Movimiento
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMovementType('retiro_sangria')}
                    className={`p-2.5 rounded-lg border text-xs font-semibold ${
                      movementType === 'retiro_sangria'
                        ? 'bg-rose-950/60 border-rose-500 text-rose-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Retiro / Sangría
                  </button>
                  <button
                    type="button"
                    onClick={() => setMovementType('ingreso')}
                    className={`p-2.5 rounded-lg border text-xs font-semibold ${
                      movementType === 'ingreso'
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Entrada de Efectivo
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Monto en Efectivo ($ MXN)
                </label>
                <input
                  type="number"
                  step="10"
                  min="1"
                  required
                  value={movementAmount}
                  onChange={(e) => setMovementAmount(e.target.value)}
                  className="w-full px-3 py-2 text-xl font-bold font-mono bg-slate-950 border border-slate-700 rounded-lg text-emerald-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Motivo / Justificación *
                </label>
                <input
                  type="text"
                  required
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                  placeholder="Ej. Retiro por exceso de efectivo en mostrador"
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCashMovementOpen(false)}
                  className="px-4 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-lg"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm"
                >
                  Registrar en Libro Mayor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Open Shift Modal */}
      {isOpenShiftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl text-slate-100">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">{t.openRegister}</h3>
              <button
                onClick={() => setIsOpenShiftModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleOpenShiftSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  {t.initialFloat} (Fondo fijo para cambio) *
                </label>
                <input
                  type="number"
                  step="50"
                  min="0"
                  required
                  value={initialFloat}
                  onChange={(e) => setInitialFloat(e.target.value)}
                  className="w-full px-3 py-2 text-xl font-bold font-mono bg-slate-950 border border-slate-700 rounded-lg text-emerald-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Cajero Asignado
                </label>
                <div className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 font-medium">
                  {currentUser.nombre} ({currentUser.rol})
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Notas</label>
                <input
                  type="text"
                  value={shiftNotes}
                  onChange={(e) => setShiftNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpenShiftModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-lg"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm"
                >
                  Abrir Turno de Caja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
