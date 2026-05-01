CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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

  IF to_regclass('public.refresh_tokens') IS NULL THEN
    EXECUTE format(
      'CREATE TABLE public.refresh_tokens (
        id varchar PRIMARY KEY DEFAULT (gen_random_uuid())::text NOT NULL,
        user_id %s NOT NULL,
        token text NOT NULL,
        expires_at timestamp NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL,
        CONSTRAINT refresh_tokens_user_id_users_id_fk
          FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
      )',
      user_id_type
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'refresh_tokens_user_id_users_id_fk'
  ) THEN
    ALTER TABLE public.refresh_tokens
      ADD CONSTRAINT refresh_tokens_user_id_users_id_fk
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE public.refresh_tokens
  ADD COLUMN IF NOT EXISTS token text;

ALTER TABLE public.refresh_tokens
  ADD COLUMN IF NOT EXISTS expires_at timestamp;

ALTER TABLE public.refresh_tokens
  ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT now();

UPDATE public.refresh_tokens
SET created_at = now()
WHERE created_at IS NULL;

ALTER TABLE public.refresh_tokens
  ALTER COLUMN token SET NOT NULL;

ALTER TABLE public.refresh_tokens
  ALTER COLUMN expires_at SET NOT NULL;

ALTER TABLE public.refresh_tokens
  ALTER COLUMN created_at SET DEFAULT now();

ALTER TABLE public.refresh_tokens
  ALTER COLUMN created_at SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS refresh_tokens_token_unique
  ON public.refresh_tokens(token);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id
  ON public.refresh_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token
  ON public.refresh_tokens(token);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at
  ON public.refresh_tokens(expires_at);
