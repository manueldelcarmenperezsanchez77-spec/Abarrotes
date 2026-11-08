import { db } from './dbEngine';
import {
  User,
  Product,
  Category,
  Sale,
  PaymentMethod,
  CashCutRecord,
  DenominationBreakdown,
  KardexMovement,
  ViewDailySalesSummary,
  ViewInventoryTurnover,
  ViewCategoryMargin,
  ViewStockAlert,
  StoredProcedureResult,
} from '../types/database';

/**
 * Microservice 1: AuthService (Identity, Access & RBAC)
 */
export const AuthService = {
  getCurrentUser: (): User => db.getActiveUser(),
  getUsers: (): User[] => db.getUsers(),
  switchUser: (userId: string): void => db.setActiveUser(userId),
  verifyPin: (userId: string, pin: string): boolean => {
    const user = db.getUsers().find((u) => u.id === userId);
    return user ? user.pin === pin : false;
  },
  hasPermission: (user: User, action: 'SALE' | 'INVENTORY_WRITE' | 'CASH_CUT' | 'VIEW_REPORTS' | 'DB_ARCHITECT'): boolean => {
    if (user.rol === 'admin') return true;
    if (user.rol === 'cajero') {
      return action === 'SALE' || action === 'CASH_CUT';
    }
    if (user.rol === 'almacen') {
      return action === 'INVENTORY_WRITE' || action === 'VIEW_REPORTS';
    }
    return false;
  },
};

/**
 * Microservice 2: Catalog & Inventory Service
 */
export const CatalogInventoryService = {
  getCategories: (): Category[] => db.getCategories(),
  getProducts: (): Product[] => db.getProducts(),
  getProductByBarcode: (barcode: string): Product | undefined => db.getProductByBarcode(barcode),
  getProductById: (id: string): Product | undefined => db.getProductById(id),
  saveProduct: (prod: Partial<Product> & { nombre: string; precio_venta: number }): Product =>
    db.saveProduct(prod),
  executeStockEntry: (params: {
    proveedor_nombre: string;
    factura_ref: string;
    usuario_id: string;
    items: {
      producto_id: string;
      cantidad: number;
      costo_unitario: number;
      nuevo_precio_venta?: number;
      lote?: string;
      fecha_caducidad?: string;
    }[];
  }): StoredProcedureResult<{ totalEntradas: number }> => db.sp_entrada_mercancia(params),
  executeStockExit: (params: {
    producto_id: string;
    cantidad: number;
    tipo_merma: 'MERMA_CADUCIDAD' | 'MERMA_DANADO' | 'MERMA_ROBO' | 'AJUSTE_INVENTARIO';
    motivo: string;
    usuario_id: string;
  }): StoredProcedureResult<{ nuevoStock: number }> => db.sp_salida_merma(params),
  getKardex: (): KardexMovement[] => db.getKardex(),
};

/**
 * Microservice 3: POS & Checkout Service
 */
export const POSCheckoutService = {
  executeSale: (params: {
    caja_sesion_id: string;
    cajero_id: string;
    cliente_nombre: string;
    cliente_fiado_id?: string;
    tipo_pago: PaymentMethod;
    monto_pagado: number;
    items: {
      producto_id: string;
      cantidad: number;
    }[];
  }): StoredProcedureResult<Sale> => db.sp_realizar_venta(params),
  getSales: (): Sale[] => db.getSales(),
  getClientsFiado: () => db.getClientsFiado(),
};

/**
 * Microservice 4: Cash Register Ledger Service
 */
export const CashRegisterService = {
  getActiveSession: () => db.getActiveSession(),
  openSession: (params: { cajero_id: string; monto_inicial: number; notas?: string }) =>
    db.abrirCaja(params),
  recordCashMovement: (params: {
    caja_sesion_id: string;
    tipo: 'ingreso' | 'retiro_sangria' | 'pago_proveedor';
    monto: number;
    motivo: string;
    usuario_id: string;
  }) => db.sp_movimiento_caja(params),
  getCashMovements: (sessionId?: string) => db.getCashMovements(sessionId),
  executeCorteX: (params: {
    caja_sesion_id: string;
    cajero_id: string;
    desglose: DenominationBreakdown;
  }): StoredProcedureResult<CashCutRecord> => db.sp_corte_caja_x(params),
  executeCorteZ: (params: {
    caja_sesion_id: string;
    cajero_id: string;
    desglose: DenominationBreakdown;
    notas?: string;
  }): StoredProcedureResult<CashCutRecord> => db.sp_corte_caja_z(params),
  getCashCuts: (): CashCutRecord[] => db.getCashCuts(),
};

/**
 * Microservice 5: Analytics & Reporting Service
 */
export const AnalyticsReportingService = {
  getDailySalesSummary: (): ViewDailySalesSummary[] => db.getViewDailySalesSummary(),
  getInventoryTurnover: (): ViewInventoryTurnover[] => db.getViewInventoryTurnover(),
  getCategoryMargins: (): ViewCategoryMargin[] => db.getViewCategoryMargins(),
  getStockAlerts: (): ViewStockAlert[] => db.getViewStockAlerts(),
};

/**
 * Microservice 6: Database Engine Coordinator & Meta-Inspector
 */
export const DatabaseCoordinator = {
  resetDatabase: () => db.resetToFactory(),
  subscribe: (cb: () => void) => db.subscribe(cb),
};
