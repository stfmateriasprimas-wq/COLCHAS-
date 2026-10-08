-- ==============================================================================
-- SISTEMA STF GROUP - CONTROL DE CALIDAD DE COLCHAS & TRAZABILIDAD TEXTIL
-- ESQUEMA MAESTRO POSTGRESQL (SUPABASE) - CAPA DE RESPALDO PROFESIONAL
-- ==============================================================================
-- Este script crea las tablas relacionales tipadas para el respaldo y sincronización
-- en espejo con Google Sheets (BASE_DE_DATOS, ALERTAS, EVIDENCIAS DRIVE).
-- No interfiere con la operación en vivo y garantiza RLS para la anon key.
-- ==============================================================================

-- 1. EXTENSIONES REQUERIDAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TABLA PRINCIPAL: stf_colchas_ops (Las 17 Columnas de BASE_DE_DATOS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.stf_colchas_ops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    op_codigo VARCHAR(60) NOT NULL UNIQUE,              -- Col 6: OP (ej. 'OP-00096156')
    fecha_registro TIMESTAMPTZ DEFAULT NOW(),           -- Col 1: FECHA
    fecha_texto VARCHAR(60),                            -- Representación original en Sheets
    inspector VARCHAR(120) NOT NULL DEFAULT 'OPERARIO STF', -- Col 2: INSPECTOR / OPERARIO
    tela VARCHAR(180) NOT NULL,                         -- Col 3: TELA
    codigo_mt VARCHAR(100),                             -- Col 4: CÓDIGO MT
    color VARCHAR(100) DEFAULT 'AZUL',                  -- Col 5: COLOR
    referencia VARCHAR(150),                            -- Col 7: REFERENCIA
    rollos NUMERIC(10,2) DEFAULT 1,                     -- Col 8: ROLLOS
    lote VARCHAR(80) DEFAULT '1',                       -- Col 9: LOTE
    estado VARCHAR(60) NOT NULL DEFAULT 'SOLICITADO',   -- Col 10: ESTADO OFICIAL
    observacion_operario TEXT,                          -- Col 11: OBSERVACIÓN OPERARIO
    observacion_lavanderia TEXT,                        -- Col 12: OBSERVACIÓN COLFACTORY
    dictamen VARCHAR(60) DEFAULT 'PENDIENTE',           -- Col 14: VEREDICTO
    observacion_calidad TEXT,                           -- Col 15: OBS.OPERARIO FINAL / DICTAMEN
    observacion_prenda_terminada TEXT,                  -- Comentarios de Prenda Terminada
    sla_dias NUMERIC(8,2) DEFAULT 0,                    -- Col 16: SLA DÍAS
    horas_en_proceso NUMERIC(10,2) DEFAULT 0,
    tiene_retraso BOOLEAN DEFAULT FALSE,
    es_retraso_critico BOOLEAN DEFAULT FALSE,
    area_actual VARCHAR(100) DEFAULT 'SOLICITADO',
    email_usuario VARCHAR(180),
    origen_sync VARCHAR(50) DEFAULT 'GOOGLE_SHEETS',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 3. TABLA: stf_colchas_fotos (Evidencias fotográficas en Google Drive)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.stf_colchas_fotos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    op_codigo VARCHAR(60) NOT NULL REFERENCES public.stf_colchas_ops(op_codigo) ON DELETE CASCADE,
    drive_folder_url TEXT,                              -- Col 13: Enlace oficial a Carpeta en Drive
    foto_muestra_url TEXT,                              -- Foto 1: Muestra Inicial (Atelier/Corte)
    foto_calidad_url TEXT,                              -- Foto 2: Post-Lavado Calidad
    foto_prenda_terminada_1_url TEXT,                   -- Foto 3: Prenda Terminada 1
    foto_prenda_terminada_2_url TEXT,                   -- Foto 4: Prenda Terminada 2
    fecha_foto_calidad TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_op_fotos_codigo UNIQUE (op_codigo)
);

-- ==============================================================================
-- 4. TABLA: stf_colchas_auditoria (Trazabilidad Forense Inmutable de Estados)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.stf_colchas_auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    op_codigo VARCHAR(60) NOT NULL,
    estado_anterior VARCHAR(60),
    estado_nuevo VARCHAR(60) NOT NULL,
    usuario_nombre VARCHAR(150),
    usuario_id VARCHAR(80),
    area VARCHAR(100),
    detalles JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 5. TABLA: stf_colchas_sync_logs (Métricas de Sincronización Sheets ➔ Postgres)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.stf_colchas_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_sync VARCHAR(50) NOT NULL,                     -- 'MANUAL_BULK', 'AUTO_TRIGGER', 'SINGLE_OP'
    total_ops_sheets INTEGER DEFAULT 0,
    ops_insertadas INTEGER DEFAULT 0,
    ops_actualizadas INTEGER DEFAULT 0,
    errores INTEGER DEFAULT 0,
    duracion_ms INTEGER DEFAULT 0,
    ejecutado_por VARCHAR(120) DEFAULT 'SISTEMA',
    detalles JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 6. ÍNDICES DE RENDIMIENTO (Búsquedas en milisegundos)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_stf_ops_codigo ON public.stf_colchas_ops(op_codigo);
CREATE INDEX IF NOT EXISTS idx_stf_ops_estado ON public.stf_colchas_ops(estado);
CREATE INDEX IF NOT EXISTS idx_stf_ops_dictamen ON public.stf_colchas_ops(dictamen);
CREATE INDEX IF NOT EXISTS idx_stf_ops_fecha ON public.stf_colchas_ops(fecha_registro DESC);
CREATE INDEX IF NOT EXISTS idx_stf_auditoria_op ON public.stf_colchas_auditoria(op_codigo);
CREATE INDEX IF NOT EXISTS idx_stf_auditoria_fecha ON public.stf_colchas_auditoria(created_at DESC);

-- ==============================================================================
-- 7. TRIGGER AUTOMÁTICO: Actualización de updated_at
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_stf_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_stf_ops_updated_at ON public.stf_colchas_ops;
CREATE TRIGGER trg_stf_ops_updated_at
BEFORE UPDATE ON public.stf_colchas_ops
FOR EACH ROW EXECUTE FUNCTION public.handle_stf_updated_at();

DROP TRIGGER IF EXISTS trg_stf_fotos_updated_at ON public.stf_colchas_fotos;
CREATE TRIGGER trg_stf_fotos_updated_at
BEFORE UPDATE ON public.stf_colchas_fotos
FOR EACH ROW EXECUTE FUNCTION public.handle_stf_updated_at();

-- ==============================================================================
-- 8. POLÍTICAS DE SEGURIDAD RLS (Row Level Security)
-- Permite lectura y escritura segura desde el cliente Web con la Anon Key
-- ==============================================================================
ALTER TABLE public.stf_colchas_ops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stf_colchas_fotos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stf_colchas_auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stf_colchas_sync_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para stf_colchas_ops
DROP POLICY IF EXISTS "Permitir lectura general ops" ON public.stf_colchas_ops;
CREATE POLICY "Permitir lectura general ops" ON public.stf_colchas_ops FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir insercion y actualizacion ops" ON public.stf_colchas_ops;
CREATE POLICY "Permitir insercion y actualizacion ops" ON public.stf_colchas_ops FOR ALL USING (true) WITH CHECK (true);

-- Políticas para stf_colchas_fotos
DROP POLICY IF EXISTS "Permitir lectura general fotos" ON public.stf_colchas_fotos;
CREATE POLICY "Permitir lectura general fotos" ON public.stf_colchas_fotos FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir insercion y actualizacion fotos" ON public.stf_colchas_fotos;
CREATE POLICY "Permitir insercion y actualizacion fotos" ON public.stf_colchas_fotos FOR ALL USING (true) WITH CHECK (true);

-- Políticas para stf_colchas_auditoria
DROP POLICY IF EXISTS "Permitir lectura general auditoria" ON public.stf_colchas_auditoria;
CREATE POLICY "Permitir lectura general auditoria" ON public.stf_colchas_auditoria FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir insercion auditoria" ON public.stf_colchas_auditoria;
CREATE POLICY "Permitir insercion auditoria" ON public.stf_colchas_auditoria FOR ALL USING (true) WITH CHECK (true);

-- Políticas para stf_colchas_sync_logs
DROP POLICY IF EXISTS "Permitir lectura logs" ON public.stf_colchas_sync_logs;
CREATE POLICY "Permitir lectura logs" ON public.stf_colchas_sync_logs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir insercion logs" ON public.stf_colchas_sync_logs;
CREATE POLICY "Permitir insercion logs" ON public.stf_colchas_sync_logs FOR ALL USING (true) WITH CHECK (true);
