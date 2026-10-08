-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL,
  is_admin boolean DEFAULT false,
  assigned_scope jsonb DEFAULT '{"allowed_actors": [], "allowed_hashtag_groups": []}'::jsonb,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.project_config (
  config_id character varying NOT NULL DEFAULT 'MAIN_STUDY'::character varying,
  project_name text NOT NULL,
  intervention_date date NOT NULL,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT project_config_pkey PRIMARY KEY (config_id)
);
CREATE TABLE public.hashtag_groups (
  group_id character varying NOT NULL,
  group_name character varying NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT hashtag_groups_pkey PRIMARY KEY (group_id)
);
CREATE TABLE public.hashtags (
  hashtag_id bigint NOT NULL DEFAULT nextval('hashtags_hashtag_id_seq'::regclass),
  hashtag_text character varying NOT NULL UNIQUE,
  keyword_track character varying NOT NULL DEFAULT 'ADAPTIVE'::character varying CHECK (keyword_track::text = ANY (ARRAY['FIXED'::character varying, 'ADAPTIVE'::character varying]::text[])),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT hashtags_pkey PRIMARY KEY (hashtag_id)
);
CREATE TABLE public.apify_actors (
  actor_id character varying NOT NULL,
  actor_name character varying NOT NULL,
  platform character varying NOT NULL,
  default_config jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT apify_actors_pkey PRIMARY KEY (actor_id)
);
CREATE TABLE public.collection_runs (
  run_id bigint NOT NULL DEFAULT nextval('collection_runs_run_id_seq'::regclass),
  researcher_code character varying NOT NULL,
  platform character varying NOT NULL,
  actor_id character varying NOT NULL,
  query_parameters jsonb,
  started_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at timestamp with time zone,
  items_count integer DEFAULT 0,
  status character varying DEFAULT 'SUCCESS'::character varying CHECK (status::text = ANY (ARRAY['PLANNED'::character varying, 'QUEUED'::character varying, 'RUNNING'::character varying, 'SUCCESS'::character varying, 'FAILED'::character varying, 'PARTIAL_SUCCESS'::character varying]::text[])),
  priority smallint NOT NULL DEFAULT 1,
  scheduled_at timestamp with time zone,
  apify_run_id text,
  apify_dataset_id text,
  error_message text,
  CONSTRAINT collection_runs_pkey PRIMARY KEY (run_id),
  CONSTRAINT collection_runs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.apify_actors(actor_id)
);
CREATE TABLE public.posts (
  post_id character varying NOT NULL,
  platform character varying NOT NULL,
  post_url text NOT NULL,
  author_hash character varying,
  published_at timestamp with time zone NOT NULL,
  raw_text text,
  raw_payload jsonb,
  content_cluster_id uuid,
  is_flagged boolean DEFAULT false,
  flag_reason character varying,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT posts_pkey PRIMARY KEY (post_id)
);
CREATE TABLE public.post_snapshots (
  snapshot_id bigint NOT NULL DEFAULT nextval('post_snapshots_snapshot_id_seq'::regclass),
  post_id character varying NOT NULL,
  run_id bigint,
  observed_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  view_count bigint,
  like_count bigint,
  comment_count bigint,
  share_count bigint,
  CONSTRAINT post_snapshots_pkey PRIMARY KEY (snapshot_id),
  CONSTRAINT post_snapshots_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(post_id),
  CONSTRAINT post_snapshots_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.collection_runs(run_id)
);
CREATE TABLE public.post_hashtag_matches (
  match_id bigint NOT NULL DEFAULT nextval('post_hashtag_matches_match_id_seq'::regclass),
  post_id character varying NOT NULL,
  hashtag_id bigint NOT NULL,
  match_type character varying NOT NULL DEFAULT 'SEARCH_HIT'::character varying CHECK (match_type::text = ANY (ARRAY['CAPTION'::character varying, 'SEARCH_HIT'::character varying]::text[])),
  matched_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT post_hashtag_matches_pkey PRIMARY KEY (match_id),
  CONSTRAINT post_hashtag_matches_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(post_id),
  CONSTRAINT post_hashtag_matches_hashtag_id_fkey FOREIGN KEY (hashtag_id) REFERENCES public.hashtags(hashtag_id)
);
CREATE TABLE public.post_discoveries (
  discovery_id bigint NOT NULL DEFAULT nextval('post_discoveries_discovery_id_seq'::regclass),
  post_id character varying NOT NULL,
  run_id bigint NOT NULL,
  researcher_code character varying NOT NULL,
  discovered_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT post_discoveries_pkey PRIMARY KEY (discovery_id),
  CONSTRAINT post_discoveries_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(post_id),
  CONSTRAINT post_discoveries_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.collection_runs(run_id)
);
CREATE TABLE public.hashtag_group_mapping (
  hashtag_id bigint NOT NULL,
  group_id character varying NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT hashtag_group_mapping_pkey PRIMARY KEY (hashtag_id, group_id),
  CONSTRAINT hashtag_group_mapping_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.hashtag_groups(group_id),
  CONSTRAINT hashtag_group_mapping_hashtag_id_fkey FOREIGN KEY (hashtag_id) REFERENCES public.hashtags(hashtag_id)
);
CREATE TABLE public.system_settings (
  setting_key character varying NOT NULL,
  setting_value text NOT NULL,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT system_settings_pkey PRIMARY KEY (setting_key)
);
CREATE TABLE public.post_hashtag_facts (
  post_id character varying NOT NULL,
  hashtag_id bigint NOT NULL,
  match_type character varying NOT NULL DEFAULT 'SEARCH_HIT'::character varying CHECK (match_type::text = ANY (ARRAY['CAPTION'::character varying::text, 'SEARCH_HIT'::character varying::text])),
  first_seen_run_id bigint,
  first_seen_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT post_hashtag_facts_pkey PRIMARY KEY (post_id, hashtag_id, match_type),
  CONSTRAINT post_hashtag_facts_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(post_id),
  CONSTRAINT post_hashtag_facts_hashtag_id_fkey FOREIGN KEY (hashtag_id) REFERENCES public.hashtags(hashtag_id),
  CONSTRAINT post_hashtag_facts_first_seen_run_id_fkey FOREIGN KEY (first_seen_run_id) REFERENCES public.collection_runs(run_id)
);
CREATE TABLE public.hashtag_scan_events (
  run_id bigint NOT NULL,
  post_id character varying NOT NULL,
  hashtag_id bigint NOT NULL,
  match_type character varying NOT NULL DEFAULT 'SEARCH_HIT'::character varying CHECK (match_type::text = ANY (ARRAY['CAPTION'::character varying::text, 'SEARCH_HIT'::character varying::text])),
  discovery_order integer NOT NULL DEFAULT 0,
  researcher_code character varying,
  recorded_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT hashtag_scan_events_pkey PRIMARY KEY (run_id, post_id, hashtag_id, match_type),
  CONSTRAINT hashtag_scan_events_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.collection_runs(run_id),
  CONSTRAINT hashtag_scan_events_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(post_id),
  CONSTRAINT hashtag_scan_events_hashtag_id_fkey FOREIGN KEY (hashtag_id) REFERENCES public.hashtags(hashtag_id)
);