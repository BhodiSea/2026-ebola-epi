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

export interface Database {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    CompositeTypes: {
      geometry_dump: {
        geom: unknown;
        path: null | number[];
      };
      valid_detail: {
        location: unknown;
        reason: null | string;
        valid: boolean | null;
      };
    };
    Enums: Record<never, never>;
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
        | { Args: { "": string }; Returns: number }
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number };
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number };
        Returns: string;
      };
      st_asewkt: { Args: { "": string }; Returns: string };
      st_asgeojson:
        | { Args: { "": string }; Returns: string }
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
          };
      st_asgml:
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
              geog: unknown;
              id?: string;
              maxdecimaldigits?: number;
              nprefix?: string;
              options?: number;
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
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number };
            Returns: string;
          };
      st_askml:
        | { Args: { "": string }; Returns: string }
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string };
            Returns: string;
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string };
            Returns: string;
          };
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
        | { Args: { "": string }; Returns: string }
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number };
            Returns: string;
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number };
            Returns: string;
          };
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
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number };
            Returns: number;
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number };
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
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number };
            Returns: unknown;
          }
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
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
        | {
            Args: { area: unknown; npoints: number; seed: number };
            Returns: unknown;
          }
        | { Args: { area: unknown; npoints: number }; Returns: unknown };
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
          isOneToOne: true;
          isSetofReturn: false;
          to: "valid_detail";
        };
      };
      st_length:
        | { Args: { "": string }; Returns: number }
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number };
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
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number };
            Returns: unknown;
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown };
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
    Tables: {
      case_counts: {
        Insert: {
          admin2_code?: null | string;
          as_of: string;
          created_at?: string;
          escalation_class?: null | string;
          extraction_run_id: string;
          id?: string;
          metric: string;
          model_id: string;
          outbreak_id: string;
          prompt_version_hash: string;
          source_quote_id: string;
          status?: string;
          superseded_by?: null | string;
          value: number;
        };
        Relationships: [
          {
            columns: ["extraction_run_id"];
            foreignKeyName: "case_counts_extraction_run_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "extraction_runs";
          },
          {
            columns: ["outbreak_id"];
            foreignKeyName: "case_counts_outbreak_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "outbreaks";
          },
          {
            columns: ["source_quote_id"];
            foreignKeyName: "case_counts_source_quote_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "source_quotes";
          },
          {
            columns: ["superseded_by"];
            foreignKeyName: "case_counts_superseded_by_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "case_counts";
          },
        ];
        Row: {
          admin2_code: null | string;
          as_of: string;
          created_at: string;
          escalation_class: null | string;
          extraction_run_id: string;
          id: string;
          metric: string;
          model_id: string;
          outbreak_id: string;
          prompt_version_hash: string;
          source_quote_id: string;
          status: string;
          superseded_by: null | string;
          value: number;
        };
        Update: {
          admin2_code?: null | string;
          as_of?: string;
          created_at?: string;
          escalation_class?: null | string;
          extraction_run_id?: string;
          id?: string;
          metric?: string;
          model_id?: string;
          outbreak_id?: string;
          prompt_version_hash?: string;
          source_quote_id?: string;
          status?: string;
          superseded_by?: null | string;
          value?: number;
        };
      };
      documents: {
        Insert: {
          etag?: null | string;
          full_text: string;
          full_text_tsv?: unknown;
          http_status?: null | number;
          id?: string;
          ingested_at?: string;
          last_modified?: null | string;
          license?: null | string;
          published_at?: null | string;
          sha256: string;
          source_id: string;
          title?: null | string;
          url: string;
        };
        Relationships: [
          {
            columns: ["source_id"];
            foreignKeyName: "documents_source_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "sources";
          },
        ];
        Row: {
          etag: null | string;
          full_text: string;
          full_text_tsv: unknown;
          http_status: null | number;
          id: string;
          ingested_at: string;
          last_modified: null | string;
          license: null | string;
          published_at: null | string;
          sha256: string;
          source_id: string;
          title: null | string;
          url: string;
        };
        Update: {
          etag?: null | string;
          full_text?: string;
          full_text_tsv?: unknown;
          http_status?: null | number;
          id?: string;
          ingested_at?: string;
          last_modified?: null | string;
          license?: null | string;
          published_at?: null | string;
          sha256?: string;
          source_id?: string;
          title?: null | string;
          url?: string;
        };
      };
      incidents: {
        Insert: {
          ack_at?: null | string;
          ack_by?: null | string;
          class: string;
          created_at?: string;
          detail?: Json;
          document_id?: null | string;
          id?: string;
          outbreak_id?: null | string;
          snoozed_until?: null | string;
          status?: string;
          thread_id?: null | string;
        };
        Relationships: [
          {
            columns: ["document_id"];
            foreignKeyName: "incidents_document_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "documents";
          },
          {
            columns: ["outbreak_id"];
            foreignKeyName: "incidents_outbreak_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "outbreaks";
          },
        ];
        Row: {
          ack_at: null | string;
          ack_by: null | string;
          class: string;
          created_at: string;
          detail: Json;
          document_id: null | string;
          id: string;
          outbreak_id: null | string;
          snoozed_until: null | string;
          status: string;
          thread_id: null | string;
        };
        Update: {
          ack_at?: null | string;
          ack_by?: null | string;
          class?: string;
          created_at?: string;
          detail?: Json;
          document_id?: null | string;
          id?: string;
          outbreak_id?: null | string;
          snoozed_until?: null | string;
          status?: string;
          thread_id?: null | string;
        };
      };
      outbreaks: {
        Insert: {
          country_iso3: string;
          created_at?: string;
          id?: string;
          name?: null | string;
          onset_date: string;
          pathogen_icd11: string;
          pathogen_slug?: null | string;
          severity_level?: null | string;
          status?: string;
        };
        Relationships: [];
        Row: {
          country_iso3: string;
          created_at: string;
          id: string;
          name: null | string;
          onset_date: string;
          pathogen_icd11: string;
          pathogen_slug: null | string;
          severity_level: null | string;
          status: string;
        };
        Update: {
          country_iso3?: string;
          created_at?: string;
          id?: string;
          name?: null | string;
          onset_date?: string;
          pathogen_icd11?: string;
          pathogen_slug?: null | string;
          severity_level?: null | string;
          status?: string;
        };
      };
      source_quotes: {
        Insert: {
          char_end: number;
          char_start: number;
          created_at?: string;
          document_id: string;
          embedding?: null | string;
          id?: string;
          quote_text: string;
        };
        Relationships: [
          {
            columns: ["document_id"];
            foreignKeyName: "source_quotes_document_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "documents";
          },
        ];
        Row: {
          char_end: number;
          char_start: number;
          created_at: string;
          document_id: string;
          embedding: null | string;
          id: string;
          quote_text: string;
        };
        Update: {
          char_end?: number;
          char_start?: number;
          created_at?: string;
          document_id?: string;
          embedding?: null | string;
          id?: string;
          quote_text?: string;
        };
      };
      sources: {
        Insert: {
          attribution_required?: boolean;
          created_at?: string;
          extraction_paused?: boolean;
          id?: string;
          license_tier?: string;
          license_url?: null | string;
          metadata?: Json;
          name: string;
          slug: string;
          trust_score?: number;
          url: string;
        };
        Relationships: [];
        Row: {
          attribution_required: boolean;
          created_at: string;
          extraction_paused: boolean;
          id: string;
          license_tier: string;
          license_url: null | string;
          metadata: Json;
          name: string;
          slug: string;
          trust_score: number;
          url: string;
        };
        Update: {
          attribution_required?: boolean;
          created_at?: string;
          extraction_paused?: boolean;
          id?: string;
          license_tier?: string;
          license_url?: null | string;
          metadata?: Json;
          name?: string;
          slug?: string;
          trust_score?: number;
          url?: string;
        };
      };
      spatial_ref_sys: {
        Insert: {
          auth_name?: null | string;
          auth_srid?: null | number;
          proj4text?: null | string;
          srid: number;
          srtext?: null | string;
        };
        Relationships: [];
        Row: {
          auth_name: null | string;
          auth_srid: null | number;
          proj4text: null | string;
          srid: number;
          srtext: null | string;
        };
        Update: {
          auth_name?: null | string;
          auth_srid?: null | number;
          proj4text?: null | string;
          srid?: number;
          srtext?: null | string;
        };
      };
    };
    Views: {
      anthropic_usage_daily: {
        Relationships: [];
        Row: {
          day: null | string;
          model_id: null | string;
          total_cost: null | number;
        };
      };
      anthropic_usage_log: {
        Insert: {
          cache_creation_input_tokens?: null | number;
          cache_read_input_tokens?: null | number;
          cost_usd?: null | number;
          extraction_run_id?: null | string;
          id?: null | number;
          input_tokens?: null | number;
          logged_at?: null | string;
          model_id?: null | string;
          output_tokens?: null | number;
        };
        Relationships: [];
        Row: {
          cache_creation_input_tokens: null | number;
          cache_read_input_tokens: null | number;
          cost_usd: null | number;
          extraction_run_id: null | string;
          id: null | number;
          input_tokens: null | number;
          logged_at: null | string;
          model_id: null | string;
          output_tokens: null | number;
        };
        Update: {
          cache_creation_input_tokens?: null | number;
          cache_read_input_tokens?: null | number;
          cost_usd?: null | number;
          extraction_run_id?: null | string;
          id?: null | number;
          input_tokens?: null | number;
          logged_at?: null | string;
          model_id?: null | string;
          output_tokens?: null | number;
        };
      };
      extraction_runs: {
        Insert: {
          cache_creation_input_tokens?: null | number;
          cache_read_input_tokens?: null | number;
          created_at?: null | string;
          document_id?: null | string;
          ended_at?: null | string;
          id?: null | string;
          input_doc_sha256?: null | string;
          input_tokens?: null | number;
          model_id?: null | string;
          output_tokens?: null | number;
          prompt_version_hash?: null | string;
          rows_extracted?: null | number;
          rows_verified?: null | number;
          schema_version?: null | string;
          source_quote_ids?: null | string[];
          started_at?: null | string;
          temperature?: null | number;
          tool_schema_hash?: null | string;
        };
        Relationships: [];
        Row: {
          cache_creation_input_tokens: null | number;
          cache_read_input_tokens: null | number;
          created_at: null | string;
          document_id: null | string;
          ended_at: null | string;
          id: null | string;
          input_doc_sha256: null | string;
          input_tokens: null | number;
          model_id: null | string;
          output_tokens: null | number;
          prompt_version_hash: null | string;
          rows_extracted: null | number;
          rows_verified: null | number;
          schema_version: null | string;
          source_quote_ids: null | string[];
          started_at: null | string;
          temperature: null | number;
          tool_schema_hash: null | string;
        };
        Update: {
          cache_creation_input_tokens?: null | number;
          cache_read_input_tokens?: null | number;
          created_at?: null | string;
          document_id?: null | string;
          ended_at?: null | string;
          id?: null | string;
          input_doc_sha256?: null | string;
          input_tokens?: null | number;
          model_id?: null | string;
          output_tokens?: null | number;
          prompt_version_hash?: null | string;
          rows_extracted?: null | number;
          rows_verified?: null | number;
          schema_version?: null | string;
          source_quote_ids?: null | string[];
          started_at?: null | string;
          temperature?: null | number;
          tool_schema_hash?: null | string;
        };
      };
      geography_columns: {
        Relationships: [];
        Row: {
          coord_dimension: null | number;
          f_geography_column: unknown;
          f_table_catalog: unknown;
          f_table_name: unknown;
          f_table_schema: unknown;
          srid: null | number;
          type: null | string;
        };
      };
      geometry_columns: {
        Insert: {
          coord_dimension?: null | number;
          f_geometry_column?: unknown;
          f_table_catalog?: null | string;
          f_table_name?: unknown;
          f_table_schema?: unknown;
          srid?: null | number;
          type?: null | string;
        };
        Relationships: [];
        Row: {
          coord_dimension: null | number;
          f_geometry_column: unknown;
          f_table_catalog: null | string;
          f_table_name: unknown;
          f_table_schema: unknown;
          srid: null | number;
          type: null | string;
        };
        Update: {
          coord_dimension?: null | number;
          f_geometry_column?: unknown;
          f_table_catalog?: null | string;
          f_table_name?: unknown;
          f_table_schema?: unknown;
          srid?: null | number;
          type?: null | string;
        };
      };
    };
  };
}

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

export type Json = boolean | Json[] | null | number | string | { [key: string]: Json | undefined };

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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
