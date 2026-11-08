-- ============================================================================
-- Migration 0022 — Strutturatore AI
-- Marca gli step generati dall'AI (strutturatore o coach AI) per distinguerli
-- da quelli scritti a mano nel builder: l'AI può rigenerare i propri senza
-- mai toccare quelli manuali.
-- ============================================================================
alter table public.session_steps
  add column if not exists ai_generated boolean not null default false;
