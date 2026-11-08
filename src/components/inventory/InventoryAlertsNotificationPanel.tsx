import React, { useState } from 'react';
import {
  Bell,
  AlertTriangle,
  AlertOctagon,
  ArrowDownRight,
  CheckCircle2,
  X,
  PackageX,
  Sparkles,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { StockNotification } from '../../types/database';
import { Language, translations } from '../../i18n/translations';
import { CatalogInventoryService } from '../../services/microservices';
import { sound } from '../../utils/soundEffects';

interface InventoryAlertsNotificationPanelProps {
  notifications: StockNotification[];
  lang: Language;
  onRestock: (productId: string, suggestedQty: number) => void;
  onClose?: () => void;
}

export const InventoryAlertsNotificationPanel: React.FC<
  InventoryAlertsNotificationPanelProps
> = ({ notifications, lang, onRestock, onClose }) => {
  const t = translations[lang];
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'unread'>('all');

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'critical') return n.severidad === 'critical';
    if (filter === 'warning') return n.severidad === 'warning';
    if (filter === 'unread') return !n.leida;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.leida).length;
  const criticalCount = notifications.filter((n) => n.severidad === 'critical').length;
  const warningCount = notifications.filter((n) => n.severidad === 'warning').length;

  const handleMarkAsRead = (id: string) => {
    CatalogInventoryService.markStockNotificationAsRead(id);
  };

  const handleMarkAllAsRead = () => {
    CatalogInventoryService.markAllStockNotificationsAsRead();
    sound.playSaleSuccess();
  };

  const handleDismiss = (id: string) => {
    CatalogInventoryService.dismissStockNotification(id);
  };

  const handleScanNow = () => {
    CatalogInventoryService.checkAndGenerateStockAlerts();
    sound.playBarcodeBeep();
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg animate-in fade-in slide-in-from-top-2">
      {/* Top Banner Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white font-mono font-bold text-[10px] rounded-full flex items-center justify-center ring-2 ring-slate-900">
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">
                {t.stockAlertsTitle}
              </h3>
              <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                Servicio de Inventario Activo
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Supervisión en tiempo real de productos que alcanzaron su umbral mínimo de existencias.
            </p>
          </div>
        </div>

        {/* Global Toolbar Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleScanNow}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 transition-colors"
            title="Escanear catálogo completo contra stock mínimo"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Escanear Ahora</span>
          </button>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t.markAllAsRead}</span>
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="px-4 sm:px-5 py-2.5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1.5">
          {[
            { id: 'all' as const, label: `Todas (${notifications.length})` },
            { id: 'critical' as const, label: `Críticas (${criticalCount})` },
            { id: 'warning' as const, label: `Stock Mínimo (${warningCount})` },
            { id: 'unread' as const, label: `No Leídas (${unreadCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                filter === tab.id
                  ? 'bg-slate-800 text-white font-bold border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <span className="text-[11px] font-mono text-slate-400 hidden md:block">
          {notifications.length} {t.activeAlertsCount}
        </span>
      </div>

      {/* Notifications List */}
      <div className="p-4 sm:p-5 max-h-[380px] overflow-y-auto space-y-3">
        {filteredNotifications.map((notif) => {
          const isCritical = notif.severidad === 'critical';
          const isOutOfStock = notif.tipo === 'STOCK_AGOTADO';
          const pctRemaining =
            notif.stock_minimo > 0
              ? Math.max(0, Math.min(100, Math.round((notif.stock_actual / notif.stock_minimo) * 100)))
              : 0;

          return (
            <div
              key={notif.id}
              className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                !notif.leida
                  ? isCritical
                    ? 'bg-rose-950/40 border-rose-800/80'
                    : 'bg-amber-950/40 border-amber-800/80'
                  : 'bg-slate-950/80 border-slate-800/80 opacity-80 hover:opacity-100'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                {/* Alert Badge & Product title */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      isOutOfStock
                        ? 'bg-rose-600/30 text-rose-300'
                        : isCritical
                        ? 'bg-rose-600/20 text-rose-400'
                        : 'bg-amber-600/20 text-amber-400'
                    }`}
                  >
                    {isOutOfStock ? (
                      <PackageX className="w-4 h-4" />
                    ) : isCritical ? (
                      <AlertOctagon className="w-4 h-4" />
                    ) : (
                      <AlertTriangle className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[11px] font-bold text-slate-400">
                        {notif.sku}
                      </span>
                      <span className="text-slate-600">·</span>
                      <span className="text-xs font-bold text-white truncate max-w-sm">
                        {notif.producto_nombre}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                          isOutOfStock
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : isCritical
                            ? 'bg-rose-950 text-rose-400'
                            : 'bg-amber-950 text-amber-300'
                        }`}
                      >
                        {isOutOfStock
                          ? 'AGOTADO'
                          : isCritical
                          ? 'QUIEBRE CRÍTICO'
                          : 'STOCK MÍNIMO'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {notif.mensaje}
                    </p>

                    {/* Stock status indicator bar */}
                    <div className="mt-2.5 flex items-center gap-3">
                      <div className="flex-1 max-w-xs">
                        <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                          <span>
                            Existencia: <strong className="text-white">{notif.stock_actual} {notif.unidad_medida}</strong>
                          </span>
                          <span>
                            Mínimo: <strong className="text-slate-200">{notif.stock_minimo} {notif.unidad_medida}</strong>
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isOutOfStock
                                ? 'bg-rose-600 w-0'
                                : isCritical
                                ? 'bg-rose-500'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${Math.max(5, pctRemaining)}%` }}
                          />
                        </div>
                      </div>

                      <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{notif.timestamp.substring(11, 19)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions cluster */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0 mt-2 sm:mt-0">
                  {/* Restock trigger button */}
                  <button
                    type="button"
                    onClick={() => onRestock(notif.producto_id, notif.sugerencia_reorden)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shadow-sm"
                    title={`Reabastecer con sugerencia de +${notif.sugerencia_reorden} ${notif.unidad_medida}`}
                  >
                    <ArrowDownRight className="w-3.5 h-3.5" />
                    <span>{t.restockAction} (+{notif.sugerencia_reorden})</span>
                  </button>

                  {!notif.leida && (
                    <button
                      type="button"
                      onClick={() => handleMarkAsRead(notif.id)}
                      className="p-1.5 text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-slate-800 transition-colors"
                      title={t.markAsRead}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDismiss(notif.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                    title={t.dismissAlert}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredNotifications.length === 0 && (
          <div className="py-10 text-center text-slate-500">
            <Sparkles className="w-8 h-8 mx-auto mb-2 text-emerald-400/60" />
            <p className="text-xs font-semibold text-slate-300">{t.noActiveAlerts}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{t.allOptimalStock}</p>
          </div>
        )}
      </div>
    </div>
  );
};
