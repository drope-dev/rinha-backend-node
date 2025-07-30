import { Queue } from "bullmq";
import dotenv from "dotenv";
import { RETRY_CONFIG } from "./utils/retry-config";
dotenv.config();

export const QUEUE_CONFIG = {
  name: "PaymentProcessor",
  jobName: "payment",
};

const connection = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT) || 6379,
};

const queue = new Queue(QUEUE_CONFIG.name, { connection });

export async function addJob(data: any) {
  const jobOptions = {
    attempts: RETRY_CONFIG.maxAttempts,
    backoff: {
      type: RETRY_CONFIG.backoffType,
      delay: RETRY_CONFIG.initialDelay,
    },
    removeOnComplete: RETRY_CONFIG.keepCompleted,
    removeOnFail: RETRY_CONFIG.keepFailed,
    delay: 0,
  };

  const job = await queue.add(QUEUE_CONFIG.jobName, data, jobOptions);
  console.log(`➕ Job ${job.id} adicionado à fila "${QUEUE_CONFIG.name}"`);
  console.log(`📝 Dados do job:`, data);
  console.log(
    `🔄 Configurado para até ${jobOptions.attempts} tentativas com backoff ${RETRY_CONFIG.backoffType}`
  );
  return job;
}

export { queue };
