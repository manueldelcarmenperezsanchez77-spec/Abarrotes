import {
  User,
  Category,
  Product,
  BatchLot,
  KardexMovement,
  CashRegisterSession,
  CashMovement,
  Sale,
  SaleItem,
  CashCutRecord,
  ClientFiado,
  DenominationBreakdown,
  PaymentMethod,
  StoredProcedureResult,
  TransactionStepLog,
  ViewDailySalesSummary,
  ViewInventoryTurnover,
  ViewCategoryMargin,
  ViewStockAlert,
} from '../types/database';
import {
  INITIAL_USERS,
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_BATCHES,
  INITIAL_REGISTER_SESSION,
  INITIAL_KARDEX,
  INITIAL_SALES,
  INITIAL_CLIENTS_FIADO,
} from '../data/seedData';

const DB_STORAGE_KEY = 'abarrotes_pos_db_v1';

interface DBState {
  users: User[];
  categories: Category[];
  products: Product[];
  batches: BatchLot[];
  registerSessions: CashRegisterSession[];
  cashMovements: CashMovement[];
  sales: Sale[];
  kardex: KardexMovement[];
  cashCuts: CashCutRecord[];
  clientsFiado: ClientFiado[];
  activeSessionId: string;
  activeUserId: string;
}

class RelationalDatabaseEngine {
  private state: DBState;
  private subscribers: Array<() => void> = [];

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): DBState {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(DB_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.products && parsed.products.length > 0) {
            return parsed;
          }
        }
      } catch {
        // Fallback to initial seeds
      }
    }
    return {
      users: INITIAL_USERS,
      categories: INITIAL_CATEGORIES,
      products: INITIAL_PRODUCTS,
      batches: INITIAL_BATCHES,
      registerSessions: [INITIAL_REGISTER_SESSION],
      cashMovements: [],
      sales: INITIAL_SALES,
      kardex: INITIAL_KARDEX,
      cashCuts: [],
      clientsFiado: INITIAL_CLIENTS_FIADO,
      activeSessionId: INITIAL_REGISTER_SESSION.id,
      activeUserId: INITIAL_USERS[1].id, // Rosa Hernández (Cajero)
    };
  }

  private persist() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(this.state));
      } catch {
        // Storage quota or privacy mode handling
      }
    }
    this.notify();
  }

  public subscribe(cb: () => void): () => void {
    this.subscribers.push(cb);
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== cb);
    };
  }

  private notify() {
    this.subscribers.forEach((cb) => {
      try {
        cb();
      } catch {
        // subscriber error safe guard
      }
    });
  }

  public resetToFactory() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(DB_STORAGE_KEY);
    }
    this.state = {
      users: INITIAL_USERS,
      categories: INITIAL_CATEGORIES,
      products: INITIAL_PRODUCTS,
      batches: INITIAL_BATCHES,
      registerSessions: [INITIAL_REGISTER_SESSION],
      cashMovements: [],
      sales: INITIAL_SALES,
      kardex: INITIAL_KARDEX,
      cashCuts: [],
      clientsFiado: INITIAL_CLIENTS_FIADO,
      activeSessionId: INITIAL_REGISTER_SESSION.id,
      activeUserId: INITIAL_USERS[1].id,
    };
    this.persist();
  }

  // Getters
  public getUsers(): User[] {
    return [...this.state.users];
  }

  public getActiveUser(): User {
    const user = this.state.users.find((u) => u.id === this.state.activeUserId);
    return user || this.state.users[0];
  }

  public setActiveUser(userId: string) {
    this.state.activeUserId = userId;
    this.persist();
  }

  public getCategories(): Category[] {
    return [...this.state.categories];
  }

  public getProducts(): Product[] {
    return [...this.state.products];
  }

  public getProductById(id: string): Product | undefined {
    return this.state.products.find((p) => p.id === id);
  }

  public getProductByBarcode(barcode: string): Product | undefined {
    const clean = barcode.trim();
    return this.state.products.find(
      (p) => p.codigo_barras === clean || p.sku.toLowerCase() === clean.toLowerCase()
    );
  }

  public getActiveSession(): CashRegisterSession | undefined {
    return this.state.registerSessions.find((s) => s.id === this.state.activeSessionId);
  }

  public getRegisterSessions(): CashRegisterSession[] {
    return [...this.state.registerSessions];
  }

  public getCashMovements(sessionId?: string): CashMovement[] {
    if (sessionId) {
      return this.state.cashMovements.filter((m) => m.caja_sesion_id === sessionId);
    }
    return [...this.state.cashMovements];
  }

  public getSales(): Sale[] {
    return [...this.state.sales];
  }

  public getKardex(): KardexMovement[] {
    return [...this.state.kardex];
  }

  public getCashCuts(): CashCutRecord[] {
    return [...this.state.cashCuts];
  }

  public getClientsFiado(): ClientFiado[] {
    return [...this.state.clientsFiado];
  }

  public getBatches(): BatchLot[] {
    return [...this.state.batches];
  }

  // =========================================================================
  // STORED PROCEDURES (ACID TRANSACTION COORDINATION)
  // =========================================================================

  /**
   * Stored Procedure: sp_realizar_venta
   * Atomically executes a checkout transaction:
   * 1. Validates cash register session status (must be OPEN)
   * 2. Checks inventory constraints (stock >= requested qty)
   * 3. Locks rows and computes totals with referential integrity
   * 4. Deducts stock & writes to Kardex (movimientos_inventario)
   * 5. Inserts sale header & details
   * 6. If payment is 'fiado', updates client ledger
   * 7. Commits or rolls back on constraint violation
   */
  public sp_realizar_venta(params: {
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
  }): StoredProcedureResult<Sale> {
    const startTime = performance.now();
    const logs: TransactionStepLog[] = [];
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // STEP 1: BEGIN TRANSACTION
    logs.push({
      step: 1,
      operation: 'TRANSACTION_START',
      sql_statement: 'BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;',
      status: 'SUCCESS',
      details: 'Started transaction isolation. Acquired read lock on register session.',
      timestamp,
    });

    // STEP 2: VERIFY REGISTER STATUS
    const session = this.state.registerSessions.find((s) => s.id === params.caja_sesion_id);
    if (!session || session.estado !== 'abierta') {
      logs.push({
        step: 2,
        operation: 'FOREIGN_KEY_CONSTRAINT_CHECK',
        sql_statement: `SELECT estado FROM cajas_sesion WHERE id = '${params.caja_sesion_id}';`,
        status: 'ROLLBACK',
        details: `CONSTRAINT VIOLATION: Cash register session is ${session ? session.estado : 'NOT_FOUND'}. Only 'abierta' sessions accept sales.`,
        timestamp,
      });
      return {
        success: false,
        message: 'Error de integridad referencial: La caja de venta no está abierta.',
        errorCode: 'ERR_REGISTER_CLOSED',
        executionTimeMs: Math.round(performance.now() - startTime),
        transactionLogs: logs,
      };
    }
    logs.push({
      step: 2,
      operation: 'CHECK_REGISTER_STATE',
      sql_statement: `SELECT * FROM cajas_sesion WHERE id = '${session.id}' AND estado = 'abierta';`,
      status: 'SUCCESS',
      details: `Cash register session verified [${session.id}] open under cashier [${session.cajero_nombre}].`,
      timestamp,
    });

    // STEP 3: STOCK AVAILABILITY CHECK & EXCLUSIVE ROW LOCKING
    const verifiedSaleItems: SaleItem[] = [];
    let subtotalCalculated = 0;
    let totalGrossProfit = 0;

    for (const reqItem of params.items) {
      const product = this.state.products.find((p) => p.id === reqItem.producto_id);

      if (!product || !product.activo) {
        logs.push({
          step: 3,
          operation: 'REFERENTIAL_INTEGRITY_CHECK',
          sql_statement: `SELECT * FROM productos WHERE id = '${reqItem.producto_id}' FOR UPDATE;`,
          status: 'ROLLBACK',
          details: `FOREIGN KEY VIOLATION: Product ${reqItem.producto_id} does not exist or is inactive.`,
          timestamp,
        });
        return {
          success: false,
          message: `Producto no válido o inactivo: ID ${reqItem.producto_id}`,
          errorCode: 'ERR_PRODUCT_NOT_FOUND',
          executionTimeMs: Math.round(performance.now() - startTime),
          transactionLogs: logs,
        };
      }

      if (product.stock_actual < reqItem.cantidad) {
        logs.push({
          step: 3,
          operation: 'CHECK_CONSTRAINT_STOCK',
          sql_statement: `CHECK (stock_actual - ${reqItem.cantidad} >= 0) ON productos WHERE id = '${product.id}';`,
          status: 'ROLLBACK',
          details: `CHECK CONSTRAINT VIOLATION: Insufficient stock for '${product.nombre}'. Available: ${product.stock_actual}, Requested: ${reqItem.cantidad}.`,
          timestamp,
        });
        return {
          success: false,
          message: `Stock insuficiente para '${product.nombre}'. Existencia: ${product.stock_actual} ${product.unidad_medida}, solicitados: ${reqItem.cantidad} ${product.unidad_medida}.`,
          errorCode: 'ERR_INSUFFICIENT_STOCK',
          executionTimeMs: Math.round(performance.now() - startTime),
          transactionLogs: logs,
        };
      }

      const itemSubtotal = Math.round(reqItem.cantidad * product.precio_venta * 100) / 100;
      const itemCost = Math.round(reqItem.cantidad * product.precio_costo * 100) / 100;
      const itemProfit = Math.round((itemSubtotal - itemCost) * 100) / 100;

      subtotalCalculated += itemSubtotal;
      totalGrossProfit += itemProfit;

      verifiedSaleItems.push({
        producto_id: product.id,
        producto_nombre: product.nombre,
        codigo_barras: product.codigo_barras,
        unidad_medida: product.unidad_medida,
        cantidad: reqItem.cantidad,
        precio_unitario: product.precio_venta,
        costo_unitario: product.precio_costo,
        subtotal: itemSubtotal,
        utilidad_bruta: itemProfit,
      });
    }

    logs.push({
      step: 3,
      operation: 'EXCLUSIVE_LOCKS_ACQUIRED',
      sql_statement: `SELECT id, stock_actual FROM productos WHERE id IN (${verifiedSaleItems.map((i) => `'${i.producto_id}'`).join(',')}) FOR UPDATE;`,
      status: 'SUCCESS',
      details: `Acquired row locks on ${verifiedSaleItems.length} products. All stock check constraints satisfied.`,
      timestamp,
    });

    // STEP 4: CALCULATE TAXES AND TOTALS
    const totalAmount = Math.round(subtotalCalculated * 100) / 100;
    const baseSubtotal = Math.round((totalAmount / 1.16) * 100) / 100;
    const ivaAmount = Math.round((totalAmount - baseSubtotal) * 100) / 100;
    const changeAmount =
      params.tipo_pago === 'efectivo'
        ? Math.max(0, Math.round((params.monto_pagado - totalAmount) * 100) / 100)
        : 0;

    const cashier = this.state.users.find((u) => u.id === params.cajero_id) || this.getActiveUser();
    const nextTicketNumber = this.state.sales.length + 1045;
    const folioTicket = `TK-${nextTicketNumber.toString().padStart(6, '0')}`;
    const saleId = `ven_${Date.now()}`;

    // STEP 5: INSERT INTO ventas AND detalle_ventas
    const newSale: Sale = {
      id: saleId,
      folio_ticket: folioTicket,
      caja_sesion_id: params.caja_sesion_id,
      cajero_id: cashier.id,
      cajero_nombre: cashier.nombre,
      cliente_nombre: params.cliente_nombre.trim() || 'Público en General',
      tipo_pago: params.tipo_pago,
      subtotal: baseSubtotal,
      descuento: 0,
      iva: ivaAmount,
      total: totalAmount,
      monto_pagado: params.tipo_pago === 'efectivo' ? params.monto_pagado : totalAmount,
      cambio: changeAmount,
      items: verifiedSaleItems,
      estado: 'completada',
      created_at: timestamp,
    };

    logs.push({
      step: 4,
      operation: 'INSERT_VENTA_HEADER',
      sql_statement: `INSERT INTO ventas (id, folio_ticket, caja_sesion_id, cajero_id, total, tipo_pago) VALUES ('${saleId}', '${folioTicket}', '${params.caja_sesion_id}', '${cashier.id}', ${totalAmount}, '${params.tipo_pago}');`,
      status: 'SUCCESS',
      details: `Inserted sale header with folio ${folioTicket}. Total: $${totalAmount} MXN.`,
      timestamp,
    });

    // STEP 6: ATOMIC DECREMENT OF INVENTORY & INSERT KARDEX
    const newKardexRecords: KardexMovement[] = [];
    const updatedProducts = [...this.state.products];

    verifiedSaleItems.forEach((item, idx) => {
      const prodIndex = updatedProducts.findIndex((p) => p.id === item.producto_id);
      if (prodIndex !== -1) {
        const prod = updatedProducts[prodIndex];
        const prevStock = prod.stock_actual;
        const newStock = Math.round((prevStock - item.cantidad) * 100) / 100;

        updatedProducts[prodIndex] = {
          ...prod,
          stock_actual: newStock,
          updated_at: timestamp,
        };

        const kdxId = `kdx_sale_${Date.now()}_${idx}`;
        newKardexRecords.push({
          id: kdxId,
          producto_id: prod.id,
          producto_nombre: prod.nombre,
          tipo: 'SALIDA_VENTA',
          cantidad: item.cantidad,
          stock_anterior: prevStock,
          stock_nuevo: newStock,
          costo_unitario: prod.precio_costo,
          precio_unitario: item.precio_unitario,
          referencia_id: folioTicket,
          usuario_id: cashier.id,
          usuario_nombre: cashier.nombre,
          motivo: `Venta POS Folio ${folioTicket} (${params.tipo_pago})`,
          timestamp,
        });
      }
    });

    logs.push({
      step: 5,
      operation: 'UPDATE_INVENTORY_AND_KARDEX',
      sql_statement: `UPDATE productos SET stock_actual = stock_actual - @qty WHERE id = @id; INSERT INTO movimientos_inventario (...) VALUES (...);`,
      status: 'SUCCESS',
      details: `Decremented inventory and created ${newKardexRecords.length} Kardex audit records.`,
      timestamp,
    });

    // STEP 7: IF FIADO, UPDATE CLIENT BALANCE
    if (params.tipo_pago === 'fiado' && params.cliente_fiado_id) {
      const clientIndex = this.state.clientsFiado.findIndex(
        (c) => c.id === params.cliente_fiado_id
      );
      if (clientIndex !== -1) {
        const client = this.state.clientsFiado[clientIndex];
        const newDebt = Math.round((client.saldo_deudor + totalAmount) * 100) / 100;
        this.state.clientsFiado[clientIndex] = {
          ...client,
          saldo_deudor: newDebt,
        };
        logs.push({
          step: 6,
          operation: 'UPDATE_CLIENT_CREDIT',
          sql_statement: `UPDATE clientes_fiado SET saldo_deudor = saldo_deudor + ${totalAmount} WHERE id = '${client.id}';`,
          status: 'SUCCESS',
          details: `Customer debt updated for [${client.nombre}]. New balance: $${newDebt} MXN.`,
          timestamp,
        });
      }
    }

    // STEP 8: COMMIT TRANSACTION
    this.state.products = updatedProducts;
    this.state.sales = [newSale, ...this.state.sales];
    this.state.kardex = [...newKardexRecords, ...this.state.kardex];
    this.persist();

    logs.push({
      step: 7,
      operation: 'TRANSACTION_COMMIT',
      sql_statement: 'COMMIT TRANSACTION;',
      status: 'SUCCESS',
      details: 'All locks released. ACID transaction committed with full referential integrity.',
      timestamp,
    });

    const executionTimeMs = Math.round(performance.now() - startTime);

    return {
      success: true,
      message: `Venta registrada con éxito. Folio: ${folioTicket}`,
      executionTimeMs,
      transactionLogs: logs,
      data: newSale,
    };
  }

  /**
   * Stored Procedure: sp_entrada_mercancia
   * Stock entry from supplier invoice
   */
  public sp_entrada_mercancia(params: {
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
  }): StoredProcedureResult<{ totalEntradas: number }> {
    const startTime = performance.now();
    const logs: TransactionStepLog[] = [];
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

    logs.push({
      step: 1,
      operation: 'TRANSACTION_START',
      sql_statement: 'BEGIN TRANSACTION;',
      status: 'SUCCESS',
      details: 'Stock reception transaction initiated.',
      timestamp,
    });

    const user = this.state.users.find((u) => u.id === params.usuario_id) || this.getActiveUser();
    const updatedProducts = [...this.state.products];
    const newKardexRecords: KardexMovement[] = [];
    const newBatches: BatchLot[] = [...this.state.batches];

    for (const item of params.items) {
      const idx = updatedProducts.findIndex((p) => p.id === item.producto_id);
      if (idx === -1) {
        logs.push({
          step: 2,
          operation: 'FOREIGN_KEY_VIOLATION',
          sql_statement: `SELECT * FROM productos WHERE id = '${item.producto_id}';`,
          status: 'ROLLBACK',
          details: `Product ${item.producto_id} not found in catalog.`,
          timestamp,
        });
        return {
          success: false,
          message: `Producto ${item.producto_id} no encontrado`,
          errorCode: 'ERR_PRODUCT_NOT_FOUND',
          executionTimeMs: Math.round(performance.now() - startTime),
          transactionLogs: logs,
        };
      }

      const prod = updatedProducts[idx];
      const prevStock = prod.stock_actual;
      const newStock = Math.round((prevStock + item.cantidad) * 100) / 100;
      const newCost = item.costo_unitario > 0 ? item.costo_unitario : prod.precio_costo;
      const newSelling =
        item.nuevo_precio_venta && item.nuevo_precio_venta > 0
          ? item.nuevo_precio_venta
          : prod.precio_venta;
      const margin =
        newCost > 0 ? Math.round(((newSelling - newCost) / newCost) * 100 * 100) / 100 : 0;

      updatedProducts[idx] = {
        ...prod,
        stock_actual: newStock,
        precio_costo: newCost,
        precio_venta: newSelling,
        margen_pct: margin,
        updated_at: timestamp,
      };

      newKardexRecords.push({
        id: `kdx_in_${Date.now()}_${idx}`,
        producto_id: prod.id,
        producto_nombre: prod.nombre,
        tipo: 'ENTRADA_COMPRA',
        cantidad: item.cantidad,
        stock_anterior: prevStock,
        stock_nuevo: newStock,
        costo_unitario: newCost,
        referencia_id: params.factura_ref.trim() || 'COMPRA-PROV',
        usuario_id: user.id,
        usuario_nombre: user.nombre,
        motivo: `Proveedor: ${params.proveedor_nombre} | Factura: ${params.factura_ref}`,
        timestamp,
      });

      if (item.fecha_caducidad) {
        newBatches.push({
          id: `lot_${Date.now()}_${idx}`,
          producto_id: prod.id,
          numero_lote: item.lote || `L-${Date.now().toString().slice(-6)}`,
          fecha_caducidad: item.fecha_caducidad,
          cantidad_inicial: item.cantidad,
          cantidad_actual: item.cantidad,
          estado: 'vigente',
        });
      }
    }

    logs.push({
      step: 2,
      operation: 'UPDATE_INVENTORY_STOCK',
      sql_statement: `UPDATE productos SET stock_actual = stock_actual + @qty, precio_costo = @cost WHERE id = @id;`,
      status: 'SUCCESS',
      details: `Updated stock and unit cost for ${params.items.length} items.`,
      timestamp,
    });

    logs.push({
      step: 3,
      operation: 'TRANSACTION_COMMIT',
      sql_statement: 'COMMIT TRANSACTION;',
      status: 'SUCCESS',
      details: 'Inventory entry registered with updated FIFO/Kardex audit.',
      timestamp,
    });

    this.state.products = updatedProducts;
    this.state.kardex = [...newKardexRecords, ...this.state.kardex];
    this.state.batches = newBatches;
    this.persist();

    return {
      success: true,
      message: `Recepción de mercancía registrada correctamente (${params.items.length} productos).`,
      executionTimeMs: Math.round(performance.now() - startTime),
      transactionLogs: logs,
      data: { totalEntradas: params.items.length },
    };
  }

  /**
   * Stored Procedure: sp_salida_merma
   * Deducts broken, expired, or shrinkage products
   */
  public sp_salida_merma(params: {
    producto_id: string;
    cantidad: number;
    tipo_merma: 'MERMA_CADUCIDAD' | 'MERMA_DANADO' | 'MERMA_ROBO' | 'AJUSTE_INVENTARIO';
    motivo: string;
    usuario_id: string;
  }): StoredProcedureResult<{ nuevoStock: number }> {
    const startTime = performance.now();
    const logs: TransactionStepLog[] = [];
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

    logs.push({
      step: 1,
      operation: 'TRANSACTION_START',
      sql_statement: 'BEGIN TRANSACTION;',
      status: 'SUCCESS',
      details: 'Shrinkage exit transaction started.',
      timestamp,
    });

    const prodIdx = this.state.products.findIndex((p) => p.id === params.producto_id);
    if (prodIdx === -1) {
      logs.push({
        step: 2,
        operation: 'FOREIGN_KEY_VIOLATION',
        sql_statement: `SELECT * FROM productos WHERE id = '${params.producto_id}';`,
        status: 'ROLLBACK',
        details: 'Product not found.',
        timestamp,
      });
      return {
        success: false,
        message: 'Producto no encontrado.',
        errorCode: 'ERR_PRODUCT_NOT_FOUND',
        executionTimeMs: Math.round(performance.now() - startTime),
        transactionLogs: logs,
      };
    }

    const prod = this.state.products[prodIdx];
    if (prod.stock_actual < params.cantidad) {
      logs.push({
        step: 2,
        operation: 'CHECK_CONSTRAINT_STOCK',
        sql_statement: `CHECK (stock_actual - ${params.cantidad} >= 0);`,
        status: 'ROLLBACK',
        details: `Cannot register shrinkage greater than current stock. Current: ${prod.stock_actual}.`,
        timestamp,
      });
      return {
        success: false,
        message: `La merma solicitada (${params.cantidad}) supera el stock actual (${prod.stock_actual}).`,
        errorCode: 'ERR_INSUFFICIENT_STOCK',
        executionTimeMs: Math.round(performance.now() - startTime),
        transactionLogs: logs,
      };
    }

    const prevStock = prod.stock_actual;
    const newStock = Math.round((prevStock - params.cantidad) * 100) / 100;
    const user = this.state.users.find((u) => u.id === params.usuario_id) || this.getActiveUser();

    this.state.products[prodIdx] = {
      ...prod,
      stock_actual: newStock,
      updated_at: timestamp,
    };

    const folioMerma = `MERMA-${Date.now().toString().slice(-6)}`;
    const kardexRec: KardexMovement = {
      id: `kdx_merma_${Date.now()}`,
      producto_id: prod.id,
      producto_nombre: prod.nombre,
      tipo: params.tipo_merma,
      cantidad: params.cantidad,
      stock_anterior: prevStock,
      stock_nuevo: newStock,
      costo_unitario: prod.precio_costo,
      referencia_id: folioMerma,
      usuario_id: user.id,
      usuario_nombre: user.nombre,
      motivo: params.motivo || 'Baja por merma de almacén',
      timestamp,
    };

    this.state.kardex = [kardexRec, ...this.state.kardex];
    this.persist();

    logs.push({
      step: 2,
      operation: 'UPDATE_INVENTORY_SHRINKAGE',
      sql_statement: `UPDATE productos SET stock_actual = ${newStock} WHERE id = '${prod.id}'; INSERT INTO movimientos_inventario (...) VALUES (...);`,
      status: 'SUCCESS',
      details: `Stock reduced from ${prevStock} to ${newStock}. Audit record [${folioMerma}] created.`,
      timestamp,
    });

    logs.push({
      step: 3,
      operation: 'TRANSACTION_COMMIT',
      sql_statement: 'COMMIT TRANSACTION;',
      status: 'SUCCESS',
      details: 'Transaction completed safely.',
      timestamp,
    });

    return {
      success: true,
      message: `Merma de ${params.cantidad} ${prod.unidad_medida} de '${prod.nombre}' registrada correctamente.`,
      executionTimeMs: Math.round(performance.now() - startTime),
      transactionLogs: logs,
      data: { nuevoStock: newStock },
    };
  }

  /**
   * Cash Movement: sangría o entrada de efectivo
   */
  public sp_movimiento_caja(params: {
    caja_sesion_id: string;
    tipo: 'ingreso' | 'retiro_sangria' | 'pago_proveedor';
    monto: number;
    motivo: string;
    usuario_id: string;
  }): StoredProcedureResult<CashMovement> {
    const startTime = performance.now();
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const user = this.state.users.find((u) => u.id === params.usuario_id) || this.getActiveUser();

    const mov: CashMovement = {
      id: `mov_caja_${Date.now()}`,
      caja_sesion_id: params.caja_sesion_id,
      tipo: params.tipo,
      monto: params.monto,
      motivo: params.motivo,
      usuario_id: user.id,
      usuario_nombre: user.nombre,
      timestamp,
    };

    this.state.cashMovements = [mov, ...this.state.cashMovements];
    this.persist();

    return {
      success: true,
      message: `Movimiento de caja registrado: ${params.tipo} por $${params.monto} MXN`,
      executionTimeMs: Math.round(performance.now() - startTime),
      transactionLogs: [
        {
          step: 1,
          operation: 'INSERT_CASH_LEDGER',
          sql_statement: `INSERT INTO movimientos_caja (caja_sesion_id, tipo, monto, motivo, usuario_id) VALUES ('${params.caja_sesion_id}', '${params.tipo}', ${params.monto}, '${params.motivo}', '${user.id}');`,
          status: 'SUCCESS',
          details: 'Cash movement logged in drawer ledger.',
          timestamp,
        },
      ],
      data: mov,
    };
  }

  /**
   * Stored Procedure: sp_corte_caja_x
   * Non-destructive partial audit cut (Corte X)
   */
  public sp_corte_caja_x(params: {
    caja_sesion_id: string;
    cajero_id: string;
    desglose: DenominationBreakdown;
  }): StoredProcedureResult<CashCutRecord> {
    return this.executeCashCut('X', params);
  }

  /**
   * Stored Procedure: sp_corte_caja_z
   * Final closing cut (Corte Z), marks session as cerrada_z and locks further transactions
   */
  public sp_corte_caja_z(params: {
    caja_sesion_id: string;
    cajero_id: string;
    desglose: DenominationBreakdown;
    notas?: string;
  }): StoredProcedureResult<CashCutRecord> {
    return this.executeCashCut('Z', params);
  }

  private executeCashCut(
    tipo: 'X' | 'Z',
    params: {
      caja_sesion_id: string;
      cajero_id: string;
      desglose: DenominationBreakdown;
      notas?: string;
    }
  ): StoredProcedureResult<CashCutRecord> {
    const startTime = performance.now();
    const logs: TransactionStepLog[] = [];
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

    logs.push({
      step: 1,
      operation: 'TRANSACTION_START',
      sql_statement: `BEGIN TRANSACTION; -- CORTE_${tipo}`,
      status: 'SUCCESS',
      details: `Started ${tipo === 'X' ? 'Partial Shift Audit (Corte X)' : 'Final Register Closing (Corte Z)'}.`,
      timestamp,
    });

    const session = this.state.registerSessions.find((s) => s.id === params.caja_sesion_id);
    if (!session) {
      return {
        success: false,
        message: 'Sesión de caja no encontrada.',
        errorCode: 'ERR_SESSION_NOT_FOUND',
        executionTimeMs: Math.round(performance.now() - startTime),
        transactionLogs: logs,
      };
    }

    // Filter sales belonging to this session
    const sessionSales = this.state.sales.filter(
      (s) => s.caja_sesion_id === params.caja_sesion_id && s.estado === 'completada'
    );
    const sessionCashMovs = this.state.cashMovements.filter(
      (m) => m.caja_sesion_id === params.caja_sesion_id
    );

    let salesEfectivo = 0;
    let salesTarjeta = 0;
    let salesTransfer = 0;
    let salesFiado = 0;

    sessionSales.forEach((sale) => {
      switch (sale.tipo_pago) {
        case 'efectivo':
          salesEfectivo += sale.total;
          break;
        case 'tarjeta':
          salesTarjeta += sale.total;
          break;
        case 'transferencia':
          salesTransfer += sale.total;
          break;
        case 'fiado':
          salesFiado += sale.total;
          break;
      }
    });

    let extraInflow = 0;
    let extraOutflow = 0;

    sessionCashMovs.forEach((m) => {
      if (m.tipo === 'ingreso') {
        extraInflow += m.monto;
      } else {
        extraOutflow += m.monto;
      }
    });

    const theoreticalCash = Math.round(
      (session.monto_inicial + salesEfectivo + extraInflow - extraOutflow) * 100
    ) / 100;

    // Calculate physical counted cash from denomination breakdown
    const d = params.desglose;
    const physicalCash = Math.round(
      (d.b1000 * 1000 +
        d.b500 * 500 +
        d.b200 * 200 +
        d.b100 * 100 +
        d.b50 * 50 +
        d.b20 * 20 +
        d.m20 * 20 +
        d.m10 * 10 +
        d.m5 * 5 +
        d.m2 * 2 +
        d.m1 * 1 +
        d.m05 * 0.5) *
        100
    ) / 100;

    const diff = Math.round((physicalCash - theoreticalCash) * 100) / 100;
    const totalSalesAmount =
      Math.round((salesEfectivo + salesTarjeta + salesTransfer + salesFiado) * 100) / 100;
    const avgTicket =
      sessionSales.length > 0
        ? Math.round((totalSalesAmount / sessionSales.length) * 100) / 100
        : 0;

    const folioCut = `CORTE-${tipo}-${Date.now().toString().slice(-6)}`;
    const user = this.state.users.find((u) => u.id === params.cajero_id) || this.getActiveUser();

    const cutRecord: CashCutRecord = {
      id: `cut_${Date.now()}`,
      caja_sesion_id: params.caja_sesion_id,
      tipo_corte: tipo,
      folio: folioCut,
      fecha_hora: timestamp,
      cajero_id: user.id,
      cajero_nombre: user.nombre,
      fondo_fijo: session.monto_inicial,
      ventas_efectivo: salesEfectivo,
      ventas_tarjeta: salesTarjeta,
      ventas_transferencia: salesTransfer,
      ventas_fiado: salesFiado,
      total_ventas: totalSalesAmount,
      ingresos_extra: extraInflow,
      retiros_sangria: extraOutflow,
      efectivo_teorico: theoreticalCash,
      efectivo_contado: physicalCash,
      diferencia: diff,
      desglose: params.desglose,
      cantidad_tickets: sessionSales.length,
      ticket_promedio: avgTicket,
      notas: params.notas,
    };

    logs.push({
      step: 2,
      operation: 'CALCULATE_CASH_DRAWER_AGGREGATES',
      sql_statement: `SELECT SUM(total) FROM ventas WHERE caja_sesion_id = '${session.id}' GROUP BY tipo_pago;`,
      status: 'SUCCESS',
      details: `Theoretical cash: $${theoreticalCash} MXN | Physical counted: $${physicalCash} MXN | Variance: $${diff} MXN.`,
      timestamp,
    });

    if (tipo === 'Z') {
      // Close session
      const sIdx = this.state.registerSessions.findIndex((s) => s.id === params.caja_sesion_id);
      if (sIdx !== -1) {
        this.state.registerSessions[sIdx] = {
          ...this.state.registerSessions[sIdx],
          fecha_cierre: timestamp,
          monto_cierre_esperado: theoreticalCash,
          monto_cierre_real: physicalCash,
          diferencia: diff,
          estado: 'cerrada_z',
          notas: params.notas || 'Corte Z Final realizado con éxito.',
        };
      }
      logs.push({
        step: 3,
        operation: 'CLOSE_REGISTER_SESSION',
        sql_statement: `UPDATE cajas_sesion SET estado = 'cerrada_z', fecha_cierre = NOW(), diferencia = ${diff} WHERE id = '${session.id}';`,
        status: 'SUCCESS',
        details: 'Cash register permanently closed. Future sales locked until new opening.',
        timestamp,
      });
    }

    this.state.cashCuts = [cutRecord, ...this.state.cashCuts];
    this.persist();

    logs.push({
      step: 4,
      operation: 'TRANSACTION_COMMIT',
      sql_statement: 'COMMIT TRANSACTION;',
      status: 'SUCCESS',
      details: `${tipo === 'X' ? 'Corte Parcial X' : 'Corte Definitivo Z'} guardado en histórico.`,
      timestamp,
    });

    return {
      success: true,
      message: `Corte ${tipo} generado exitosamente. Folio: ${folioCut}`,
      executionTimeMs: Math.round(performance.now() - startTime),
      transactionLogs: logs,
      data: cutRecord,
    };
  }

  /**
   * Open a new cash drawer session
   */
  public abrirCaja(params: {
    cajero_id: string;
    monto_inicial: number;
    notas?: string;
  }): CashRegisterSession {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const user = this.state.users.find((u) => u.id === params.cajero_id) || this.getActiveUser();

    const newSession: CashRegisterSession = {
      id: `caja_ses_${Date.now()}`,
      cajero_id: user.id,
      cajero_nombre: user.nombre,
      fecha_apertura: timestamp,
      monto_inicial: params.monto_inicial,
      estado: 'abierta',
      notas: params.notas || 'Apertura de turno',
    };

    this.state.registerSessions = [newSession, ...this.state.registerSessions];
    this.state.activeSessionId = newSession.id;
    this.persist();
    return newSession;
  }

  public saveProduct(product: Partial<Product> & { nombre: string; precio_venta: number }): Product {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const cost = product.precio_costo ?? 0;
    const price = product.precio_venta ?? 0;
    const margin = cost > 0 ? Math.round(((price - cost) / cost) * 100 * 100) / 100 : 0;

    if (product.id) {
      const idx = this.state.products.findIndex((p) => p.id === product.id);
      if (idx !== -1) {
        const updated = {
          ...this.state.products[idx],
          ...product,
          margen_pct: margin,
          updated_at: timestamp,
        } as Product;
        this.state.products[idx] = updated;
        this.persist();
        return updated;
      }
    }

    const newProd: Product = {
      id: `prod_${Date.now()}`,
      sku: product.sku || `SKU-${Date.now().toString().slice(-4)}`,
      codigo_barras: product.codigo_barras || `750${Date.now().toString().slice(-10)}`,
      nombre: product.nombre,
      categoria_id: product.categoria_id || 'cat_granos',
      unidad_medida: product.unidad_medida || 'pza',
      precio_costo: cost,
      precio_venta: price,
      margen_pct: margin,
      stock_actual: product.stock_actual ?? 0,
      stock_minimo: product.stock_minimo ?? 5,
      permite_fraccion: product.permite_fraccion ?? false,
      es_favorito: product.es_favorito ?? false,
      ubicacion_pasillo: product.ubicacion_pasillo || 'Mostrador',
      activo: true,
      created_at: timestamp,
      updated_at: timestamp,
    };

    this.state.products.push(newProd);

    // Initial Kardex record if stock > 0
    if (newProd.stock_actual > 0) {
      this.state.kardex.unshift({
        id: `kdx_init_${Date.now()}`,
        producto_id: newProd.id,
        producto_nombre: newProd.nombre,
        tipo: 'ENTRADA_COMPRA',
        cantidad: newProd.stock_actual,
        stock_anterior: 0,
        stock_nuevo: newProd.stock_actual,
        costo_unitario: newProd.precio_costo,
        referencia_id: 'INVENTARIO-INICIAL',
        usuario_id: this.state.activeUserId,
        motivo: 'Alta de producto e inventario inicial',
        timestamp,
      });
    }

    this.persist();
    return newProd;
  }

  // =========================================================================
  // OPTIMIZED DATABASE VIEWS (HIGH PERFORMANCE ANALYTICS)
  // =========================================================================

  /**
   * VIEW: vw_ventas_diarias_resumen
   * Aggregates completed sales by hourly blocks
   */
  public getViewDailySalesSummary(): ViewDailySalesSummary[] {
    const hourlyMap = new Map<string, {
      salesCount: number;
      grossRevenue: number;
      costTotal: number;
    }>();

    // Initialize 8am to 8pm
    for (let h = 8; h <= 20; h += 2) {
      const block = `${h.toString().padStart(2, '0')}:00 - ${(h + 2).toString().padStart(2, '0')}:00`;
      hourlyMap.set(block, { salesCount: 0, grossRevenue: 0, costTotal: 0 });
    }

    this.state.sales
      .filter((s) => s.estado === 'completada')
      .forEach((sale) => {
        const hour = parseInt(sale.created_at.substring(11, 13) || '10', 10);
        let blockKey = '12:00 - 14:00';
        for (let h = 8; h <= 20; h += 2) {
          if (hour >= h && hour < h + 2) {
            blockKey = `${h.toString().padStart(2, '0')}:00 - ${(h + 2).toString().padStart(2, '0')}:00`;
            break;
          }
        }

        const current = hourlyMap.get(blockKey) || { salesCount: 0, grossRevenue: 0, costTotal: 0 };
        current.salesCount += 1;
        current.grossRevenue += sale.total;

        let saleCost = 0;
        sale.items.forEach((item) => {
          saleCost += item.costo_unitario * item.cantidad;
        });
        current.costTotal += saleCost;

        hourlyMap.set(blockKey, current);
      });

    const result: ViewDailySalesSummary[] = [];
    hourlyMap.forEach((val, key) => {
      const profit = Math.round((val.grossRevenue - val.costTotal) * 100) / 100;
      const margin =
        val.grossRevenue > 0
          ? Math.round((profit / val.grossRevenue) * 100 * 100) / 100
          : 0;
      const avg =
        val.salesCount > 0 ? Math.round((val.grossRevenue / val.salesCount) * 100) / 100 : 0;

      result.push({
        hora_bloque: key,
        total_ventas: val.salesCount,
        monto_bruto: Math.round(val.grossRevenue * 100) / 100,
        costo_total: Math.round(val.costTotal * 100) / 100,
        utilidad_neta: profit,
        margen_promedio_pct: margin,
        ticket_promedio: avg,
      });
    });

    return result;
  }

  /**
   * VIEW: vw_rotacion_inventario
   * Calculates ABC classification and inventory turnover
   */
  public getViewInventoryTurnover(): ViewInventoryTurnover[] {
    const productSalesMap = new Map<string, number>();

    this.state.sales.forEach((s) => {
      s.items.forEach((i) => {
        const cur = productSalesMap.get(i.producto_id) || 0;
        productSalesMap.set(i.producto_id, cur + i.cantidad);
      });
    });

    return this.state.products.map((p) => {
      const cat = this.state.categories.find((c) => c.id === p.categoria_id)?.nombre || 'General';
      const sold30d = productSalesMap.get(p.id) || 0;
      const dailyVelocity = sold30d / 30;
      const daysOfSupply =
        dailyVelocity > 0 ? Math.round((p.stock_actual / dailyVelocity) * 10) / 10 : 999;

      let classification: 'ALTA' | 'MEDIA' | 'BAJA' | 'SIN_ROTACION' = 'BAJA';
      if (sold30d >= 20) classification = 'ALTA';
      else if (sold30d >= 8) classification = 'MEDIA';
      else if (sold30d === 0) classification = 'SIN_ROTACION';

      return {
        producto_id: p.id,
        producto_nombre: p.nombre,
        categoria: cat,
        stock_actual: p.stock_actual,
        unidades_vendidas_30d: sold30d,
        rotacion_clasificacion: classification,
        dias_inventario_estimado: daysOfSupply,
      };
    });
  }

  /**
   * VIEW: vw_analisis_utilidad_categoria
   * Margin & stock valuation per grocery department
   */
  public getViewCategoryMargins(): ViewCategoryMargin[] {
    return this.state.categories.map((cat) => {
      const prods = this.state.products.filter((p) => p.categoria_id === cat.id);
      let costValue = 0;
      let retailValue = 0;
      let marginSum = 0;

      prods.forEach((p) => {
        costValue += p.precio_costo * p.stock_actual;
        retailValue += p.precio_venta * p.stock_actual;
        marginSum += p.margen_pct;
      });

      const avgMargin =
        prods.length > 0 ? Math.round((marginSum / prods.length) * 100) / 100 : 0;

      // Cumulative sales for this category
      let salesAmount = 0;
      let profit = 0;
      this.state.sales.forEach((s) => {
        s.items.forEach((i) => {
          const match = prods.find((p) => p.id === i.producto_id);
          if (match) {
            salesAmount += i.subtotal;
            profit += i.utilidad_bruta;
          }
        });
      });

      return {
        categoria_id: cat.id,
        categoria_nombre: cat.nombre,
        total_productos: prods.length,
        stock_valorizado_costo: Math.round(costValue * 100) / 100,
        stock_valorizado_venta: Math.round(retailValue * 100) / 100,
        margen_ponderado_pct: avgMargin,
        ventas_totales_monto: Math.round(salesAmount * 100) / 100,
        utilidad_acumulada: Math.round(profit * 100) / 100,
      };
    });
  }

  /**
   * VIEW: vw_alertas_reorden_caducidad
   * Low stock and near-expiry warnings
   */
  public getViewStockAlerts(): ViewStockAlert[] {
    return this.state.products
      .filter((p) => p.stock_actual <= p.stock_minimo)
      .map((p) => {
        const cat =
          this.state.categories.find((c) => c.id === p.categoria_id)?.nombre || 'Abarrotes';
        const deficit = Math.max(0, Math.round((p.stock_minimo - p.stock_actual) * 100) / 100);
        const state: 'CRITICO' | 'BAJO' | 'OPTIMO' =
          p.stock_actual <= p.stock_minimo * 0.3 ? 'CRITICO' : 'BAJO';

        // Check if batch is expiring
        const batch = this.state.batches.find((b) => b.producto_id === p.id);
        let daysToExpire: number | undefined = undefined;
        if (batch) {
          const expireDate = new Date(batch.fecha_caducidad).getTime();
          const today = new Date().getTime();
          daysToExpire = Math.max(0, Math.round((expireDate - today) / (1000 * 3600 * 24)));
        }

        return {
          producto_id: p.id,
          sku: p.sku,
          producto_nombre: p.nombre,
          categoria_nombre: cat,
          stock_actual: p.stock_actual,
          stock_minimo: p.stock_minimo,
          deficit,
          estado: state,
          dias_para_caducidad_proxima: daysToExpire,
        };
      })
      .sort((a, b) => (a.estado === 'CRITICO' ? -1 : 1));
  }
}

export const db = new RelationalDatabaseEngine();
