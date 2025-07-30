import { PORT } from "../utils/constants";
import fastify, { FastifyReply, FastifyRequest } from "fastify";
import { addJob } from "../queue";
import { getPaymentsSummary } from "../database/connection";

const app = fastify({
  logger: true,
});

async function initializeWorker() {
  try {
    const workerModule = await import("../worker.js");
    console.log("🚀 Worker inicializado com sucesso");
  } catch (error) {
    console.warn(
      "⚠️  Worker não pôde ser inicializado:",
      (error as Error).message
    );
    console.warn(
      "💡 Para usar o worker, certifique-se que o Redis está rodando ou use SIMULATION_MODE=true"
    );
  }
}

initializeWorker();

app.post("/payments", async (request: FastifyRequest, reply: FastifyReply) => {
  const { correlationId, amount } = request.body as {
    correlationId: string;
    amount: number;
  };

  if (!correlationId || !amount) {
    return reply.status(400).send({
      error: "correlationId and amount are required",
    });
  }

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(correlationId)) {
    return reply.status(400).send({
      error: "correlationId must be a valid UUID",
    });
  }

  try {
    const paymentData = {
      correlationId,
      amount,
      requestedAt: new Date().toISOString(),
    };

    await addJob(paymentData);

    return reply.status(201).send({
      message: "Payment created successfully",
      correlationId,
      amount,
    });
  } catch (error) {
    console.error("❌ Erro ao adicionar job à fila:", (error as Error).message);

    return reply.status(202).send({
      message: "Payment received (processing may be delayed)",
      correlationId,
      amount,
      warning: "Queue service unavailable",
    });
  }
});

app.get(
  "/payments-summary",
  async (request: FastifyRequest, reply: FastifyReply) => {
    const { from, to } = request.query as {
      from?: string;
      to?: string;
    };

    try {
      const summary = await getPaymentsSummary(from, to);

      return reply.status(200).send(summary);
    } catch (error) {
      console.error(
        "❌ Erro ao buscar resumo de pagamentos:",
        (error as Error).message
      );

      return reply.status(500).send({
        error: "Internal server error",
      });
    }
  }
);

app.get("/health", async (request: FastifyRequest, reply: FastifyReply) => {
  return reply.status(200).send({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

app.listen({ port: PORT, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`🚀 Servidor Rinha Backend rodando em ${address}`);
});
