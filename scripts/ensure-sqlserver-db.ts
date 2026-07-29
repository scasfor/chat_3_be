/**
 * Ensures the SQL Server database named in DATABASE_URL exists before
 * `prisma migrate deploy` runs. Connects to `master`, then CREATE DATABASE
 * if missing. Used by docker-entrypoint.sh.
 */
import sql from "mssql";

function parseJdbcUrl(url: string): {
  server: string;
  port: number;
  database: string;
  user: string;
  password: string;
  encrypt: boolean;
  trustServerCertificate: boolean;
} {
  // sqlserver://host:port;database=...;user=...;password=...;encrypt=true;trustServerCertificate=true
  const withoutScheme = url.replace(/^sqlserver:\/\//i, "");
  const [hostPort, ...paramParts] = withoutScheme.split(";");
  const [server, portStr] = hostPort.split(":");
  const params = Object.fromEntries(
    paramParts
      .filter(Boolean)
      .map((part) => {
        const eq = part.indexOf("=");
        if (eq === -1) return [part.toLowerCase(), ""];
        return [part.slice(0, eq).toLowerCase(), part.slice(eq + 1)];
      }),
  );

  return {
    server,
    port: Number(portStr || 1433),
    database: params.database || "master",
    user: params.user || params.uid || "sa",
    password: params.password || params.pwd || "",
    encrypt: (params.encrypt ?? "true").toLowerCase() !== "false",
    trustServerCertificate: (params.trustservercertificate ?? "false").toLowerCase() === "true",
  };
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }

  const cfg = parseJdbcUrl(url);
  if (!cfg.database || cfg.database.toLowerCase() === "master") {
    console.log("DATABASE_URL uses master (or empty); skipping ensure-db.");
    return;
  }

  const pool = await sql.connect({
    server: cfg.server,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: "master",
    options: {
      encrypt: cfg.encrypt,
      trustServerCertificate: cfg.trustServerCertificate,
    },
  });

  try {
    const result = await pool
      .request()
      .input("name", sql.NVarChar, cfg.database)
      .query("SELECT database_id FROM sys.databases WHERE name = @name");

    if (result.recordset.length === 0) {
      // Identifier cannot be parameterized; validate to alphanumerics/underscore.
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(cfg.database)) {
        throw new Error(`Unsafe database name: ${cfg.database}`);
      }
      console.log(`Creating database [${cfg.database}]...`);
      await pool.request().query(`CREATE DATABASE [${cfg.database}]`);
    } else {
      console.log(`Database [${cfg.database}] already exists.`);
    }
  } finally {
    await pool.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
