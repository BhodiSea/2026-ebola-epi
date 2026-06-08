interface BackfillEnv {
  ACLED_ACCESS_TOKEN?: string;
  ACLED_EMAIL?: string;
  INNGEST_BASE_URL?: string;
  INNGEST_EVENT_KEY?: string;
  RELIEFWEB_APPNAME?: string;
}
export declare function run(argv: string[], env: BackfillEnv): Promise<void>;
//# sourceMappingURL=backfill.d.ts.map
