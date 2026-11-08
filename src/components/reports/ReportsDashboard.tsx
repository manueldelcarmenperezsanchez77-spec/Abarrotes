import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Receipt,
  Download,
  AlertTriangle,
  RotateCw,
  PieChart,
  Clock,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';
import {
  ViewDailySalesSummary,
  ViewInventoryTurnover,
  ViewCategoryMargin,
  ViewStockAlert,
  Sale,
  KardexMovement,
} from '../../types/database';
import { Language, translations } from '../../i18n/translations';
import {
  AnalyticsReportingService,
  POSCheckoutService,
  CatalogInventoryService,
} from '../../services/microservices';
import {
  exportViewToPdf,
  exportViewToExcel,
  exportFullAccountingWorkbook,
} from '../../utils/reportExporter';
import { sound } from '../../utils/soundEffects';

interface ReportsDashboardProps {
  lang: Language;
}

export const ReportsDashboard: React.FC<ReportsDashboardProps> = ({ lang }) => {
  const t = translations[lang];
  const [activeViewTab, setActiveViewTab] = useState<
    'sales' | 'turnover' | 'margins' | 'alerts'
  >('sales');
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const dailySales: ViewDailySalesSummary[] = AnalyticsReportingService.getDailySalesSummary();
  const turnover: ViewInventoryTurnover[] = AnalyticsReportingService.getInventoryTurnover();
  const categoryMargins: ViewCategoryMargin[] = AnalyticsReportingService.getCategoryMargins();
  const stockAlerts: ViewStockAlert[] = AnalyticsReportingService.getStockAlerts();
  const allSales: Sale[] = POSCheckoutService.getSales();
  const kardex: KardexMovement[] = CatalogInventoryService.getKardex();

  // Aggregate KPIs
  const completedSales = allSales.filter((s) => s.estado === 'completada');
  const totalGrossRevenue = Math.round(
    completedSales.reduce((acc, s) => acc + s.total, 0) * 100
  ) / 100;

  let totalCost = 0;
  completedSales.forEach((s) => {
    s.items.forEach((i) => {
      totalCost += i.costo_unitario * i.cantidad;
    });
  });

  const totalGrossProfit = Math.round((totalGrossRevenue - totalCost) * 100) / 100;
  const overallMarginPct =
    totalGrossRevenue > 0
      ? Math.round((totalGrossProfit / totalGrossRevenue) * 100 * 10) / 10
      : 0;
  const avgTicket =
    completedSales.length > 0
      ? Math.round((totalGrossRevenue / completedSales.length) * 100) / 100
      : 0;

  const showNotification = (msg: string) => {
    setExportNotice(msg);
    sound.playSaleSuccess();
    setTimeout(() => setExportNotice(null), 3500);
  };

  // Prepare view data for exports
  const getViewData = () => {
    const fileTimestamp = new Date().toISOString().substring(0, 10).replace(/-/g, '');
    if (activeViewTab === 'sales') {
      return {
        title: 'Resumen de Ventas Diarias por Horario',
        viewId: 'vw_ventas_diarias_resumen',
        headers: [
          'Bloque Horario',
          'Tickets Cobrados',
          'Venta Bruta ($)',
          'Costo Mercancía ($)',
          'Utilidad Neta ($)',
          'Margen Promedio',
          'Ticket Promedio ($)',
        ],
        rows: dailySales.map((r) => [
          r.hora_bloque,
          r.total_ventas,
          `$${r.monto_bruto.toFixed(2)}`,
          `$${r.costo_total.toFixed(2)}`,
          `$${r.utilidad_neta.toFixed(2)}`,
          `${r.margen_promedio_pct}%`,
          `$${r.ticket_promedio.toFixed(2)}`,
        ]),
        rawRows: dailySales.map((r) => [
          r.hora_bloque,
          r.total_ventas,
          r.monto_bruto,
          r.costo_total,
          r.utilidad_neta,
          `${r.margen_promedio_pct}%`,
          r.ticket_promedio,
        ]),
        filename: `Reporte_Ventas_Diarias_${fileTimestamp}`,
        kpiSummary: {
          totalRevenue: totalGrossRevenue,
          totalProfit: totalGrossProfit,
          avgTicket,
          ticketsCount: completedSales.length,
        },
      };
    } else if (activeViewTab === 'turnover') {
      return {
        title: 'Rotación de Inventario y Clasificación ABC',
        viewId: 'vw_rotacion_inventario',
        headers: [
          'ID Producto',
          'Descripción Producto',
          'Categoría',
          'Stock Actual',
          'Ventas (30d)',
          'Clasificación ABC',
          'Días Inventario Estimados',
        ],
        rows: turnover.map((r) => [
          r.producto_id,
          r.producto_nombre,
          r.categoria,
          r.stock_actual,
          r.unidades_vendidas_30d,
          r.rotacion_clasificacion,
          r.dias_inventario_estimado > 365 ? '>365 d' : `${r.dias_inventario_estimado} d`,
        ]),
        rawRows: turnover.map((r) => [
          r.producto_id,
          r.producto_nombre,
          r.categoria,
          r.stock_actual,
          r.unidades_vendidas_30d,
          r.rotacion_clasificacion,
          r.dias_inventario_estimado > 365 ? 365 : r.dias_inventario_estimado,
        ]),
        filename: `Reporte_Rotacion_Inventario_${fileTimestamp}`,
      };
    } else if (activeViewTab === 'margins') {
      return {
        title: 'Análisis de Rentabilidad y Margen por Departamento',
        viewId: 'vw_analisis_utilidad_categoria',
        headers: [
          'Departamento / Categoría',
          'SKUs',
          'Valor Stock Costo ($)',
          'Valor Stock Venta ($)',
          'Margen Ponderado',
          'Ventas Acumuladas ($)',
          'Utilidad Acumulada ($)',
        ],
        rows: categoryMargins.map((r) => [
          r.categoria_nombre,
          r.total_productos,
          `$${r.stock_valorizado_costo.toFixed(2)}`,
          `$${r.stock_valorizado_venta.toFixed(2)}`,
          `${r.margen_ponderado_pct}%`,
          `$${r.ventas_totales_monto.toFixed(2)}`,
          `$${r.utilidad_acumulada.toFixed(2)}`,
        ]),
        rawRows: categoryMargins.map((r) => [
          r.categoria_nombre,
          r.total_productos,
          r.stock_valorizado_costo,
          r.stock_valorizado_venta,
          `${r.margen_ponderado_pct}%`,
          r.ventas_totales_monto,
          r.utilidad_acumulada,
        ]),
        filename: `Reporte_Margen_Departamentos_${fileTimestamp}`,
      };
    } else {
      return {
        title: 'Alertas de Reorden y Lotes Críticos',
        viewId: 'vw_alertas_reorden_caducidad',
        headers: [
          'SKU',
          'Producto',
          'Categoría',
          'Stock Actual',
          'Stock Mínimo',
          'Déficit a Reordenar',
          'Nivel de Riesgo',
          'Días para Caducidad',
        ],
        rows: stockAlerts.map((r) => [
          r.sku,
          r.producto_nombre,
          r.categoria_nombre,
          r.stock_actual,
          r.stock_minimo,
          `+${r.deficit}`,
          r.estado === 'CRITICO' ? 'CRÍTICO (URGENTE)' : 'STOCK BAJO',
          r.dias_para_caducidad_proxima !== undefined
            ? `${r.dias_para_caducidad_proxima} días`
            : 'Vigente',
        ]),
        rawRows: stockAlerts.map((r) => [
          r.sku,
          r.producto_nombre,
          r.categoria_nombre,
          r.stock_actual,
          r.stock_minimo,
          r.deficit,
          r.estado,
          r.dias_para_caducidad_proxima ?? 'Vigente',
        ]),
        filename: `Reporte_Alertas_Stock_${fileTimestamp}`,
      };
    }
  };

  // Export to PDF
  const handleExportPdf = () => {
    const data = getViewData();
    exportViewToPdf(
      data.title,
      data.viewId,
      data.headers,
      data.rows,
      data.filename,
      data.kpiSummary
    );
    showNotification(`PDF generado exitosamente: ${data.filename}.pdf`);
  };

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    const data = getViewData();
    exportViewToExcel(
      data.title,
      data.headers,
      data.rawRows,
      data.filename
    );
    showNotification(`Archivo Excel generado exitosamente: ${data.filename}.xlsx`);
  };

  // Export Full Accounting Workbook (.xlsx)
  const handleExportFullWorkbook = () => {
    exportFullAccountingWorkbook({
      dailySales,
      turnover,
      categoryMargins,
      stockAlerts,
      kardex,
    });
    showNotification(
      'Libro Contable Completo multi-hoja generado para despacho contable externo (.xlsx).'
    );
  };

  // Export CSV
  const handleExportCsv = () => {
    const data = getViewData();
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += data.headers.join(',') + '\n';
    data.rawRows.forEach((r) => {
      csvContent += r.map((c) => `"${c}"`).join(',') + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${data.filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification(`CSV generado exitosamente: ${data.filename}.csv`);
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6 overflow-y-auto">
      {/* Toast Notification */}
      {exportNotice && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-950 border border-emerald-500/80 text-emerald-200 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Header & Comprehensive Export Toolbar */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-white tracking-tight">{t.reportsTitle}</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">{t.reportsSubtitle}</p>
        </div>

        {/* Export Formats Cluster (PDF, Excel, Multi-sheet Workbook, CSV) */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* PDF Button */}
          <button
            type="button"
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-rose-950/70 text-rose-300 border border-rose-800 hover:bg-rose-900/70 transition-all shadow-xs"
            title="Descargar reporte en formato PDF listo para imprimir o enviar"
          >
            <FileText className="w-4 h-4 text-rose-400" />
            <span>PDF Contable</span>
          </button>

          {/* Excel Button */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-950/70 text-emerald-300 border border-emerald-800 hover:bg-emerald-900/70 transition-all shadow-xs"
            title="Descargar vista actual en formato Microsoft Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Excel (.xlsx)</span>
          </button>

          {/* Full Accounting Book (Multi-sheet) */}
          <button
            type="button"
            onClick={handleExportFullWorkbook}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-100 border border-slate-700 hover:bg-slate-700 transition-all shadow-xs"
            title="Genera un libro Excel con 5 hojas: Ventas Horarias, Rotación ABC, Márgenes, Alertas y Kardex completo"
          >
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span>Libro Completo Multi-Hoja</span>
          </button>

          {/* CSV Button */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-medium bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title="Descargar datos tabulares en formato CSV estándar"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* High-level KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono uppercase">{t.todayTotalSales}</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-400 mt-2">
            ${totalGrossRevenue.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-1">Ingreso neto acumulado</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono uppercase">{t.grossProfit}</span>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black font-mono text-blue-400 mt-2">
            ${totalGrossProfit.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-1">
            Margen neto ponderado: {overallMarginPct}%
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono uppercase">{t.averageTicket}</span>
            <Receipt className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black font-mono text-white mt-2">
            ${avgTicket.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-1">Por cliente atendido</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono uppercase">{t.totalTickets}</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black font-mono text-white mt-2">
            {completedSales.length}
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-1">Transacciones exitosas</div>
        </div>
      </div>

      {/* View Tabs Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="border-b border-slate-800 bg-slate-950/60 p-2 flex items-center gap-1.5 overflow-x-auto">
          {[
            {
              id: 'sales' as const,
              label: t.viewDailySales,
              desc: t.viewDailySalesDesc,
              icon: Clock,
            },
            {
              id: 'turnover' as const,
              label: t.viewTurnover,
              desc: t.viewTurnoverDesc,
              icon: RotateCw,
            },
            {
              id: 'margins' as const,
              label: t.viewMargins,
              desc: t.viewMarginsDesc,
              icon: PieChart,
            },
            {
              id: 'alerts' as const,
              label: t.viewAlerts,
              desc: t.viewAlertsDesc,
              icon: AlertTriangle,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeViewTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveViewTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-medium transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-slate-800 text-emerald-400 font-bold border border-slate-700 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* View 1: vw_ventas_diarias_resumen */}
        {activeViewTab === 'sales' && (
          <div className="p-4 overflow-x-auto">
            <div className="mb-3 text-xs text-slate-400 font-mono">
              SQL VIEW: <strong className="text-slate-200">vw_ventas_diarias_resumen</strong> — Agrupado por intervalo horario con índices en (created_at, estado).
            </div>
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase bg-slate-950/40">
                  <th className="py-2.5 px-3">Bloque Horario</th>
                  <th className="py-2.5 px-3 text-center">Tickets Cobrados</th>
                  <th className="py-2.5 px-3 text-right">Venta Bruta ($)</th>
                  <th className="py-2.5 px-3 text-right">Costo Mercancía ($)</th>
                  <th className="py-2.5 px-3 text-right">Utilidad Neta ($)</th>
                  <th className="py-2.5 px-3 text-right">Margen Promedio</th>
                  <th className="py-2.5 px-3 text-right">Ticket Promedio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {dailySales.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-200">
                      {r.hora_bloque}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono">{r.total_ventas}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-emerald-400">
                      ${r.monto_bruto.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-400">
                      ${r.costo_total.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-blue-400">
                      ${r.utilidad_neta.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-300">
                      {r.margen_promedio_pct}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-200">
                      ${r.ticket_promedio.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* View 2: vw_rotacion_inventario */}
        {activeViewTab === 'turnover' && (
          <div className="p-4 overflow-x-auto">
            <div className="mb-3 text-xs text-slate-400 font-mono">
              SQL VIEW: <strong className="text-slate-200">vw_rotacion_inventario</strong> — Clasificación ABC por velocidad de salida y cálculo de días de inventario disponible.
            </div>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase bg-slate-950/40">
                  <th className="py-2.5 px-3">Producto</th>
                  <th className="py-2.5 px-3">Categoría</th>
                  <th className="py-2.5 px-3 text-right">Stock Actual</th>
                  <th className="py-2.5 px-3 text-right">Vendido (30d)</th>
                  <th className="py-2.5 px-3 text-center">Clasificación ABC</th>
                  <th className="py-2.5 px-3 text-right">Días Inventario Estimados</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {turnover.map((r) => (
                  <tr key={r.producto_id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-semibold text-slate-200 max-w-xs truncate">
                      {r.producto_nombre}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">{r.categoria}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-white">
                      {r.stock_actual}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-emerald-400">
                      {r.unidades_vendidas_30d}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono">
                      {r.rotacion_clasificacion === 'ALTA' ? (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded">
                          TIPO A · ALTA ROTACIÓN
                        </span>
                      ) : r.rotacion_clasificacion === 'MEDIA' ? (
                        <span className="text-[10px] font-bold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded">
                          TIPO B · ROTACIÓN MEDIA
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                          TIPO C · BAJA ROTACIÓN
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-300">
                      {r.dias_inventario_estimado > 365 ? '>365 d' : `${r.dias_inventario_estimado} d`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* View 3: vw_analisis_utilidad_categoria */}
        {activeViewTab === 'margins' && (
          <div className="p-4 overflow-x-auto">
            <div className="mb-3 text-xs text-slate-400 font-mono">
              SQL VIEW: <strong className="text-slate-200">vw_analisis_utilidad_categoria</strong> — Valorización de existencias a costo vs precio de venta y margen por departamento.
            </div>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase bg-slate-950/40">
                  <th className="py-2.5 px-3">Departamento / Categoría</th>
                  <th className="py-2.5 px-3 text-center">SKUs</th>
                  <th className="py-2.5 px-3 text-right">Valor en Stock (Costo)</th>
                  <th className="py-2.5 px-3 text-right">Valor en Stock (Venta)</th>
                  <th className="py-2.5 px-3 text-right">Margen Ponderado</th>
                  <th className="py-2.5 px-3 text-right">Ventas Acumuladas</th>
                  <th className="py-2.5 px-3 text-right">Utilidad Aportada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {categoryMargins.map((r) => (
                  <tr key={r.categoria_id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-semibold text-slate-200">
                      {r.categoria_nombre}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono">{r.total_productos}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-400">
                      ${r.stock_valorizado_costo.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-200">
                      ${r.stock_valorizado_venta.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-emerald-400">
                      {r.margen_ponderado_pct}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-white">
                      ${r.ventas_totales_monto.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-blue-400">
                      ${r.utilidad_acumulada.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* View 4: vw_alertas_reorden_caducidad */}
        {activeViewTab === 'alerts' && (
          <div className="p-4 overflow-x-auto">
            <div className="mb-3 text-xs text-slate-400 font-mono">
              SQL VIEW: <strong className="text-slate-200">vw_alertas_reorden_caducidad</strong> — Identificación temprana de quiebres de inventario y lotes críticos.
            </div>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase bg-slate-950/40">
                  <th className="py-2.5 px-3">SKU</th>
                  <th className="py-2.5 px-3">Producto</th>
                  <th className="py-2.5 px-3">Categoría</th>
                  <th className="py-2.5 px-3 text-right">Stock Actual</th>
                  <th className="py-2.5 px-3 text-right">Stock Mínimo</th>
                  <th className="py-2.5 px-3 text-right">Déficit a Reordenar</th>
                  <th className="py-2.5 px-3 text-center">Nivel de Riesgo</th>
                  <th className="py-2.5 px-3 text-right">Días para Caducidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {stockAlerts.map((r) => (
                  <tr key={r.producto_id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-mono text-slate-400 font-bold">{r.sku}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-200">{r.producto_nombre}</td>
                    <td className="py-2.5 px-3 text-slate-400">{r.categoria_nombre}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-extrabold text-rose-400">
                      {r.stock_actual}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-300">
                      {r.stock_minimo}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-amber-400">
                      +{r.deficit}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono">
                      {r.estado === 'CRITICO' ? (
                        <span className="text-[10px] font-bold text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800">
                          CRÍTICO (URGENTE)
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800">
                          STOCK BAJO
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-300">
                      {r.dias_para_caducidad_proxima !== undefined
                        ? `${r.dias_para_caducidad_proxima} días`
                        : 'Lote Vigente'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {stockAlerts.length === 0 && (
              <div className="py-12 text-center text-slate-500 text-xs">
                No hay productos en riesgo de desabastecimiento. Todos los niveles están óptimos.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
