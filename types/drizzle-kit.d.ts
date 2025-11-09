declare module "drizzle-kit" {
  export interface DrizzleConfig {
    out: string;
    schema: string | string[];
    dialect: string;
    dbCredentials: {
      url: string;
    };
  }

  export function defineConfig(config: DrizzleConfig): DrizzleConfig;
}
