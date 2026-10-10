import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';

const { Client } = pg;

const host = process.env.PGHOST ?? 'db.sslvdgskznteuecdpeml.supabase.co';
const password = process.env.PGPASSWORD;

if (!password) {
  console.error('Falta la variable PGPASSWORD (contraseña de la base de datos).');
  process.exit(1);
}

const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'migrations');
const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

const client = new Client({
  host,
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

await client.connect();

try {
  await client.query(
    'create table if not exists public._migrations (nombre text primary key, applied_at timestamptz not null default now())',
  );
  await client.query('revoke all on public._migrations from anon, authenticated');
  const { rows } = await client.query('select nombre from public._migrations');
  const applied = new Set(rows.map((r) => r.nombre));

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`= ${file} (ya aplicada)`);
      continue;
    }
    const sql = readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`> ${file}`);
    await client.query(sql);
    await client.query('insert into public._migrations (nombre) values ($1) on conflict do nothing', [file]);
    console.log(`  OK`);
  }
  console.log('Migraciones aplicadas correctamente.');
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
