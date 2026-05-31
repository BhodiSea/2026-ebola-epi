export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      case_counts: {
        Row: {
          admin2_code: string | null;
          as_of: string;
          created_at: string;
          escalation_class: string | null;
          extraction_run_id: string;
          id: string;
          metric: string;
          model_id: string;
          outbreak_id: string;
          prompt_version_hash: string;
          source_quote_id: string;
          status: string;
          superseded_by: string | null;
          value: number;
        };
        Insert: {
          admin2_code?: string | null;
          as_of: string;
          created_at?: string;
          escalation_class?: string | null;
          extraction_run_id: string;
          id?: string;
          metric: string;
          model_id: string;
          outbreak_id: string;
          prompt_version_hash: string;
          source_quote_id: string;
          status?: string;
          superseded_by?: string | null;
          value: number;
        };
        Update: {
          admin2_code?: string | null;
          as_of?: string;
          created_at?: string;
          escalation_class?: string | null;
          extraction_run_id?: string;
          id?: string;
          metric?: string;
          model_id?: string;
          outbreak_id?: string;
          prompt_version_hash?: string;
          source_quote_id?: string;
          status?: string;
          superseded_by?: string | null;
          value?: number;
        };
        Relationships: [
          {
            foreignKeyName: "case_counts_admin2_code_fkey";
            columns: ["admin2_code"];
            isOneToOne: false;
            referencedRelation: "zone_codes";
            referencedColumns: ["code"];
          },
          {
            foreignKeyName: "case_counts_extraction_run_id_fkey";
            columns: ["extraction_run_id"];
            isOneToOne: false;
            referencedRelation: "extraction_runs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "case_counts_outbreak_id_fkey";
            columns: ["outbreak_id"];
            isOneToOne: false;
            referencedRelation: "outbreaks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "case_counts_source_quote_id_fkey";
            columns: ["source_quote_id"];
            isOneToOne: false;
            referencedRelation: "quote_custody";
            referencedColumns: ["quote_id"];
          },
          {
            foreignKeyName: "case_counts_source_quote_id_fkey";
            columns: ["source_quote_id"];
            isOneToOne: false;
            referencedRelation: "source_quotes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "case_counts_superseded_by_fkey";
            columns: ["superseded_by"];
            isOneToOne: false;
            referencedRelation: "case_counts";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_briefs: {
        Row: {
          body: string;
          created_at: string;
          date: string;
          headline: string;
          model_id: string;
          review_status: string;
          severity: string | null;
          source_quote_ids: string[];
          updated_at: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          date: string;
          headline: string;
          model_id: string;
          review_status?: string;
          severity?: string | null;
          source_quote_ids?: string[];
          updated_at?: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          date?: string;
          headline?: string;
          model_id?: string;
          review_status?: string;
          severity?: string | null;
          source_quote_ids?: string[];
          updated_at?: string;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          etag: string | null;
          full_text: string;
          full_text_tsv: unknown;
          http_status: number | null;
          id: string;
          ingested_at: string;
          last_modified: string | null;
          license: string | null;
          published_at: string | null;
          sha256: string;
          source_id: string;
          title: string | null;
          url: string;
        };
        Insert: {
          etag?: string | null;
          full_text: string;
          full_text_tsv?: unknown;
          http_status?: number | null;
          id?: string;
          ingested_at?: string;
          last_modified?: string | null;
          license?: string | null;
          published_at?: string | null;
          sha256: string;
          source_id: string;
          title?: string | null;
          url: string;
        };
        Update: {
          etag?: string | null;
          full_text?: string;
          full_text_tsv?: unknown;
          http_status?: number | null;
          id?: string;
          ingested_at?: string;
          last_modified?: string | null;
          license?: string | null;
          published_at?: string | null;
          sha256?: string;
          source_id?: string;
          title?: string | null;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "documents_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "sources";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "sources_with_health";
            referencedColumns: ["id"];
          },
        ];
      };
      extraction_eval_scores: {
        Row: {
          evaluated_at: string;
          metric: string;
          run_id: string;
          score: number;
          source_slug: string | null;
        };
        Insert: {
          evaluated_at?: string;
          metric: string;
          run_id: string;
          score: number;
          source_slug?: string | null;
        };
        Update: {
          evaluated_at?: string;
          metric?: string;
          run_id?: string;
          score?: number;
          source_slug?: string | null;
        };
        Relationships: [];
      };
      incidents: {
        Row: {
          ack_at: string | null;
          ack_by: string | null;
          class: string;
          created_at: string;
          detail: Json;
          document_id: string | null;
          id: string;
          outbreak_id: string | null;
          snoozed_until: string | null;
          status: string;
          thread_id: string | null;
        };
        Insert: {
          ack_at?: string | null;
          ack_by?: string | null;
          class: string;
          created_at?: string;
          detail?: Json;
          document_id?: string | null;
          id?: string;
          outbreak_id?: string | null;
          snoozed_until?: string | null;
          status?: string;
          thread_id?: string | null;
        };
        Update: {
          ack_at?: string | null;
          ack_by?: string | null;
          class?: string;
          created_at?: string;
          detail?: Json;
          document_id?: string | null;
          id?: string;
          outbreak_id?: string | null;
          snoozed_until?: string | null;
          status?: string;
          thread_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "incidents_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "incidents_outbreak_id_fkey";
            columns: ["outbreak_id"];
            isOneToOne: false;
            referencedRelation: "outbreaks";
            referencedColumns: ["id"];
          },
        ];
      };
      outbreaks: {
        Row: {
          country_iso3: string;
          created_at: string;
          id: string;
          name: string | null;
          onset_date: string;
          pathogen_icd11: string;
          pathogen_slug: string | null;
          severity_level: string | null;
          status: string;
        };
        Insert: {
          country_iso3: string;
          created_at?: string;
          id?: string;
          name?: string | null;
          onset_date: string;
          pathogen_icd11: string;
          pathogen_slug?: string | null;
          severity_level?: string | null;
          status?: string;
        };
        Update: {
          country_iso3?: string;
          created_at?: string;
          id?: string;
          name?: string | null;
          onset_date?: string;
          pathogen_icd11?: string;
          pathogen_slug?: string | null;
          severity_level?: string | null;
          status?: string;
        };
        Relationships: [];
      };
      source_quotes: {
        Row: {
          char_end: number;
          char_start: number;
          created_at: string;
          document_id: string;
          embedding: string | null;
          id: string;
          quote_text: string;
        };
        Insert: {
          char_end: number;
          char_start: number;
          created_at?: string;
          document_id: string;
          embedding?: string | null;
          id?: string;
          quote_text: string;
        };
        Update: {
          char_end?: number;
          char_start?: number;
          created_at?: string;
          document_id?: string;
          embedding?: string | null;
          id?: string;
          quote_text?: string;
        };
        Relationships: [
          {
            foreignKeyName: "source_quotes_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
        ];
      };
      sources: {
        Row: {
          attribution_required: boolean;
          created_at: string;
          extraction_paused: boolean;
          id: string;
          last_fetched_at: string | null;
          license_tier: string;
          license_url: string | null;
          metadata: Json;
          name: string;
          parser_version: string | null;
          slug: string;
          trust_score: number;
          url: string;
        };
        Insert: {
          attribution_required?: boolean;
          created_at?: string;
          extraction_paused?: boolean;
          id?: string;
          last_fetched_at?: string | null;
          license_tier?: string;
          license_url?: string | null;
          metadata?: Json;
          name: string;
          parser_version?: string | null;
          slug: string;
          trust_score?: number;
          url: string;
        };
        Update: {
          attribution_required?: boolean;
          created_at?: string;
          extraction_paused?: boolean;
          id?: string;
          last_fetched_at?: string | null;
          license_tier?: string;
          license_url?: string | null;
          metadata?: Json;
          name?: string;
          parser_version?: string | null;
          slug?: string;
          trust_score?: number;
          url?: string;
        };
        Relationships: [];
      };
      spatial_ref_sys: {
        Row: {
          auth_name: string | null;
          auth_srid: number | null;
          proj4text: string | null;
          srid: number;
          srtext: string | null;
        };
        Insert: {
          auth_name?: string | null;
          auth_srid?: number | null;
          proj4text?: string | null;
          srid: number;
          srtext?: string | null;
        };
        Update: {
          auth_name?: string | null;
          auth_srid?: number | null;
          proj4text?: string | null;
          srid?: number;
          srtext?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      agent_actions: {
        Row: {
          action: string | null;
          agent: string | null;
          id: number | null;
          payload: Json | null;
          subject_id: string | null;
          subject_table: string | null;
          trace_id: string | null;
          ts: string | null;
        };
        Insert: {
          action?: string | null;
          agent?: string | null;
          id?: number | null;
          payload?: Json | null;
          subject_id?: string | null;
          subject_table?: string | null;
          trace_id?: string | null;
          ts?: string | null;
        };
        Update: {
          action?: string | null;
          agent?: string | null;
          id?: number | null;
          payload?: Json | null;
          subject_id?: string | null;
          subject_table?: string | null;
          trace_id?: string | null;
          ts?: string | null;
        };
        Relationships: [];
      };
      anthropic_usage_daily: {
        Row: {
          day: string | null;
          model_id: string | null;
          total_cost: number | null;
        };
        Relationships: [];
      };
      anthropic_usage_log: {
        Row: {
          cache_creation_input_tokens: number | null;
          cache_read_input_tokens: number | null;
          cost_usd: number | null;
          extraction_run_id: string | null;
          id: number | null;
          input_tokens: number | null;
          logged_at: string | null;
          model_id: string | null;
          output_tokens: number | null;
        };
        Insert: {
          cache_creation_input_tokens?: number | null;
          cache_read_input_tokens?: number | null;
          cost_usd?: number | null;
          extraction_run_id?: string | null;
          id?: number | null;
          input_tokens?: number | null;
          logged_at?: string | null;
          model_id?: string | null;
          output_tokens?: number | null;
        };
        Update: {
          cache_creation_input_tokens?: number | null;
          cache_read_input_tokens?: number | null;
          cost_usd?: number | null;
          extraction_run_id?: string | null;
          id?: number | null;
          input_tokens?: number | null;
          logged_at?: string | null;
          model_id?: string | null;
          output_tokens?: number | null;
        };
        Relationships: [];
      };
      batch_results: {
        Row: {
          batch_id: string | null;
          created_at: string | null;
          custom_id: string | null;
          document_id: string | null;
          id: string | null;
          result: Json | null;
        };
        Insert: {
          batch_id?: string | null;
          created_at?: string | null;
          custom_id?: string | null;
          document_id?: string | null;
          id?: string | null;
          result?: Json | null;
        };
        Update: {
          batch_id?: string | null;
          created_at?: string | null;
          custom_id?: string | null;
          document_id?: string | null;
          id?: string | null;
          result?: Json | null;
        };
        Relationships: [];
      };
      extraction_runs: {
        Row: {
          cache_creation_input_tokens: number | null;
          cache_read_input_tokens: number | null;
          created_at: string | null;
          document_id: string | null;
          ended_at: string | null;
          id: string | null;
          input_doc_sha256: string | null;
          input_tokens: number | null;
          model_id: string | null;
          output_tokens: number | null;
          prompt_version_hash: string | null;
          rows_extracted: number | null;
          rows_verified: number | null;
          schema_version: string | null;
          source_quote_ids: string[] | null;
          started_at: string | null;
          temperature: number | null;
          tool_schema_hash: string | null;
        };
        Insert: {
          cache_creation_input_tokens?: number | null;
          cache_read_input_tokens?: number | null;
          created_at?: string | null;
          document_id?: string | null;
          ended_at?: string | null;
          id?: string | null;
          input_doc_sha256?: string | null;
          input_tokens?: number | null;
          model_id?: string | null;
          output_tokens?: number | null;
          prompt_version_hash?: string | null;
          rows_extracted?: number | null;
          rows_verified?: number | null;
          schema_version?: string | null;
          source_quote_ids?: string[] | null;
          started_at?: string | null;
          temperature?: number | null;
          tool_schema_hash?: string | null;
        };
        Update: {
          cache_creation_input_tokens?: number | null;
          cache_read_input_tokens?: number | null;
          created_at?: string | null;
          document_id?: string | null;
          ended_at?: string | null;
          id?: string | null;
          input_doc_sha256?: string | null;
          input_tokens?: number | null;
          model_id?: string | null;
          output_tokens?: number | null;
          prompt_version_hash?: string | null;
          rows_extracted?: number | null;
          rows_verified?: number | null;
          schema_version?: string | null;
          source_quote_ids?: string[] | null;
          started_at?: string | null;
          temperature?: number | null;
          tool_schema_hash?: string | null;
        };
        Relationships: [];
      };
      geography_columns: {
        Row: {
          coord_dimension: number | null;
          f_geography_column: unknown;
          f_table_catalog: unknown;
          f_table_name: unknown;
          f_table_schema: unknown;
          srid: number | null;
          type: string | null;
        };
        Relationships: [];
      };
      geometry_columns: {
        Row: {
          coord_dimension: number | null;
          f_geometry_column: unknown;
          f_table_catalog: string | null;
          f_table_name: unknown;
          f_table_schema: unknown;
          srid: number | null;
          type: string | null;
        };
        Insert: {
          coord_dimension?: number | null;
          f_geometry_column?: unknown;
          f_table_catalog?: string | null;
          f_table_name?: unknown;
          f_table_schema?: unknown;
          srid?: number | null;
          type?: string | null;
        };
        Update: {
          coord_dimension?: number | null;
          f_geometry_column?: unknown;
          f_table_catalog?: string | null;
          f_table_name?: unknown;
          f_table_schema?: unknown;
          srid?: number | null;
          type?: string | null;
        };
        Relationships: [];
      };
      quote_custody: {
        Row: {
          anomaly_open: boolean | null;
          confidence: number | null;
          quote_id: string | null;
          reviewed_at: string | null;
        };
        Relationships: [];
      };
      shadow_results: {
        Row: {
          candidate_version: string | null;
          created_at: string | null;
          document_id: string | null;
          field_variances: Json | null;
          id: string | null;
          production_run_id: string | null;
          promoted: boolean | null;
        };
        Insert: {
          candidate_version?: string | null;
          created_at?: string | null;
          document_id?: string | null;
          field_variances?: Json | null;
          id?: string | null;
          production_run_id?: string | null;
          promoted?: boolean | null;
        };
        Update: {
          candidate_version?: string | null;
          created_at?: string | null;
          document_id?: string | null;
          field_variances?: Json | null;
          id?: string | null;
          production_run_id?: string | null;
          promoted?: boolean | null;
        };
        Relationships: [];
      };
      sources_with_health: {
        Row: {
          extraction_paused: boolean | null;
          failure_count_7d: number | null;
          id: string | null;
          last_fetched_at: string | null;
          license_tier: string | null;
          name: string | null;
          parser_version: string | null;
          slug: string | null;
        };
        Insert: {
          extraction_paused?: boolean | null;
          failure_count_7d?: never;
          id?: string | null;
          last_fetched_at?: string | null;
          license_tier?: string | null;
          name?: string | null;
          parser_version?: string | null;
          slug?: string | null;
        };
        Update: {
          extraction_paused?: boolean | null;
          failure_count_7d?: never;
          id?: string | null;
          last_fetched_at?: string | null;
          license_tier?: string | null;
          name?: string | null;
          parser_version?: string | null;
          slug?: string | null;
        };
        Relationships: [];
      };
      zone_codes: {
        Row: {
          admin1_code: string | null;
          code: string | null;
          name: string | null;
        };
        Insert: {
          admin1_code?: string | null;
          code?: string | null;
          name?: string | null;
        };
        Update: {
          admin1_code?: string | null;
          code?: string | null;
          name?: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      __plpgsql_show_dependency_tb:
        | {
            Args: {
              anycompatiblerangetype?: unknown;
              anycompatibletype?: unknown;
              anyelememttype?: unknown;
              anyenumtype?: unknown;
              anyrangetype?: unknown;
              funcoid: unknown;
              relid?: unknown;
            };
            Returns: {
              name: string;
              oid: unknown;
              params: string;
              schema: string;
              type: string;
            }[];
          }
        | {
            Args: {
              anycompatiblerangetype?: unknown;
              anycompatibletype?: unknown;
              anyelememttype?: unknown;
              anyenumtype?: unknown;
              anyrangetype?: unknown;
              name: string;
              relid?: unknown;
            };
            Returns: {
              name: string;
              oid: unknown;
              params: string;
              schema: string;
              type: string;
            }[];
          };
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string };
        Returns: undefined;
      };
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown };
        Returns: unknown;
      };
      _postgis_pgsql_version: { Args: never; Returns: string };
      _postgis_scripts_pgsql_version: { Args: never; Returns: string };
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown };
        Returns: number;
      };
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown };
        Returns: string;
      };
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_dwithin: {
        Args: {
          geog1: unknown;
          geog2: unknown;
          tolerance: number;
          use_spheroid?: boolean;
        };
        Returns: boolean;
      };
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown };
        Returns: number;
      };
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_sortablehash: { Args: { geom: unknown }; Returns: number };
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_voronoi: {
        Args: {
          clip?: unknown;
          g1: unknown;
          return_polygons?: boolean;
          tolerance?: number;
        };
        Returns: unknown;
      };
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      addauth: { Args: { "": string }; Returns: boolean };
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string;
              column_name: string;
              new_dim: number;
              new_srid_in: number;
              new_type: string;
              schema_name: string;
              table_name: string;
              use_typmod?: boolean;
            };
            Returns: string;
          }
        | {
            Args: {
              column_name: string;
              new_dim: number;
              new_srid: number;
              new_type: string;
              schema_name: string;
              table_name: string;
              use_typmod?: boolean;
            };
            Returns: string;
          }
        | {
            Args: {
              column_name: string;
              new_dim: number;
              new_srid: number;
              new_type: string;
              table_name: string;
              use_typmod?: boolean;
            };
            Returns: string;
          };
      disablelongtransactions: { Args: never; Returns: string };
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string;
              column_name: string;
              schema_name: string;
              table_name: string;
            };
            Returns: string;
          }
        | {
            Args: {
              column_name: string;
              schema_name: string;
              table_name: string;
            };
            Returns: string;
          }
        | { Args: { column_name: string; table_name: string }; Returns: string };
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string;
              schema_name: string;
              table_name: string;
            };
            Returns: string;
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string };
      enablelongtransactions: { Args: never; Returns: string };
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      geometry: { Args: { "": string }; Returns: unknown };
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geomfromewkt: { Args: { "": string }; Returns: unknown };
      get_disagreements: {
        Args: { p_outbreak_id: string };
        Returns: {
          as_of: string;
          metric: string;
          row_id: string;
          source_quote_id: string;
          source_slug: string;
          superseded_by: string;
          value: number;
        }[];
      };
      gettransactionid: { Args: never; Returns: unknown };
      longtransactionsenabled: { Args: never; Returns: boolean };
      mvt: {
        Args: { outbreak_id?: string; x: number; y: number; z: number };
        Returns: string;
      };
      outbreak_zone_svg: {
        Args: { p_outbreak_id: string };
        Returns: {
          admin2_code: string;
          bbox_xmax: number;
          bbox_xmin: number;
          bbox_ymax: number;
          bbox_ymin: number;
          name: string;
          svg_path: string;
          total_value: number;
        }[];
      };
      plpgsql_check_function:
        | {
            Args: {
              all_warnings?: boolean;
              anycompatiblerangetype?: unknown;
              anycompatibletype?: unknown;
              anyelememttype?: unknown;
              anyenumtype?: unknown;
              anyrangetype?: unknown;
              compatibility_warnings?: boolean;
              constant_tracing?: boolean;
              extra_warnings?: boolean;
              fatal_errors?: boolean;
              format?: string;
              funcoid: unknown;
              incomment_options_usage_warning?: boolean;
              newtable?: unknown;
              oldtable?: unknown;
              other_warnings?: boolean;
              performance_warnings?: boolean;
              relid?: unknown;
              security_warnings?: boolean;
              use_incomment_options?: boolean;
              without_warnings?: boolean;
            };
            Returns: string[];
          }
        | {
            Args: {
              all_warnings?: boolean;
              anycompatiblerangetype?: unknown;
              anycompatibletype?: unknown;
              anyelememttype?: unknown;
              anyenumtype?: unknown;
              anyrangetype?: unknown;
              compatibility_warnings?: boolean;
              constant_tracing?: boolean;
              extra_warnings?: boolean;
              fatal_errors?: boolean;
              format?: string;
              incomment_options_usage_warning?: boolean;
              name: string;
              newtable?: unknown;
              oldtable?: unknown;
              other_warnings?: boolean;
              performance_warnings?: boolean;
              relid?: unknown;
              security_warnings?: boolean;
              use_incomment_options?: boolean;
              without_warnings?: boolean;
            };
            Returns: string[];
          };
      plpgsql_check_function_tb:
        | {
            Args: {
              all_warnings?: boolean;
              anycompatiblerangetype?: unknown;
              anycompatibletype?: unknown;
              anyelememttype?: unknown;
              anyenumtype?: unknown;
              anyrangetype?: unknown;
              compatibility_warnings?: boolean;
              constant_tracing?: boolean;
              extra_warnings?: boolean;
              fatal_errors?: boolean;
              funcoid: unknown;
              incomment_options_usage_warning?: boolean;
              newtable?: unknown;
              oldtable?: unknown;
              other_warnings?: boolean;
              performance_warnings?: boolean;
              relid?: unknown;
              security_warnings?: boolean;
              use_incomment_options?: boolean;
              without_warnings?: boolean;
            };
            Returns: {
              context: string;
              detail: string;
              functionid: unknown;
              hint: string;
              level: string;
              lineno: number;
              message: string;
              position: number;
              query: string;
              sqlstate: string;
              statement: string;
            }[];
          }
        | {
            Args: {
              all_warnings?: boolean;
              anycompatiblerangetype?: unknown;
              anycompatibletype?: unknown;
              anyelememttype?: unknown;
              anyenumtype?: unknown;
              anyrangetype?: unknown;
              compatibility_warnings?: boolean;
              constant_tracing?: boolean;
              extra_warnings?: boolean;
              fatal_errors?: boolean;
              incomment_options_usage_warning?: boolean;
              name: string;
              newtable?: unknown;
              oldtable?: unknown;
              other_warnings?: boolean;
              performance_warnings?: boolean;
              relid?: unknown;
              security_warnings?: boolean;
              use_incomment_options?: boolean;
              without_warnings?: boolean;
            };
            Returns: {
              context: string;
              detail: string;
              functionid: unknown;
              hint: string;
              level: string;
              lineno: number;
              message: string;
              position: number;
              query: string;
              sqlstate: string;
              statement: string;
            }[];
          };
      plpgsql_check_pragma: { Args: { name: string[] }; Returns: number };
      plpgsql_check_profiler: { Args: { enable?: boolean }; Returns: boolean };
      plpgsql_check_tracer: {
        Args: { enable?: boolean; verbosity?: string };
        Returns: boolean;
      };
      plpgsql_coverage_branches:
        | { Args: { funcoid: unknown }; Returns: number }
        | { Args: { name: string }; Returns: number };
      plpgsql_coverage_statements:
        | { Args: { funcoid: unknown }; Returns: number }
        | { Args: { name: string }; Returns: number };
      plpgsql_profiler_function_statements_tb:
        | {
            Args: { funcoid: unknown };
            Returns: {
              avg_time: number;
              block_num: number;
              exec_stmts: number;
              exec_stmts_err: number;
              lineno: number;
              max_time: number;
              parent_note: string;
              parent_stmtid: number;
              processed_rows: number;
              queryid: number;
              stmtid: number;
              stmtname: string;
              total_time: number;
            }[];
          }
        | {
            Args: { name: string };
            Returns: {
              avg_time: number;
              block_num: number;
              exec_stmts: number;
              exec_stmts_err: number;
              lineno: number;
              max_time: number;
              parent_note: string;
              parent_stmtid: number;
              processed_rows: number;
              queryid: number;
              stmtid: number;
              stmtname: string;
              total_time: number;
            }[];
          };
      plpgsql_profiler_function_tb:
        | {
            Args: { funcoid: unknown };
            Returns: {
              avg_time: number;
              cmds_on_row: number;
              exec_stmts: number;
              exec_stmts_err: number;
              lineno: number;
              max_time: number[];
              processed_rows: number[];
              queryids: number[];
              source: string;
              stmt_lineno: number;
              total_time: number;
            }[];
          }
        | {
            Args: { name: string };
            Returns: {
              avg_time: number;
              cmds_on_row: number;
              exec_stmts: number;
              exec_stmts_err: number;
              lineno: number;
              max_time: number[];
              processed_rows: number[];
              queryids: number[];
              source: string;
              stmt_lineno: number;
              total_time: number;
            }[];
          };
      plpgsql_profiler_functions_all: {
        Args: never;
        Returns: {
          avg_time: number;
          exec_count: number;
          exec_stmts_err: number;
          funcoid: unknown;
          max_time: number;
          min_time: number;
          stddev_time: number;
          total_time: number;
        }[];
      };
      plpgsql_profiler_install_fake_queryid_hook: {
        Args: never;
        Returns: undefined;
      };
      plpgsql_profiler_remove_fake_queryid_hook: {
        Args: never;
        Returns: undefined;
      };
      plpgsql_profiler_reset: { Args: { funcoid: unknown }; Returns: undefined };
      plpgsql_profiler_reset_all: { Args: never; Returns: undefined };
      plpgsql_show_dependency_tb:
        | {
            Args: {
              anycompatiblerangetype?: unknown;
              anycompatibletype?: unknown;
              anyelememttype?: unknown;
              anyenumtype?: unknown;
              anyrangetype?: unknown;
              fnname: string;
              relid?: unknown;
            };
            Returns: {
              name: string;
              oid: unknown;
              params: string;
              schema: string;
              type: string;
            }[];
          }
        | {
            Args: {
              anycompatiblerangetype?: unknown;
              anycompatibletype?: unknown;
              anyelememttype?: unknown;
              anyenumtype?: unknown;
              anyrangetype?: unknown;
              funcoid: unknown;
              relid?: unknown;
            };
            Returns: {
              name: string;
              oid: unknown;
              params: string;
              schema: string;
              type: string;
            }[];
          };
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string };
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string };
        Returns: number;
      };
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string };
        Returns: number;
      };
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string };
        Returns: string;
      };
      postgis_extensions_upgrade: { Args: never; Returns: string };
      postgis_full_version: { Args: never; Returns: string };
      postgis_geos_version: { Args: never; Returns: string };
      postgis_lib_build_date: { Args: never; Returns: string };
      postgis_lib_revision: { Args: never; Returns: string };
      postgis_lib_version: { Args: never; Returns: string };
      postgis_libjson_version: { Args: never; Returns: string };
      postgis_liblwgeom_version: { Args: never; Returns: string };
      postgis_libprotobuf_version: { Args: never; Returns: string };
      postgis_libxml_version: { Args: never; Returns: string };
      postgis_proj_version: { Args: never; Returns: string };
      postgis_scripts_build_date: { Args: never; Returns: string };
      postgis_scripts_installed: { Args: never; Returns: string };
      postgis_scripts_released: { Args: never; Returns: string };
      postgis_svn_version: { Args: never; Returns: string };
      postgis_type_name: {
        Args: {
          coord_dimension: number;
          geomname: string;
          use_new_name?: boolean;
        };
        Returns: string;
      };
      postgis_version: { Args: never; Returns: string };
      postgis_wagyu_version: { Args: never; Returns: string };
      show_limit: { Args: never; Returns: number };
      show_trgm: { Args: { "": string }; Returns: string[] };
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown };
            Returns: number;
          };
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number };
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number };
        Returns: string;
      };
      st_asewkt: { Args: { "": string }; Returns: string };
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number };
            Returns: string;
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number };
            Returns: string;
          }
        | {
            Args: {
              geom_column?: string;
              maxdecimaldigits?: number;
              pretty_bool?: boolean;
              r: Record<string, unknown>;
            };
            Returns: string;
          }
        | { Args: { "": string }; Returns: string };
      st_asgml:
        | {
            Args: {
              geog: unknown;
              id?: string;
              maxdecimaldigits?: number;
              nprefix?: string;
              options?: number;
            };
            Returns: string;
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number };
            Returns: string;
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown;
              id?: string;
              maxdecimaldigits?: number;
              nprefix?: string;
              options?: number;
              version: number;
            };
            Returns: string;
          }
        | {
            Args: {
              geom: unknown;
              id?: string;
              maxdecimaldigits?: number;
              nprefix?: string;
              options?: number;
              version: number;
            };
            Returns: string;
          };
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string };
            Returns: string;
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string };
            Returns: string;
          }
        | { Args: { "": string }; Returns: string };
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string };
        Returns: string;
      };
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string };
      st_asmvtgeom: {
        Args: {
          bounds: unknown;
          buffer?: number;
          clip_geom?: boolean;
          extent?: number;
          geom: unknown;
        };
        Returns: unknown;
      };
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number };
            Returns: string;
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number };
            Returns: string;
          }
        | { Args: { "": string }; Returns: string };
      st_astext: { Args: { "": string }; Returns: string };
      st_astwkb:
        | {
            Args: {
              geom: unknown;
              prec?: number;
              prec_m?: number;
              prec_z?: number;
              with_boxes?: boolean;
              with_sizes?: boolean;
            };
            Returns: string;
          }
        | {
            Args: {
              geom: unknown[];
              ids: number[];
              prec?: number;
              prec_m?: number;
              prec_z?: number;
              with_boxes?: boolean;
              with_sizes?: boolean;
            };
            Returns: string;
          };
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number };
        Returns: string;
      };
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number };
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown };
        Returns: unknown;
      };
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number };
            Returns: unknown;
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number };
            Returns: unknown;
          };
      st_centroid: { Args: { "": string }; Returns: unknown };
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown };
        Returns: unknown;
      };
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown };
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean;
          param_geom: unknown;
          param_pctconvex: number;
        };
        Returns: unknown;
      };
      st_contains: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_coorddim: { Args: { geometry: unknown }; Returns: number };
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number };
        Returns: unknown;
      };
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number };
        Returns: unknown;
      };
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number };
        Returns: unknown;
      };
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean };
            Returns: number;
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number };
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number };
            Returns: number;
          };
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_dwithin: {
        Args: {
          geog1: unknown;
          geog2: unknown;
          tolerance: number;
          use_spheroid?: boolean;
        };
        Returns: boolean;
      };
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number };
            Returns: unknown;
          }
        | {
            Args: {
              dm?: number;
              dx: number;
              dy: number;
              dz?: number;
              geom: unknown;
            };
            Returns: unknown;
          };
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown };
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number };
        Returns: unknown;
      };
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number };
        Returns: unknown;
      };
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number };
        Returns: unknown;
      };
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number };
            Returns: unknown;
          };
      st_geogfromtext: { Args: { "": string }; Returns: unknown };
      st_geographyfromtext: { Args: { "": string }; Returns: unknown };
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string };
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown };
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean;
          g: unknown;
          max_iter?: number;
          tolerance?: number;
        };
        Returns: unknown;
      };
      st_geometryfromtext: { Args: { "": string }; Returns: unknown };
      st_geomfromewkt: { Args: { "": string }; Returns: unknown };
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown };
      st_geomfromgml: { Args: { "": string }; Returns: unknown };
      st_geomfromkml: { Args: { "": string }; Returns: unknown };
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown };
      st_geomfromtext: { Args: { "": string }; Returns: unknown };
      st_gmltosql: { Args: { "": string }; Returns: unknown };
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean };
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number };
        Returns: unknown;
      };
      st_hexagongrid: {
        Args: { bounds: unknown; size: number };
        Returns: Record<string, unknown>[];
      };
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown };
        Returns: number;
      };
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number };
        Returns: unknown;
      };
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown };
        Returns: Database["public"]["CompositeTypes"]["valid_detail"];
        SetofOptions: {
          from: "*";
          to: "valid_detail";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number };
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown };
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown };
        Returns: number;
      };
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string };
        Returns: unknown;
      };
      st_linefromtext: { Args: { "": string }; Returns: unknown };
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown };
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number };
        Returns: unknown;
      };
      st_locatebetween: {
        Args: {
          frommeasure: number;
          geometry: unknown;
          leftrightoffset?: number;
          tomeasure: number;
        };
        Returns: unknown;
      };
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number };
        Returns: unknown;
      };
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_makevalid: {
        Args: { geom: unknown; params: string };
        Returns: unknown;
      };
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number };
        Returns: unknown;
      };
      st_mlinefromtext: { Args: { "": string }; Returns: unknown };
      st_mpointfromtext: { Args: { "": string }; Returns: unknown };
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown };
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown };
      st_multipointfromtext: { Args: { "": string }; Returns: unknown };
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown };
      st_node: { Args: { g: unknown }; Returns: unknown };
      st_normalize: { Args: { geom: unknown }; Returns: unknown };
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string };
        Returns: unknown;
      };
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean };
        Returns: number;
      };
      st_pointfromtext: { Args: { "": string }; Returns: unknown };
      st_pointm: {
        Args: {
          mcoordinate: number;
          srid?: number;
          xcoordinate: number;
          ycoordinate: number;
        };
        Returns: unknown;
      };
      st_pointz: {
        Args: {
          srid?: number;
          xcoordinate: number;
          ycoordinate: number;
          zcoordinate: number;
        };
        Returns: unknown;
      };
      st_pointzm: {
        Args: {
          mcoordinate: number;
          srid?: number;
          xcoordinate: number;
          ycoordinate: number;
          zcoordinate: number;
        };
        Returns: unknown;
      };
      st_polyfromtext: { Args: { "": string }; Returns: unknown };
      st_polygonfromtext: { Args: { "": string }; Returns: unknown };
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown };
        Returns: unknown;
      };
      st_quantizecoordinates: {
        Args: {
          g: unknown;
          prec_m?: number;
          prec_x: number;
          prec_y?: number;
          prec_z?: number;
        };
        Returns: unknown;
      };
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number };
        Returns: unknown;
      };
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string };
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number };
        Returns: unknown;
      };
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number };
        Returns: unknown;
      };
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown };
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number };
        Returns: unknown;
      };
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown };
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number };
        Returns: unknown;
      };
      st_squaregrid: {
        Args: { bounds: unknown; size: number };
        Returns: Record<string, unknown>[];
      };
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number };
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number };
        Returns: unknown[];
      };
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown };
        Returns: unknown;
      };
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number };
        Returns: unknown;
      };
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_tileenvelope: {
        Args: {
          bounds?: unknown;
          margin?: number;
          x: number;
          y: number;
          zoom: number;
        };
        Returns: unknown;
      };
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string };
            Returns: unknown;
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number };
            Returns: unknown;
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown };
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown };
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number };
            Returns: unknown;
          };
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number };
        Returns: unknown;
      };
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number };
        Returns: unknown;
      };
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown };
      st_wkttosql: { Args: { "": string }; Returns: unknown };
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number };
        Returns: unknown;
      };
      unlockrows: { Args: { "": string }; Returns: number };
      updategeometrysrid: {
        Args: {
          catalogn_name: string;
          column_name: string;
          new_srid_in: number;
          schema_name: string;
          table_name: string;
        };
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null;
        geom: unknown;
      };
      valid_detail: {
        valid: boolean | null;
        reason: string | null;
        location: unknown;
      };
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
