import { config as loadEnv } from "dotenv";

let envLoaded = false;

export const ensureServerEnvLoaded = (env = process.env) => {
  if (envLoaded) {
    return;
  }

  if (env.NODE_ENV === "test" || env.SKIP_DOTENV_AUTOLOAD === "true") {
    envLoaded = true;
    return;
  }

  loadEnv();
  envLoaded = true;
};

ensureServerEnvLoaded();
