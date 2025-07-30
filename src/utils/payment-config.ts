import dotenv from "dotenv";
dotenv.config();

export const PAYMENT_PROCESSORS = {
  default: {
    url:
      process.env.DEFAULT_PROCESSOR_URL ||
      "http://payment-processor-default:8080",
    name: "Default",
    fee: 0.05,
    token: process.env.PROCESSOR_TOKEN || "123",
  },
  fallback: {
    url:
      process.env.FALLBACK_PROCESSOR_URL ||
      "http://payment-processor-fallback:8080",
    name: "Fallback",
    fee: 0.15,
    token: process.env.PROCESSOR_TOKEN || "123",
  },
};

export const PROCESSOR_CONFIG = {
  timeout: 5000,
  endpoint: "/payments",
  healthEndpoint: "/payments/service-health",
};
