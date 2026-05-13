-- ============================================================
-- FUB Integration — Seeds iniciales
-- ============================================================
-- Aplicar DESPUÉS de fub_integration.sql.
--
-- Contiene:
--   1) Los 17 usuarios FUB conocidos → fub_user_map (sin cbi_user_id;
--      se rellena al hacer match con profiles.email vía script o admin UI)
--   2) Los 2 pipelines reales (Buyers, Sellers)
--   3) Los 10 stages reales (Lead, A-Hot, B-Warm, C-Cold, Viewings,
--      Pending, Closed, Sphere, Unresponsive, Trash)
--   4) Canonical sources básicos (Idealista, etc.)
--
-- Decisiones tomadas:
--   - Bruno (id=3), Darcy (id=1), Sofia Moya (id=11) → is_admin=true
--   - Costa Blanca Investments (id=2, cuenta owner) → is_admin=true, marcado
--     como "system" (no es persona real)
--   - Resto de Brokers/Agents → is_admin=false
-- ============================================================

-- ============================================================
-- 1) Pipelines reales (vienen de la cuenta CBI)
-- ============================================================
insert into public.fub_pipelines (id, name) values
  (1, 'Buyers'),
  (2, 'Sellers')
on conflict (id) do update set name = excluded.name;

-- ============================================================
-- 2) Stages reales (los IDs son los reales descubiertos en la API)
-- ============================================================
-- Stages del pipeline principal (people stages, no se asocian a pipeline_id)
insert into public.fub_stages (id, name, pipeline_id, position, is_branch) values
  (2,  'Lead',                  null, 1,  false),
  (48, 'A - Hot 1-3 Months',    null, 2,  false),
  (49, 'B - Warm 3-6 Months',   null, 3,  false),
  (50, 'C - Cold 6+ Months',    null, 4,  false),
  (17, 'Viewings',              null, 5,  false),
  (56, 'Pending',               null, 6,  false),
  (8,  'Closed',                null, 7,  false),
  (51, 'Sphere',                null, 8,  true),
  (52, 'Unresponsive',          null, 9,  true),
  (11, 'Trash',                 null, 10, true)
on conflict (id) do update set
  name = excluded.name,
  position = excluded.position,
  is_branch = excluded.is_branch,
  synced_at = now();

-- ============================================================
-- 3) Usuarios FUB → fub_user_map (cbi_user_id se rellena luego)
-- ============================================================
-- NOTA: cbi_user_id queda NULL inicialmente. El script de sync
-- (linkProfilesToFub en actions/fub.ts) hace el match por email
-- contra auth.users / profiles.

insert into public.fub_user_map (cbi_user_id, fub_user_id, fub_email, fub_role, is_admin, active) values
  (null, 1,  'darcy@costablancainvestments.com',       'Broker', true,  true),
  (null, 2,  'info@costablancainvestments.com',        'Broker', true,  true),   -- cuenta owner (sistema)
  (null, 3,  'bruno@costablancainvestments.com',       'Broker', true,  true),
  (null, 4,  'dajana@costablancainvestments.com',      'Agent',  false, true),
  (null, 5,  'alejandro@costablancainvestments.com',   'Agent',  false, true),
  (null, 6,  'karina@costablancainvestments.com',      'Agent',  false, true),
  (null, 9,  'timmy@costablancainvestments.com',       'Agent',  false, true),
  (null, 11, 'sofia@costablancainvestments.com',       'Broker', true,  true),   -- Sofia Moya: decisión Marco → admin
  (null, 12, 'ivana@costablancainvestments.com',       'Agent',  false, true),
  (null, 15, 'joanna@costablancainvestments.com',      'Agent',  false, true),
  (null, 16, 'leticia@costablancainvestments.com',     'Agent',  false, true),
  (null, 17, 'marek@costablancainvestments.com',       'Agent',  false, true),
  (null, 18, 'suzanne@costablancainvestments.com',     'Agent',  false, true),
  (null, 19, 'steven@costablancainvestments.com',      'Agent',  false, true),
  (null, 20, 'doris@costablancainvestments.com',       'Agent',  false, true),
  (null, 21, 'clementine@costablancainvestments.com',  'Agent',  false, true),
  (null, 22, 'ines@costablancainvestments.com',        'Agent',  false, true)
on conflict (fub_user_id) do update set
  fub_email = excluded.fub_email,
  fub_role = excluded.fub_role,
  active = excluded.active,
  updated_at = now();
-- IMPORTANTE: el ON CONFLICT NO sobreescribe is_admin (preserva overrides manuales del admin panel)

-- ============================================================
-- 4) Canonical sources (aliases conocidos del equipo CBI)
-- ============================================================
insert into public.fub_source_canonical (raw, canonical) values
  ('Idealista', 'idealista'),
  ('idealista', 'idealista'),
  ('idealista.com', 'idealista'),
  ('IDEALISTA', 'idealista'),
  ('Idealista BE', 'idealista'),
  ('Imoluc', 'imoluc'),
  ('imoluc', 'imoluc'),
  ('Imoluc.com', 'imoluc'),
  ('Rightmove', 'rightmove'),
  ('Zoopla', 'zoopla'),
  ('Facebook', 'facebook'),
  ('Facebook Ads', 'facebook'),
  ('Instagram', 'instagram'),
  ('TikTok', 'tiktok'),
  ('YouTube', 'youtube'),
  ('Google', 'google'),
  ('Google Ads', 'google'),
  ('Referral', 'referral'),
  ('Referido', 'referral'),
  ('Sphere', 'sphere'),
  ('Repeat Client', 'sphere'),
  ('Walk-in', 'walk-in'),
  ('CBI Website', 'cbi-web'),
  ('costablancainvestments.com', 'cbi-web')
on conflict (raw) do update set canonical = excluded.canonical;
