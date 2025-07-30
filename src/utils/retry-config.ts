import dotenv from "dotenv";
dotenv.config();

export const RETRY_CONFIG = {
  maxAttempts: parseInt(process.env.MAX_RETRY_ATTEMPTS || "5"),

  initialDelay: parseInt(process.env.INITIAL_RETRY_DELAY || "2000"),

  maxDelay: parseInt(process.env.MAX_RETRY_DELAY || "30000"),

  backoffType: (process.env.RETRY_BACKOFF_TYPE || "exponential") as
    | "exponential"
    | "fixed",

  keepCompleted: parseInt(process.env.KEEP_COMPLETED_JOBS || "10"),

  keepFailed: parseInt(process.env.KEEP_FAILED_JOBS || "50"),
};

if (RETRY_CONFIG.maxAttempts < 1) {
  RETRY_CONFIG.maxAttempts = 1;
}

if (RETRY_CONFIG.initialDelay < 100) {
  RETRY_CONFIG.initialDelay = 100;
}

console.log("🔧 Configuração de Retry carregada:", RETRY_CONFIG);
