import pg from "pg";

const { Pool } = pg;

const columns = [
  "id",
  "created_at",
  "updated_at",
  "status",
  "nome_indicado",
  "categoria",
  "autor_nome",
  "autor_email",
  "autor_telefone",
  "instituicao",
  "cidade",
  "motivo",
  "ip_hash",
  "user_agent",
];

export class PostgresStore {
  constructor({ connectionString, tableName = "indicacoes" }) {
    this.tableName = quoteIdentifier(tableName);
    this.pool = new Pool({
      connectionString,
      ssl: resolveSsl(connectionString),
      max: Number(process.env.PG_POOL_MAX || 5),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  }

  async insert(row) {
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
    const values = columns.map((column) => row[column]);
    const sql = `
      insert into ${this.tableName} (${columns.map(quoteIdentifier).join(", ")})
      values (${placeholders})
      returning *
    `;

    const result = await this.pool.query(sql, values);
    return result.rows[0];
  }

  async list(status) {
    const values = [];
    let where = "";

    if (status) {
      values.push(status);
      where = "where status = $1";
    }

    const result = await this.pool.query(
      `select * from ${this.tableName} ${where} order by created_at desc`,
      values,
    );
    return result.rows;
  }

  async updateStatus(id, status) {
    const result = await this.pool.query(
      `
        update ${this.tableName}
        set status = $2, updated_at = now()
        where id = $1
        returning *
      `,
      [id, status],
    );

    if (!result.rows[0]) {
      const error = new Error("Inscrição não encontrada.");
      error.status = 404;
      throw error;
    }

    return result.rows[0];
  }

  async health() {
    await this.pool.query("select 1");
  }
}

function resolveSsl(connectionString) {
  if (process.env.PGSSL === "false") return false;
  if (/localhost|127\.0\.0\.1/.test(connectionString)) return false;
  return { rejectUnauthorized: false };
}

function quoteIdentifier(value) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
    throw new Error(`Identificador PostgreSQL inválido: ${value}`);
  }
  return `"${value}"`;
}
