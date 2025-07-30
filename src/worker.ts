import { Worker } from "bullmq";
import dotenv from "dotenv";
import axios, { AxiosError } from "axios";
import { v4 as uuidv4 } from "uuid";
import { QUEUE_CONFIG } from "./queue";
import { PAYMENT_PROCESSORS, PROCESSOR_CONFIG } from "./utils/payment-config";
import { RETRY_CONFIG } from "./utils/retry-config";
import { saveProcessedPayment } from "./database/connection";

dotenv.config();

if (!process.env.REDIS_HOST || !process.env.REDIS_PORT) {
  console.warn(
    "⚠️  REDIS_HOST ou REDIS_PORT não configurados, usando valores padrão"
  );
}

const connection = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT) || 6379,
};

const SIMULATION_MODE = process.env.SIMULATION_MODE === "true";

async function checkProcessorHealth(processorConfig: any): Promise<{
  isHealthy: boolean;
  minResponseTime: number;
}> {
  try {
    const response = await axios.get(
      `${processorConfig.url}${PROCESSOR_CONFIG.healthEndpoint}`,
      {
        timeout: 3000,
        headers: {
          Authorization: `Bearer ${processorConfig.token}`,
        },
      }
    );

    const { failing, minResponseTime } = response.data;

    return {
      isHealthy: !failing,
      minResponseTime: minResponseTime || 0,
    };
  } catch (error) {
    console.log(
      `⚠️  Health check falhou para ${processorConfig.name}:`,
      (error as Error).message
    );
    return {
      isHealthy: false,
      minResponseTime: 0,
    };
  }
}

async function simulatePayment(
  processorConfig: any,
  paymentData: any
): Promise<any> {
  const { correlationId, amount, requestedAt } = paymentData;

  console.log(
    `🧪 [SIMULAÇÃO] Processando pagamento no ${processorConfig.name} (taxa: ${
      processorConfig.fee * 100
    }%)`
  );
  console.log(`📋 Correlation ID: ${correlationId}`);
  console.log(`💰 Valor: ${amount}`);

  await new Promise((resolve) => setTimeout(resolve, 1000));

  console.log(
    `✅ [SIMULAÇÃO] Pagamento processado com sucesso no ${processorConfig.name}`
  );

  try {
    await saveProcessedPayment({
      correlationId,
      amount,
      processor: processorConfig.name.toLowerCase() as "default" | "fallback",
      requestedAt,
    });
  } catch (dbError) {
    console.warn(
      "⚠️  Erro ao salvar simulação no banco:",
      (dbError as Error).message
    );
  }

  return {
    success: true,
    processor: processorConfig.name,
    correlationId,
    response: {
      message: "payment processed successfully (simulated)",
      id: correlationId,
      amount: amount,
      fee: processorConfig.fee,
      status: "processed",
      timestamp: requestedAt,
    },
  };
}

async function processPayment(
  processorConfig: any,
  paymentData: any
): Promise<any> {
  const { correlationId, amount, requestedAt } = paymentData;

  const payload = {
    correlationId,
    amount,
    requestedAt,
  };

  console.log(
    `💳 Tentando processar pagamento no ${processorConfig.name} (taxa: ${
      processorConfig.fee * 100
    }%)`
  );
  console.log(`🔗 URL: ${processorConfig.url}${PROCESSOR_CONFIG.endpoint}`);

  try {
    const response = await axios.post(
      `${processorConfig.url}${PROCESSOR_CONFIG.endpoint}`,
      payload,
      {
        timeout: PROCESSOR_CONFIG.timeout,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${processorConfig.token}`,
        },
      }
    );

    console.log(
      `✅ Pagamento processado com sucesso no ${processorConfig.name}`
    );
    console.log(`📋 Correlation ID: ${correlationId}`);
    console.log(`💰 Valor: ${amount}`);

    try {
      await saveProcessedPayment({
        correlationId,
        amount,
        processor: processorConfig.name.toLowerCase() as "default" | "fallback",
        requestedAt,
      });
    } catch (dbError) {
      console.warn(
        "⚠️  Erro ao salvar no banco (pagamento processado com sucesso):",
        (dbError as Error).message
      );
    }

    return {
      success: true,
      processor: processorConfig.name,
      correlationId,
      response: response.data,
    };
  } catch (error) {
    const axiosError = error as AxiosError;

    if (
      SIMULATION_MODE &&
      (axiosError.code === "ECONNREFUSED" || axiosError.code === "ENOTFOUND")
    ) {
      console.log(
        `🔄 ${processorConfig.name} indisponível, usando simulação...`
      );
      return await simulatePayment(processorConfig, paymentData);
    }

    console.log(
      `❌ Erro ao processar no ${processorConfig.name}:`,
      axiosError.message
    );
    throw error;
  }
}

async function processPaymentWithFallback(paymentData: any): Promise<any> {
  try {
    return await processPayment(PAYMENT_PROCESSORS.default, paymentData);
  } catch (defaultError) {
    console.log(`🔄 Default indisponível, tentando Fallback...`);

    try {
      return await processPayment(PAYMENT_PROCESSORS.fallback, paymentData);
    } catch (fallbackError) {
      console.log(`❌ Ambos os processors estão indisponíveis`);

      if (SIMULATION_MODE) {
        console.log(`🧪 Usando simulação como último recurso...`);
        return await simulatePayment(PAYMENT_PROCESSORS.fallback, paymentData);
      }

      throw new Error(
        `Ambos os processors indisponíveis: Default (${
          (defaultError as Error).message
        }) | Fallback (${(fallbackError as Error).message})`
      );
    }
  }
}

console.log(`🔄 Iniciando worker para fila "${QUEUE_CONFIG.name}"`);
console.log(`📡 Conectando ao Redis em ${connection.host}:${connection.port}`);
console.log(`🏦 Processors configurados:`);
console.log(`   Default: ${PAYMENT_PROCESSORS.default.url}`);
console.log(`   Fallback: ${PAYMENT_PROCESSORS.fallback.url}`);

if (SIMULATION_MODE) {
  console.log(
    `🧪 Modo simulação ativado - processamentos serão simulados se processors indisponíveis`
  );
}

const worker = new Worker(
  QUEUE_CONFIG.name,
  async (job) => {
    const attemptNumber = job.attemptsMade + 1;
    const maxAttempts = job.opts.attempts || 1;

    console.log(
      `🔄 Processando job: ${job.id} (tentativa ${attemptNumber}/${maxAttempts})`
    );
    console.log(`📦 Dados:`, job.data);

    if (attemptNumber > 1) {
      let retryDelay: number;

      if (RETRY_CONFIG.backoffType === "exponential") {
        retryDelay = Math.min(
          RETRY_CONFIG.initialDelay * Math.pow(2, attemptNumber - 2),
          RETRY_CONFIG.maxDelay
        );
      } else {
        retryDelay = RETRY_CONFIG.initialDelay;
      }

      console.log(
        `⏳ Aguardando ${retryDelay}ms antes de processar retry (${RETRY_CONFIG.backoffType})...`
      );
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }

    try {
      const result = await processPaymentWithFallback(job.data);
      console.log(
        `✅ Job ${job.id} processado com sucesso no ${result.processor}! (tentativa ${attemptNumber})`
      );
      return result;
    } catch (error) {
      console.log(
        `❌ Falha ao processar job ${job.id} na tentativa ${attemptNumber}:`,
        (error as Error).message
      );

      if (attemptNumber < maxAttempts) {
        console.log(`🔄 Job ${job.id} será reprocessado automaticamente...`);
      } else {
        console.log(
          `💀 Job ${job.id} falhou definitivamente após ${maxAttempts} tentativas`
        );
      }

      throw error;
    }
  },
  { connection }
);

worker.on("ready", () => {
  console.log(
    `🚀 Worker iniciado e aguardando jobs na fila "${QUEUE_CONFIG.name}"`
  );
  console.log(
    `🔄 Retry automático configurado (até ${RETRY_CONFIG.maxAttempts} tentativas com backoff ${RETRY_CONFIG.backoffType})`
  );
});

worker.on("completed", (job) => {
  console.log(`✅ Job ${job.id} concluído com sucesso!`);
});

worker.on("failed", (job, err) => {
  if (job) {
    const attemptNumber = job.attemptsMade;
    const maxAttempts = job.opts.attempts || 1;

    if (attemptNumber < maxAttempts) {
      console.log(
        `🔄 Job ${job.id} falhou, será reprocessado (tentativa ${
          attemptNumber + 1
        }/${maxAttempts})`
      );
    } else {
      console.log(`💀 Job ${job.id} falhou definitivamente:`, err.message);
      console.log(`📊 Total de tentativas feitas: ${attemptNumber}`);
    }
  }
});

worker.on("stalled", (jobId) => {
  console.log(`⏸️  Job ${jobId} travado, sendo reprocessado...`);
});

worker.on("error", (err) => {
  console.error(`❌ Erro no worker:`, err);
});

export default worker;
