export type UserRole = 'admin' | 'cajero' | 'almacen';

export interface User {
  id: string;
  username: string;
  nombre: string;
  rol: UserRole;
  pin: string; // 4-digit PIN for rapid POS login
  activo: boolean;
  ultimo_acceso?: string;
}

export type UnitOfMeasure = 'pza' | 'kg' | 'lt' | 'paq' | 'reja';

export interface Category {
  id: string;
  codigo: string;
  nombre: string;
  icono: string;
  descripcion: string;
  activo: boolean;
}

export interface Product {
  id: string;
  sku: string;
  codigo_barras: string;
  nombre: string;
  categoria_id: string;
  unidad_medida: UnitOfMeasure;
  precio_costo: number;
  precio_venta: number;
  margen_pct: number;
  stock_actual: number;
  stock_minimo: number;
  permite_fraccion: boolean; // para productos a granel como huevo o jamón
  es_favorito: boolean;
  ubicacion_pasillo: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface BatchLot {
  id: string;
  producto_id: string;
  numero_lote: string;
  fecha_caducidad: string;
  cantidad_inicial: number;
  cantidad_actual: number;
  estado: 'vigente' | 'proximo' | 'vencido';
}

export type MovementType =
  | 'ENTRADA_COMPRA'
  | 'SALIDA_VENTA'
  | 'MERMA_CADUCIDAD'
  | 'MERMA_DANADO'
  | 'MERMA_ROBO'
  | 'AJUSTE_INVENTARIO'
  | 'DEVOLUCION';

export interface KardexMovement {
  id: string;
  producto_id: string;
  producto_nombre?: string;
  tipo: MovementType;
  cantidad: number;
  stock_anterior: number;
  stock_nuevo: number;
  costo_unitario: number;
  precio_unitario?: number;
  referencia_id: string; // Folio de venta, orden de compra o folio de merma
  usuario_id: string;
  usuario_nombre?: string;
  motivo: string;
  timestamp: string;
}

export type CashRegisterStatus = 'abierta' | 'corte_x' | 'cerrada_z';

export interface CashRegisterSession {
  id: string;
  cajero_id: string;
  cajero_nombre: string;
  fecha_apertura: string;
  monto_inicial: number; // Fondo de caja
  fecha_cierre?: string;
  monto_cierre_esperado?: number;
  monto_cierre_real?: number;
  diferencia?: number;
  estado: CashRegisterStatus;
  notas?: string;
}

export type CashMovementType = 'ingreso' | 'retiro_sangria' | 'pago_proveedor';

export interface CashMovement {
  id: string;
  caja_sesion_id: string;
  tipo: CashMovementType;
  monto: number;
  motivo: string;
  usuario_id: string;
  usuario_nombre: string;
  timestamp: string;
}

export type PaymentMethod = 'efectivo' | 'tarjeta' | 'transferencia' | 'fiado';

export interface SaleItem {
  producto_id: string;
  producto_nombre: string;
  codigo_barras: string;
  unidad_medida: UnitOfMeasure;
  cantidad: number;
  precio_unitario: number;
  costo_unitario: number;
  subtotal: number;
  utilidad_bruta: number;
}

export interface Sale {
  id: string;
  folio_ticket: string;
  caja_sesion_id: string;
  cajero_id: string;
  cajero_nombre: string;
  cliente_nombre: string;
  tipo_pago: PaymentMethod;
  subtotal: number;
  descuento: number;
  iva: number;
  total: number;
  monto_pagado: number;
  cambio: number;
  items: SaleItem[];
  estado: 'completada' | 'cancelada';
  created_at: string;
}

export interface DenominationBreakdown {
  b1000: number;
  b500: number;
  b200: number;
  b100: number;
  b50: number;
  b20: number;
  m20: number;
  m10: number;
  m5: number;
  m2: number;
  m1: number;
  m05: number;
}

export interface CashCutRecord {
  id: string;
  caja_sesion_id: string;
  tipo_corte: 'X' | 'Z';
  folio: string;
  fecha_hora: string;
  cajero_id: string;
  cajero_nombre: string;
  fondo_fijo: number;
  ventas_efectivo: number;
  ventas_tarjeta: number;
  ventas_transferencia: number;
  ventas_fiado: number;
  total_ventas: number;
  ingresos_extra: number;
  retiros_sangria: number;
  efectivo_teorico: number;
  efectivo_contado: number;
  diferencia: number; // positivo = sobrante, negativo = faltante
  desglose: DenominationBreakdown;
  cantidad_tickets: number;
  ticket_promedio: number;
  notas?: string;
}

export interface ClientFiado {
  id: string;
  nombre: string;
  apodo: string;
  telefono: string;
  limite_credito: number;
  saldo_deudor: number;
  activo: boolean;
  notas: string;
}

// Transaction simulation log for Stored Procedure execution
export interface TransactionStepLog {
  step: number;
  operation: string;
  sql_statement: string;
  status: 'SUCCESS' | 'WARNING' | 'ROLLBACK';
  details: string;
  timestamp: string;
}

export interface StoredProcedureResult<T = unknown> {
  success: boolean;
  message: string;
  errorCode?: string;
  executionTimeMs: number;
  transactionLogs: TransactionStepLog[];
  data?: T;
}

// Optimized Database Views Return Types
export interface ViewDailySalesSummary {
  hora_bloque: string;
  total_ventas: number;
  monto_bruto: number;
  costo_total: number;
  utilidad_neta: number;
  margen_promedio_pct: number;
  ticket_promedio: number;
}

export interface ViewInventoryTurnover {
  producto_id: string;
  producto_nombre: string;
  categoria: string;
  stock_actual: number;
  unidades_vendidas_30d: number;
  rotacion_clasificacion: 'ALTA' | 'MEDIA' | 'BAJA' | 'SIN_ROTACION';
  dias_inventario_estimado: number;
}

export interface ViewCategoryMargin {
  categoria_id: string;
  categoria_nombre: string;
  total_productos: number;
  stock_valorizado_costo: number;
  stock_valorizado_venta: number;
  margen_ponderado_pct: number;
  ventas_totales_monto: number;
  utilidad_acumulada: number;
}

export interface ViewStockAlert {
  producto_id: string;
  sku: string;
  producto_nombre: string;
  categoria_nombre: string;
  stock_actual: number;
  stock_minimo: number;
  deficit: number;
  estado: 'CRITICO' | 'BAJO' | 'OPTIMO';
  dias_para_caducidad_proxima?: number;
}
