CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.users (
  id varchar PRIMARY KEY DEFAULT (gen_random_uuid())::text NOT NULL,
  email varchar(255) NOT NULL,
  password_hash text NOT NULL,
  first_name varchar(100),
  last_name varchar(100),
  profile_image_url varchar(500),
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique
  ON public.users(email);

CREATE TABLE IF NOT EXISTS public.projects (
  id varchar PRIMARY KEY DEFAULT (gen_random_uuid())::text NOT NULL,
  title text NOT NULL,
  script_content text,
  user_id varchar,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.scenes (
  id varchar PRIMARY KEY DEFAULT (gen_random_uuid())::text NOT NULL,
  project_id varchar NOT NULL,
  scene_number integer NOT NULL,
  title text NOT NULL,
  location text NOT NULL,
  time_of_day text NOT NULL,
  characters jsonb NOT NULL,
  description text,
  shot_count integer DEFAULT 0 NOT NULL,
  status text DEFAULT 'planned' NOT NULL
);

CREATE TABLE IF NOT EXISTS public.characters (
  id varchar PRIMARY KEY DEFAULT (gen_random_uuid())::text NOT NULL,
  project_id varchar NOT NULL,
  name text NOT NULL,
  appearances integer DEFAULT 0 NOT NULL,
  consistency_status text DEFAULT 'good' NOT NULL,
  last_seen text,
  notes text
);

CREATE TABLE IF NOT EXISTS public.shots (
  id varchar PRIMARY KEY DEFAULT (gen_random_uuid())::text NOT NULL,
  scene_id varchar NOT NULL,
  shot_number integer NOT NULL,
  shot_type text NOT NULL,
  camera_angle text NOT NULL,
  camera_movement text NOT NULL,
  lighting text NOT NULL,
  ai_suggestion text
);

CREATE TABLE IF NOT EXISTS public.sessions (
  sid varchar PRIMARY KEY NOT NULL,
  sess jsonb NOT NULL,
  expire timestamp NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'projects_user_id_users_id_fk'
  ) THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT projects_user_id_users_id_fk
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'scenes_project_id_projects_id_fk'
  ) THEN
    ALTER TABLE public.scenes
      ADD CONSTRAINT scenes_project_id_projects_id_fk
      FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'characters_project_id_projects_id_fk'
  ) THEN
    ALTER TABLE public.characters
      ADD CONSTRAINT characters_project_id_projects_id_fk
      FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'shots_scene_id_scenes_id_fk'
  ) THEN
    ALTER TABLE public.shots
      ADD CONSTRAINT shots_scene_id_scenes_id_fk
      FOREIGN KEY (scene_id) REFERENCES public.scenes(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_projects_user_id
  ON public.projects(user_id);

CREATE INDEX IF NOT EXISTS idx_projects_created_at
  ON public.projects(created_at);

CREATE INDEX IF NOT EXISTS idx_projects_user_created
  ON public.projects(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_projects_id_user
  ON public.projects(id, user_id);

CREATE INDEX IF NOT EXISTS idx_scenes_project_id
  ON public.scenes(project_id);

CREATE INDEX IF NOT EXISTS idx_scenes_project_number
  ON public.scenes(project_id, scene_number);

CREATE INDEX IF NOT EXISTS idx_scenes_id_project
  ON public.scenes(id, project_id);

CREATE INDEX IF NOT EXISTS idx_scenes_project_status
  ON public.scenes(project_id, status);

CREATE INDEX IF NOT EXISTS idx_characters_project_id
  ON public.characters(project_id);

CREATE INDEX IF NOT EXISTS idx_characters_id_project
  ON public.characters(id, project_id);

CREATE INDEX IF NOT EXISTS idx_characters_project_name
  ON public.characters(project_id, name);

CREATE INDEX IF NOT EXISTS idx_characters_project_consistency
  ON public.characters(project_id, consistency_status);

CREATE INDEX IF NOT EXISTS idx_shots_scene_id
  ON public.shots(scene_id);

CREATE INDEX IF NOT EXISTS idx_shots_scene_number
  ON public.shots(scene_id, shot_number);

CREATE INDEX IF NOT EXISTS idx_shots_id_scene
  ON public.shots(id, scene_id);

CREATE INDEX IF NOT EXISTS idx_shots_scene_type
  ON public.shots(scene_id, shot_type);

CREATE INDEX IF NOT EXISTS "IDX_session_expire"
  ON public.sessions(expire);
