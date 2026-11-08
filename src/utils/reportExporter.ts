import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ViewDailySalesSummary,
  ViewInventoryTurnover,
  ViewCategoryMargin,
  ViewStockAlert,
  KardexMovement,
} from '../types/database';

const STORE_HEADER = {
  name: 'Abarrotes & Mini Súper La Providencia',
  rfc: 'RFC: PROA850412-K71 · Régimen Simplificado de Confianza',
  address: 'Av. Hidalgo 142, Col. Centro · Tel: (55) 5432-8900',
};

/**
 * Export a single active view to Excel (.xlsx)
 */
export function exportViewToExcel(
  title: string,
  headers: string[],
  rows: (string | number)[][],
  filename: string
) {
  const wb = XLSX.utils.book_new();

  // Header metadata block
  const dateStr = new Date().toLocaleString('es-MX');
  const wsData: (string | number)[][] = [
    [STORE_HEADER.name],
    [STORE_HEADER.rfc],
    [`REPORTE CONTABLE: ${title.toUpperCase()}`],
    [`FECHA Y HORA DE GENERACIÓN: ${dateStr}`],
    [`MONEDA: PESOS MEXICANOS (MXN)`],
    [], // Blank row
    headers,
    ...rows,
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths dynamically
  const colWidths = headers.map((h, i) => {
    let maxLen = h.length;
    rows.forEach((row) => {
      const cellVal = String(row[i] ?? '');
      if (cellVal.length > maxLen) maxLen = cellVal.length;
    });
    return { wch: Math.min(maxLen + 4, 38) };
  });
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, title.substring(0, 30));
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

/**
 * Export full multi-sheet Accounting Workbook (.xlsx)
 * Designed specifically for external accounting firms / despachos contables
 */
export function exportFullAccountingWorkbook(data: {
  dailySales: ViewDailySalesSummary[];
  turnover: ViewInventoryTurnover[];
  categoryMargins: ViewCategoryMargin[];
  stockAlerts: ViewStockAlert[];
  kardex: KardexMovement[];
}) {
  const wb = XLSX.utils.book_new();
  const dateStr = new Date().toLocaleString('es-MX');

  // Sheet 1: Ventas Diarias Resumen
  const s1Headers = [
    'Bloque Horario',
    'Total Ventas',
    'Venta Bruta ($)',
    'Costo Mercancía ($)',
    'Utilidad Neta ($)',
    'Margen Promedio (%)',
    'Ticket Promedio ($)',
  ];
  const s1Rows = data.dailySales.map((r) => [
    r.hora_bloque,
    r.total_ventas,
    r.monto_bruto,
    r.costo_total,
    r.utilidad_neta,
    `${r.margen_promedio_pct}%`,
    r.ticket_promedio,
  ]);
  const ws1 = XLSX.utils.aoa_to_sheet([
    [STORE_HEADER.name],
    [`LIBRO DE VENTAS POR INTERVALO HORARIO - ${dateStr}`],
    [],
    s1Headers,
    ...s1Rows,
  ]);
  ws1['!cols'] = s1Headers.map((h) => ({ wch: h.length + 5 }));
  XLSX.utils.book_append_sheet(wb, ws1, 'Ventas_Horarias');

  // Sheet 2: Rotación de Inventario ABC
  const s2Headers = [
    'ID Producto',
    'Descripción del Producto',
    'Categoría',
    'Stock Actual',
    'Unidades Vendidas (30d)',
    'Clasificación ABC',
    'Días Inventario Estimados',
  ];
  const s2Rows = data.turnover.map((r) => [
    r.producto_id,
    r.producto_nombre,
    r.categoria,
    r.stock_actual,
    r.unidades_vendidas_30d,
    r.rotacion_clasificacion,
    r.dias_inventario_estimado > 365 ? 365 : r.dias_inventario_estimado,
  ]);
  const ws2 = XLSX.utils.aoa_to_sheet([
    [STORE_HEADER.name],
    [`ANALISIS DE ROTACION Y METRICAS ABC - ${dateStr}`],
    [],
    s2Headers,
    ...s2Rows,
  ]);
  ws2['!cols'] = s2Headers.map((h) => ({ wch: Math.max(h.length + 3, 16) }));
  XLSX.utils.book_append_sheet(wb, ws2, 'Rotacion_ABC');

  // Sheet 3: Rentabilidad por Departamento
  const s3Headers = [
    'ID Categoría',
    'Departamento / Categoría',
    'Cant. SKUs',
    'Valor Stock Costo ($)',
    'Valor Stock Venta ($)',
    'Margen Ponderado (%)',
    'Ventas Acumuladas ($)',
    'Utilidad Acumulada ($)',
  ];
  const s3Rows = data.categoryMargins.map((r) => [
    r.categoria_id,
    r.categoria_nombre,
    r.total_productos,
    r.stock_valorizado_costo,
    r.stock_valorizado_venta,
    `${r.margen_ponderado_pct}%`,
    r.ventas_totales_monto,
    r.utilidad_acumulada,
  ]);
  const ws3 = XLSX.utils.aoa_to_sheet([
    [STORE_HEADER.name],
    [`VALUACION DE INVENTARIOS Y MARGENES POR DEPARTAMENTO - ${dateStr}`],
    [],
    s3Headers,
    ...s3Rows,
  ]);
  ws3['!cols'] = s3Headers.map((h) => ({ wch: Math.max(h.length + 4, 18) }));
  XLSX.utils.book_append_sheet(wb, ws3, 'Margenes_Depto');

  // Sheet 4: Alertas de Stock y Caducidad
  const s4Headers = [
    'SKU',
    'Producto',
    'Categoría',
    'Stock Actual',
    'Stock Mínimo',
    'Déficit a Reordenar',
    'Nivel Riesgo',
    'Días para Caducidad',
  ];
  const s4Rows = data.stockAlerts.map((r) => [
    r.sku,
    r.producto_nombre,
    r.categoria_nombre,
    r.stock_actual,
    r.stock_minimo,
    r.deficit,
    r.estado,
    r.dias_para_caducidad_proxima ?? 'Vigente',
  ]);
  const ws4 = XLSX.utils.aoa_to_sheet([
    [STORE_HEADER.name],
    [`ALERTAS DE REORDEN Y CONTROL DE MERMAS - ${dateStr}`],
    [],
    s4Headers,
    ...s4Rows,
  ]);
  ws4['!cols'] = s4Headers.map((h) => ({ wch: Math.max(h.length + 4, 18) }));
  XLSX.utils.book_append_sheet(wb, ws4, 'Alertas_Reorden');

  // Sheet 5: Kardex Auditoría Contable
  const s5Headers = [
    'Timestamp',
    'Tipo Movimiento',
    'Producto',
    'Cantidad',
    'Stock Ant.',
    'Stock Post.',
    'Costo Unitario ($)',
    'Referencia / Folio',
    'Usuario Responsable',
    'Motivo',
  ];
  const s5Rows = data.kardex.map((k) => [
    k.timestamp,
    k.tipo,
    k.producto_nombre || k.producto_id,
    k.cantidad,
    k.stock_anterior,
    k.stock_nuevo,
    k.costo_unitario,
    k.referencia_id,
    k.usuario_nombre || k.usuario_id,
    k.motivo,
  ]);
  const ws5 = XLSX.utils.aoa_to_sheet([
    [STORE_HEADER.name],
    [`LIBRO MAYOR DE AUDITORIA KARDEX - ${dateStr}`],
    [],
    s5Headers,
    ...s5Rows,
  ]);
  ws5['!cols'] = s5Headers.map((h) => ({ wch: Math.max(h.length + 4, 18) }));
  XLSX.utils.book_append_sheet(wb, ws5, 'Kardex_Auditoria');

  const fileDate = new Date().toISOString().substring(0, 10).replace(/-/g, '');
  XLSX.writeFile(wb, `AbarrotesPro_Contabilidad_Completa_${fileDate}.xlsx`);
}

/**
 * Export a report to a professionally styled PDF document
 */
export function exportViewToPdf(
  title: string,
  viewIdentifier: string,
  headers: string[],
  rows: (string | number)[][],
  filename: string,
  kpiSummary?: {
    totalRevenue?: number;
    totalProfit?: number;
    avgTicket?: number;
    ticketsCount?: number;
  }
) {
  // Use landscape for wide data tables if columns > 6, portrait otherwise
  const isLandscape = headers.length > 5;
  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const dateStr = new Date().toLocaleString('es-MX');

  // Header background banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 26, 'F');

  // Title in header
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(STORE_HEADER.name, 14, 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`${STORE_HEADER.rfc} · ${STORE_HEADER.address}`, 14, 16);
  doc.text(`Motor de BD: PostgreSQL Relacional 3NF · Moneda: Pesos Mexicanos (MXN)`, 14, 21);

  // Subheader title & metadata
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(`REPORTE CONTABLE: ${title.toUpperCase()}`, 14, 34);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`VISTA SQL: ${viewIdentifier} · FECHA DE EMISIÓN: ${dateStr}`, 14, 39);

  let startTableY = 44;

  // Render KPI boxes if provided
  if (kpiSummary && kpiSummary.totalRevenue !== undefined) {
    const cardWidth = (pageWidth - 28 - 9) / 4;
    const cardHeight = 15;
    const kpis = [
      { label: 'VENTA TOTAL', val: `$${kpiSummary.totalRevenue.toFixed(2)}` },
      { label: 'UTILIDAD NETA', val: `$${(kpiSummary.totalProfit ?? 0).toFixed(2)}` },
      { label: 'TICKET PROMEDIO', val: `$${(kpiSummary.avgTicket ?? 0).toFixed(2)}` },
      { label: 'TICKETS REGISTRADOS', val: String(kpiSummary.ticketsCount ?? 0) },
    ];

    kpis.forEach((kpi, idx) => {
      const x = 14 + idx * (cardWidth + 3);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(x, 43, cardWidth, cardHeight, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(kpi.label, x + 3, 48);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(5, 150, 105); // emerald-600
      doc.text(kpi.val, x + 3, 54);
    });

    startTableY = 64;
  }

  // Data Table with autoTable
  autoTable(doc, {
    startY: startTableY,
    head: [headers],
    body: rows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2.2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [248, 250, 252],
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14, bottom: 20 },
    didDrawPage: (data) => {
      // Footer page numbering and accountant signature notice
      const str = `Página ${data.pageNumber} de ${doc.getNumberOfPages()}`;
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(str, pageWidth - 14, doc.internal.pageSize.getHeight() - 8, {
        align: 'right',
      });
      doc.text(
        'Documento emitido por AbarrotesPro POS & ERP Engine para efectos de auditoría y contabilidad externa.',
        14,
        doc.internal.pageSize.getHeight() - 8
      );
    },
  });

  doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}
