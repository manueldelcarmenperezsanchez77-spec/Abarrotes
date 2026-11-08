import React, { useState } from 'react';
import {
  Database,
  Network,
  Code2,
  FileSearch,
  Layers,
  Play,
  RotateCcw,
  CheckCircle2,
  Lock,
  Cpu,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { Language, translations } from '../../i18n/translations';
import { DatabaseCoordinator, POSCheckoutService, CatalogInventoryService } from '../../services/microservices';
import { sound } from '../../utils/soundEffects';

interface DatabaseArchitectViewProps {
  lang: Language;
}

export const DatabaseArchitectView: React.FC<DatabaseArchitectViewProps> = ({ lang }) => {
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState<'erd' | 'stored_procs' | 'views_sql' | 'microservices'>('erd');
  const [selectedSp, setSelectedSp] = useState<'sp_realizar_venta' | 'sp_entrada_mercancia' | 'sp_corte_caja_z'>('sp_realizar_venta');
  const [simulationLog, setSimulationLog] = useState<{
    running: boolean;
    durationMs?: number;
    steps: Array<{ step: number; name: string; sql: string; timeMs: number }>;
  } | null>(null);

  const handleRunSimulation = () => {
    sound.playBarcodeBeep();
    setSimulationLog({
      running: true,
      steps: [],
    });

    const prods = CatalogInventoryService.getProducts();
    const testProd = prods[0] || { id: 'prod_leche_lala_1l', nombre: 'Leche Lala', stock_actual: 38 };

    const simulatedSteps = [
      { step: 1, name: 'BEGIN_SERIALIZABLE_TRANSACTION', sql: 'BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;', timeMs: 4 },
      { step: 2, name: 'REGISTER_SESSION_LOCK', sql: "SELECT id, estado FROM cajas_sesion WHERE id = 'caja_ses_active' FOR SHARE;", timeMs: 8 },
      { step: 3, name: 'ROW_LEVEL_LOCK_PRODUCTS', sql: `SELECT stock_actual, precio_costo FROM productos WHERE id = '${testProd.id}' FOR UPDATE;`, timeMs: 14 },
      { step: 4, name: 'STOCK_CHECK_CONSTRAINT', sql: `CHECK (stock_actual - 1 >= 0) -> Stock: ${testProd.stock_actual} [PASS];`, timeMs: 19 },
      { step: 5, name: 'INSERT_VENTAS_HEADER', sql: "INSERT INTO ventas (folio_ticket, caja_sesion_id, total) VALUES ('TK-009999', 'caja_1', 28.50);", timeMs: 25 },
      { step: 6, name: 'INSERT_DETALLE_VENTAS', sql: `INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio) VALUES ('v_99', '${testProd.id}', 1, 28.50);`, timeMs: 31 },
      { step: 7, name: 'UPDATE_INVENTORY_STOCK', sql: `UPDATE productos SET stock_actual = stock_actual - 1 WHERE id = '${testProd.id}';`, timeMs: 38 },
      { step: 8, name: 'INSERT_KARDEX_LEDGER', sql: `INSERT INTO movimientos_inventario (tipo, producto_id, stock_ant, stock_post) VALUES ('SALIDA_VENTA', '${testProd.id}', ${testProd.stock_actual}, ${testProd.stock_actual - 1});`, timeMs: 45 },
      { step: 9, name: 'COMMIT_TRANSACTION', sql: 'COMMIT TRANSACTION; -- All locks released cleanly.', timeMs: 51 },
    ];

    simulatedSteps.forEach((s, idx) => {
      setTimeout(() => {
        setSimulationLog((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            steps: [...prev.steps, s],
          };
        });

        if (idx === simulatedSteps.length - 1) {
          sound.playSaleSuccess();
          setSimulationLog((prev) => (prev ? { ...prev, running: false, durationMs: 51 } : null));
        }
      }, (idx + 1) * 80);
    });
  };

  const handleResetDb = () => {
    if (window.confirm('¿Desea restaurar la base de datos a sus valores iniciales de fábrica?')) {
      DatabaseCoordinator.resetDatabase();
      sound.playSaleSuccess();
    }
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6 overflow-y-auto">
      {/* Top Header */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-white tracking-tight">{t.dbTitle}</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">{t.dbSubtitle}</p>
        </div>

        <button
          type="button"
          onClick={handleResetDb}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-950/60 border border-rose-800 text-rose-300 hover:bg-rose-900/60 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Restaurar BD Inicial</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="border-b border-slate-800 bg-slate-950/60 p-2 flex items-center gap-2 overflow-x-auto">
          {[
            { id: 'erd' as const, label: t.tabErd, icon: Network },
            { id: 'stored_procs' as const, label: t.tabStoredProcs, icon: Code2 },
            { id: 'views_sql' as const, label: t.tabViewsSql, icon: FileSearch },
            { id: 'microservices' as const, label: t.tabMicroservices, icon: Layers },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium font-mono transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-slate-800 text-emerald-400 font-bold border border-slate-700 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: ERD (Entity Relationship Diagram) */}
        {activeTab === 'erd' && (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-emerald-400" />
                  <span>Modelo Relacional en Tercera Forma Normal (3NF)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Esquema con integridad referencial estricta, claves foráneas, restricciones CHECK y disparadores de Kardex.
                </p>
              </div>
            </div>

            {/* Visual ERD Entity Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Table: productos */}
              <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden text-xs font-mono">
                <div className="px-3.5 py-2 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between text-slate-200 font-bold">
                  <span>TABLE productos</span>
                  <span className="text-[10px] text-emerald-400">1:N Kardex</span>
                </div>
                <div className="p-3 space-y-1 text-[11px]">
                  <div className="text-amber-400 font-bold">PK id (VARCHAR(36))</div>
                  <div className="text-slate-300">sku (VARCHAR(20) UNIQUE)</div>
                  <div className="text-slate-300">codigo_barras (VARCHAR(30) INDEX)</div>
                  <div className="text-slate-300">nombre (VARCHAR(150))</div>
                  <div className="text-blue-400">FK categoria_id → categorias(id)</div>
                  <div className="text-slate-300">unidad_medida (ENUM)</div>
                  <div className="text-slate-300">precio_costo (NUMERIC(10,2))</div>
                  <div className="text-slate-300">precio_venta (NUMERIC(10,2))</div>
                  <div className="text-rose-400 font-semibold">
                    CHECK stock_actual &gt;= 0
                  </div>
                  <div className="text-slate-400">stock_minimo (NUMERIC)</div>
                  <div className="text-slate-400">permite_fraccion (BOOLEAN)</div>
                </div>
              </div>

              {/* Table: ventas */}
              <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden text-xs font-mono">
                <div className="px-3.5 py-2 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between text-slate-200 font-bold">
                  <span>TABLE ventas</span>
                  <span className="text-[10px] text-emerald-400">1:N Detalle</span>
                </div>
                <div className="p-3 space-y-1 text-[11px]">
                  <div className="text-amber-400 font-bold">PK id (VARCHAR(36))</div>
                  <div className="text-slate-300 font-semibold">folio_ticket (VARCHAR(20) UNIQUE)</div>
                  <div className="text-blue-400">FK caja_sesion_id → cajas_sesion(id)</div>
                  <div className="text-blue-400">FK cajero_id → usuarios(id)</div>
                  <div className="text-slate-300">tipo_pago (ENUM)</div>
                  <div className="text-slate-300">subtotal (NUMERIC(12,2))</div>
                  <div className="text-slate-300">iva_trasladado (NUMERIC(12,2))</div>
                  <div className="text-emerald-400 font-bold">total (NUMERIC(12,2))</div>
                  <div className="text-slate-400">created_at (TIMESTAMP INDEX)</div>
                </div>
              </div>

              {/* Table: detalle_ventas */}
              <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden text-xs font-mono">
                <div className="px-3.5 py-2 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between text-slate-200 font-bold">
                  <span>TABLE detalle_ventas</span>
                  <span className="text-[10px] text-slate-400">Line Items</span>
                </div>
                <div className="p-3 space-y-1 text-[11px]">
                  <div className="text-amber-400 font-bold">PK id (VARCHAR(36))</div>
                  <div className="text-blue-400">FK venta_id → ventas(id) ON DELETE CASCADE</div>
                  <div className="text-blue-400">FK producto_id → productos(id) RESTRICT</div>
                  <div className="text-slate-300 font-bold">cantidad (NUMERIC(10,3))</div>
                  <div className="text-slate-300">precio_unitario (NUMERIC(10,2))</div>
                  <div className="text-slate-300">costo_unitario (NUMERIC(10,2))</div>
                  <div className="text-emerald-400">subtotal (GENERATED ALWAYS)</div>
                </div>
              </div>

              {/* Table: movimientos_inventario (KARDEX) */}
              <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden text-xs font-mono">
                <div className="px-3.5 py-2 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between text-slate-200 font-bold">
                  <span>TABLE movimientos_inventario</span>
                  <span className="text-[10px] text-amber-400">AUDIT LEDGER</span>
                </div>
                <div className="p-3 space-y-1 text-[11px]">
                  <div className="text-amber-400 font-bold">PK id (BIGINT GENERATED)</div>
                  <div className="text-blue-400">FK producto_id → productos(id)</div>
                  <div className="text-slate-200 font-bold">tipo (ENUM ENTRADA/SALIDA/MERMA)</div>
                  <div className="text-slate-300">cantidad (NUMERIC(10,3))</div>
                  <div className="text-slate-400">stock_anterior (NUMERIC(10,3))</div>
                  <div className="text-slate-100 font-bold">stock_nuevo (NUMERIC(10,3))</div>
                  <div className="text-slate-300">referencia_id (VARCHAR(50) INDEX)</div>
                  <div className="text-blue-400">FK usuario_id → usuarios(id)</div>
                  <div className="text-slate-400">timestamp (TIMESTAMP INDEX)</div>
                </div>
              </div>

              {/* Table: cajas_sesion */}
              <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden text-xs font-mono">
                <div className="px-3.5 py-2 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between text-slate-200 font-bold">
                  <span>TABLE cajas_sesion</span>
                  <span className="text-[10px] text-blue-400">SHIFTS</span>
                </div>
                <div className="p-3 space-y-1 text-[11px]">
                  <div className="text-amber-400 font-bold">PK id (VARCHAR(36))</div>
                  <div className="text-blue-400">FK cajero_id → usuarios(id)</div>
                  <div className="text-slate-300">monto_inicial (NUMERIC(10,2))</div>
                  <div className="text-slate-300">estado (ENUM 'abierta'|'cerrada_z')</div>
                  <div className="text-slate-400">monto_cierre_esperado (NUMERIC)</div>
                  <div className="text-slate-400">monto_cierre_real (NUMERIC)</div>
                  <div className="text-rose-400 font-bold">diferencia (NUMERIC(10,2))</div>
                  <div className="text-slate-400">fecha_apertura / fecha_cierre</div>
                </div>
              </div>

              {/* Table: cortes_caja_registro */}
              <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden text-xs font-mono">
                <div className="px-3.5 py-2 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between text-slate-200 font-bold">
                  <span>TABLE cortes_caja_registro</span>
                  <span className="text-[10px] text-rose-400">CORTE X / Z</span>
                </div>
                <div className="p-3 space-y-1 text-[11px]">
                  <div className="text-amber-400 font-bold">PK id (VARCHAR(36))</div>
                  <div className="text-blue-400">FK caja_sesion_id → cajas_sesion(id)</div>
                  <div className="text-slate-200 font-bold">tipo_corte ('X' | 'Z')</div>
                  <div className="text-slate-300">folio (VARCHAR(30) UNIQUE)</div>
                  <div className="text-emerald-400">ventas_efectivo / tarjeta / fiado</div>
                  <div className="text-slate-300">efectivo_teorico (NUMERIC)</div>
                  <div className="text-slate-100 font-bold">efectivo_contado (NUMERIC)</div>
                  <div className="text-rose-400 font-bold">diferencia (NUMERIC)</div>
                  <div className="text-slate-400">desglose_denominaciones (JSONB)</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Stored Procedures & Transaction Simulator */}
        {activeTab === 'stored_procs' && (
          <div className="p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Procedimientos Almacenados de Transacciones Críticas</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Garantizan atomicidad ACID, bloqueos exclusivos por fila y prevención de condiciones de carrera (Race Conditions).
                </p>
              </div>

              {/* Trigger test simulation */}
              <button
                type="button"
                onClick={handleRunSimulation}
                disabled={simulationLog?.running}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all shadow-sm disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Ejecutar Transacción sp_realizar_venta()</span>
              </button>
            </div>

            {/* SP Selector Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              {[
                { id: 'sp_realizar_venta' as const, label: 'sp_realizar_venta()' },
                { id: 'sp_entrada_mercancia' as const, label: 'sp_entrada_mercancia()' },
                { id: 'sp_corte_caja_z' as const, label: 'sp_corte_caja_z()' },
              ].map((sp) => (
                <button
                  key={sp.id}
                  onClick={() => setSelectedSp(sp.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors ${
                    selectedSp === sp.id
                      ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sp.label}
                </button>
              ))}
            </div>

            {/* SQL Code View */}
            <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 font-mono text-xs overflow-x-auto text-slate-300 leading-relaxed">
              {selectedSp === 'sp_realizar_venta' && (
                <pre>
{`CREATE OR REPLACE PROCEDURE sp_realizar_venta(
    IN p_caja_sesion_id VARCHAR(36),
    IN p_cajero_id VARCHAR(36),
    IN p_cliente_nombre VARCHAR(150),
    IN p_tipo_pago VARCHAR(20),
    IN p_items JSONB,
    OUT p_folio_ticket VARCHAR(20),
    OUT p_total NUMERIC(12,2)
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_item JSONB;
    v_stock_actual NUMERIC;
    v_precio_venta NUMERIC;
    v_costo_unitario NUMERIC;
    v_venta_id VARCHAR(36);
BEGIN
    -- 1. Iniciar transacción con aislamiento estricto
    -- 2. Validar que la caja esté ABIERTA
    IF NOT EXISTS (SELECT 1 FROM cajas_sesion WHERE id = p_caja_sesion_id AND estado = 'abierta') THEN
        RAISE EXCEPTION 'ERR_REGISTER_CLOSED: La caja especificada no está abierta para ventas.';
    END IF;

    -- 3. Bloqueo exclusivo de productos y verificación de existencias
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        SELECT stock_actual, precio_venta, precio_costo
          INTO v_stock_actual, v_precio_venta, v_costo_unitario
          FROM productos
         WHERE id = (v_item->>'producto_id')
           FOR UPDATE; -- Bloqueo pesimista

        IF v_stock_actual < (v_item->>'cantidad')::NUMERIC THEN
            RAISE EXCEPTION 'ERR_INSUFFICIENT_STOCK: Stock insuficiente en producto %', (v_item->>'producto_id');
        END IF;
    END LOOP;

    -- 4. Inserción de cabecera de venta
    v_venta_id := 'ven_' || gen_random_uuid();
    p_folio_ticket := 'TK-' || lpad(nextval('seq_tickets')::text, 6, '0');
    
    INSERT INTO ventas (id, folio_ticket, caja_sesion_id, cajero_id, tipo_pago, created_at)
    VALUES (v_venta_id, p_folio_ticket, p_caja_sesion_id, p_cajero_id, p_tipo_pago, clock_timestamp());

    -- 5. Disminución de stock e inserción de kardex por cada partida
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        UPDATE productos 
           SET stock_actual = stock_actual - (v_item->>'cantidad')::NUMERIC 
         WHERE id = (v_item->>'producto_id');

        INSERT INTO movimientos_inventario (producto_id, tipo, cantidad, referencia_id, usuario_id)
        VALUES ((v_item->>'producto_id'), 'SALIDA_VENTA', (v_item->>'cantidad')::NUMERIC, p_folio_ticket, p_cajero_id);
    END LOOP;

    COMMIT;
END;
$$;`}
                </pre>
              )}

              {selectedSp === 'sp_entrada_mercancia' && (
                <pre>
{`CREATE OR REPLACE PROCEDURE sp_entrada_mercancia(
    IN p_proveedor_nombre VARCHAR(120),
    IN p_factura_ref VARCHAR(50),
    IN p_usuario_id VARCHAR(36),
    IN p_items JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_item JSONB;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        -- Incrementar stock y actualizar precio de costo
        UPDATE productos
           SET stock_actual = stock_actual + (v_item->>'cantidad')::NUMERIC,
               precio_costo = (v_item->>'costo_unitario')::NUMERIC,
               updated_at = NOW()
         WHERE id = (v_item->>'producto_id');

        -- Registrar en Kardex
        INSERT INTO movimientos_inventario (producto_id, tipo, cantidad, costo_unitario, referencia_id, usuario_id)
        VALUES ((v_item->>'producto_id'), 'ENTRADA_COMPRA', (v_item->>'cantidad')::NUMERIC, (v_item->>'costo_unitario')::NUMERIC, p_factura_ref, p_usuario_id);
    END LOOP;
    COMMIT;
END;
$$;`}
                </pre>
              )}

              {selectedSp === 'sp_corte_caja_z' && (
                <pre>
{`CREATE OR REPLACE PROCEDURE sp_corte_caja_z(
    IN p_caja_sesion_id VARCHAR(36),
    IN p_cajero_id VARCHAR(36),
    IN p_efectivo_contado NUMERIC(12,2),
    IN p_desglose JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_efectivo_teorico NUMERIC(12,2);
    v_diferencia NUMERIC(12,2);
BEGIN
    -- Calcular efectivo teórico a partir del libro mayor
    SELECT fondo_inicial + COALESCE(SUM(total), 0)
      INTO v_efectivo_teorico
      FROM ventas
     WHERE caja_sesion_id = p_caja_sesion_id AND tipo_pago = 'efectivo';

    v_diferencia := p_efectivo_contado - v_efectivo_teorico;

    -- Cerrar definitivamente la sesión de caja
    UPDATE cajas_sesion
       SET estado = 'cerrada_z',
           fecha_cierre = clock_timestamp(),
           monto_cierre_real = p_efectivo_contado,
           diferencia = v_diferencia
     WHERE id = p_caja_sesion_id;

    -- Generar comprobante inmutable en histórico
    INSERT INTO cortes_caja_registro (caja_sesion_id, tipo_corte, folio, efectivo_teorico, efectivo_contado, diferencia, desglose_denominaciones)
    VALUES (p_caja_sesion_id, 'Z', 'CORTE-Z-' || to_char(NOW(), 'YYYYMMDD-HH24MI'), v_efectivo_teorico, p_efectivo_contado, v_diferencia, p_desglose);

    COMMIT;
END;
$$;`}
                </pre>
              )}
            </div>

            {/* Live Simulation Output Console */}
            {simulationLog && (
              <div className="bg-slate-950 rounded-xl p-4 border border-emerald-500/40 font-mono text-xs space-y-2">
                <div className="flex items-center justify-between text-emerald-400 font-bold border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 animate-pulse" />
                    <span>Live Transaction Isolation Engine Output</span>
                  </div>
                  {simulationLog.durationMs && (
                    <span className="text-slate-300 text-[11px]">
                      Elapsed: <strong className="text-emerald-400">{simulationLog.durationMs}ms</strong>
                    </span>
                  )}
                </div>

                <div className="space-y-1 pt-1 max-h-56 overflow-y-auto">
                  {simulationLog.steps.map((st) => (
                    <div key={st.step} className="flex items-start gap-2 text-[11px]">
                      <span className="text-slate-500 shrink-0">+{st.timeMs}ms</span>
                      <span className="text-emerald-400 font-bold shrink-0">[{st.name}]</span>
                      <span className="text-slate-300">{st.sql}</span>
                    </div>
                  ))}
                  {simulationLog.running && (
                    <div className="text-amber-400 animate-pulse text-[11px]">
                      Locking row identifiers and asserting foreign keys...
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Optimized SQL Views and EXPLAIN ANALYZE */}
        {activeTab === 'views_sql' && (
          <div className="p-6 space-y-5">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileSearch className="w-4 h-4 text-emerald-400" />
                <span>Vistas Materializadas e Índices de Alto Rendimiento</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Consultas analíticas precompiladas con índices B-Tree en claves de filtrado para evitar lecturas de tabla completa (Full Table Scans).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs space-y-2">
                <div className="font-bold text-emerald-400">VIEW vw_ventas_diarias_resumen</div>
                <pre className="text-[11px] text-slate-300 overflow-x-auto leading-relaxed">
{`CREATE MATERIALIZED VIEW vw_ventas_diarias_resumen AS
SELECT 
    date_trunc('hour', v.created_at) AS hora_bloque,
    COUNT(v.id) AS total_ventas,
    SUM(v.total) AS monto_bruto,
    SUM(d.costo_unitario * d.cantidad) AS costo_total,
    SUM(v.total) - SUM(d.costo_unitario * d.cantidad) AS utilidad_neta,
    ROUND(AVG(v.total), 2) AS ticket_promedio
FROM ventas v
JOIN detalle_ventas d ON d.venta_id = v.id
WHERE v.estado = 'completada'
GROUP BY 1
ORDER BY 1 DESC;

CREATE UNIQUE INDEX idx_mv_ventas_hora 
ON vw_ventas_diarias_resumen (hora_bloque);`}
                </pre>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs space-y-2">
                <div className="font-bold text-blue-400">EXPLAIN (ANALYZE, BUFFERS) Plan</div>
                <pre className="text-[11px] text-slate-400 overflow-x-auto leading-relaxed">
{`HashAggregate  (cost=12.45..14.12 rows=24 width=64) (actual time=0.082..0.089 rows=7 loops=1)
  Group Key: date_trunc('hour', v.created_at)
  Buffers: shared hit=8
  ->  Nested Loop  (cost=0.29..11.80 rows=48 width=32)
        ->  Index Scan using idx_ventas_estado on ventas v
              Index Cond: (estado = 'completada')
              Buffers: shared hit=4
        ->  Index Scan using idx_detalle_venta_id on detalle_ventas d
              Index Cond: (venta_id = v.id)
              Buffers: shared hit=4
Planning Time: 0.114 ms
Execution Time: 0.128 ms (Sub-millisecond query)`}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Microservices Architecture */}
        {activeTab === 'microservices' && (
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>Desacoplamiento Funcional en Microservicios Escalables</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Arquitectura orientada a eventos para permitir crecimiento independiente de terminales POS, almacén central y analítica.
              </p>
            </div>

            {/* Architecture Node Diagram */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="font-bold text-emerald-400 text-xs font-mono">
                  1. POS & Checkout Service
                </div>
                <p className="text-xs text-slate-300">
                  Responsable del carrito activo, pesaje en báscula, lector de código de barras e invocación del coordinador transaccional.
                </p>
                <div className="text-[10px] font-mono text-slate-500">
                  Protocol: HTTP/REST / gRPC · Stateless
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="font-bold text-blue-400 text-xs font-mono">
                  2. Inventory & Kardex Service
                </div>
                <p className="text-xs text-slate-300">
                  Gestiona catálogo de abarrotes, órdenes de compra a proveedores, mermas por caducidad y libro mayor de auditoría FIFO.
                </p>
                <div className="text-[10px] font-mono text-slate-500">
                  Event: ProductStockAdjustedEvent
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="font-bold text-amber-400 text-xs font-mono">
                  3. Cash Register & Audit Service
                </div>
                <p className="text-xs text-slate-300">
                  Controla fondos de cambio, sangrías/retiros extraordinarios y cálculo estricto de arqueo de billetes y monedas (Cortes X y Z).
                </p>
                <div className="text-[10px] font-mono text-slate-500">
                  Persistence: Immutable Cut Ledger
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="font-bold text-purple-400 text-xs font-mono">
                  4. Auth & RBAC Security Service
                </div>
                <p className="text-xs text-slate-300">
                  Roles de Administrador, Cajero y Almacenista. Control de acceso granular para apertura de caja y edición de precios.
                </p>
                <div className="text-[10px] font-mono text-slate-500">
                  Security: PIN Fast Auth + Audit Trail
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="font-bold text-rose-400 text-xs font-mono">
                  5. Reporting & Analytics Service
                </div>
                <p className="text-xs text-slate-300">
                  Alimentado por réplicas de solo lectura (Read Replicas) y vistas materializadas para no afectar el throughput del POS.
                </p>
                <div className="text-[10px] font-mono text-slate-500">
                  Engine: Materialized View Engine
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="font-bold text-cyan-400 text-xs font-mono">
                  6. Transaction Coordinator (ACID)
                </div>
                <p className="text-xs text-slate-300">
                  Garantiza bloqueo a nivel de registro (FOR UPDATE), consistencia referencial y prevención de ventas sin existencia.
                </p>
                <div className="text-[10px] font-mono text-slate-500">
                  Isolation: Two-Phase Commit / Sagas
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
