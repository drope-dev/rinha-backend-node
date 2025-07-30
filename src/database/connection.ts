import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "rinha_backend",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on("connect", () => {
  console.log("🗄️  Conectado ao PostgreSQL");
});

pool.on("error", (err) => {
  console.error("❌ Erro na conexão PostgreSQL:", err);
});

export { pool };

export async function saveProcessedPayment({
  correlationId,
  amount,
  processor,
  requestedAt,
}: {
  correlationId: string;
  amount: number;
  processor: "default" | "fallback";
  requestedAt: string;
}) {
  const query = `
    INSERT INTO processed_payments (correlation_id, amount, processor, requested_at)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (correlation_id) DO NOTHING
    RETURNING id
  `;

  try {
    const result = await pool.query(query, [
      correlationId,
      amount,
      processor,
      requestedAt,
    ]);
    console.log(`💾 Pagamento salvo no banco: ${correlationId} - ${processor}`);
    return result.rows[0];
  } catch (error) {
    console.error("❌ Erro ao salvar pagamento:", error);
    throw error;
  }
}

export async function getPaymentsSummary(from?: string, to?: string) {
  let query = `
    SELECT 
      processor,
      COUNT(*) as total_requests,
      SUM(amount) as total_amount
    FROM processed_payments
  `;

  const params: string[] = [];

  if (from || to) {
    query += " WHERE ";
    const conditions: string[] = [];

    if (from) {
      conditions.push(`requested_at >= $${params.length + 1}`);
      params.push(from);
    }

    if (to) {
      conditions.push(`requested_at <= $${params.length + 1}`);
      params.push(to);
    }

    query += conditions.join(" AND ");
  }

  query += " GROUP BY processor";

  try {
    const result = await pool.query(query, params);

    const summary = {
      default: { totalRequests: 0, totalAmount: 0 },
      fallback: { totalRequests: 0, totalAmount: 0 },
    };

    result.rows.forEach((row) => {
      summary[row.processor as "default" | "fallback"] = {
        totalRequests: parseInt(row.total_requests),
        totalAmount: parseFloat(row.total_amount),
      };
    });

    return summary;
  } catch (error) {
    console.error("❌ Erro ao buscar resumo:", error);
    throw error;
  }
}
