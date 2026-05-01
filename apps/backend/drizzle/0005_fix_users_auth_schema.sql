CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS auth_verifier_hash text;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS kdf_salt text;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS account_status text;

UPDATE public.users
SET account_status = 'active'
WHERE account_status IS NULL;

ALTER TABLE public.users
  ALTER COLUMN account_status SET DEFAULT 'active';

ALTER TABLE public.users
  ALTER COLUMN account_status SET NOT NULL;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS mfa_enabled boolean;

UPDATE public.users
SET mfa_enabled = false
WHERE mfa_enabled IS NULL;

ALTER TABLE public.users
  ALTER COLUMN mfa_enabled SET DEFAULT false;

ALTER TABLE public.users
  ALTER COLUMN mfa_enabled SET NOT NULL;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS mfa_secret text;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_login timestamp;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS created_at timestamp;

UPDATE public.users
SET created_at = now()
WHERE created_at IS NULL;

ALTER TABLE public.users
  ALTER COLUMN created_at SET DEFAULT now();

ALTER TABLE public.users
  ALTER COLUMN created_at SET NOT NULL;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS updated_at timestamp;

UPDATE public.users
SET updated_at = now()
WHERE updated_at IS NULL;

ALTER TABLE public.users
  ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE public.users
  ALTER COLUMN updated_at SET NOT NULL;

DO $$
DECLARE
  user_id_type text;
BEGIN
  SELECT format_type(a.atttypid, a.atttypmod)
  INTO user_id_type
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'users'
    AND a.attname = 'id'
    AND NOT a.attisdropped;

  IF user_id_type IS NULL THEN
    RAISE EXCEPTION 'users.id column not found';
  END IF;

  IF to_regclass('public.recovery_artifacts') IS NULL THEN
    EXECUTE format(
      'CREATE TABLE public.recovery_artifacts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id %s NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        encrypted_recovery_artifact text NOT NULL,
        iv text NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp
      )',
      user_id_type
    );
  END IF;
END $$;

ALTER TABLE public.recovery_artifacts
  ADD COLUMN IF NOT EXISTS encrypted_recovery_artifact text;

ALTER TABLE public.recovery_artifacts
  ADD COLUMN IF NOT EXISTS iv text;

ALTER TABLE public.recovery_artifacts
  ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT now();

ALTER TABLE public.recovery_artifacts
  ADD COLUMN IF NOT EXISTS updated_at timestamp;

UPDATE public.recovery_artifacts
SET created_at = now()
WHERE created_at IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.recovery_artifacts
    WHERE encrypted_recovery_artifact IS NULL OR iv IS NULL
  ) THEN
    RAISE EXCEPTION
      'recovery_artifacts contains null encrypted_recovery_artifact or iv values';
  END IF;
END $$;

ALTER TABLE public.recovery_artifacts
  ALTER COLUMN encrypted_recovery_artifact SET NOT NULL;

ALTER TABLE public.recovery_artifacts
  ALTER COLUMN iv SET NOT NULL;

ALTER TABLE public.recovery_artifacts
  ALTER COLUMN created_at SET DEFAULT now();

ALTER TABLE public.recovery_artifacts
  ALTER COLUMN created_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS recovery_artifacts_user_id_idx
  ON public.recovery_artifacts(user_id);
