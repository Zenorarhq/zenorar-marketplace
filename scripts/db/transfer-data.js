/**
 * Full data transfer — old Neon DB → new Neon DB
 * Handles: JSONB re-serialisation, generated columns, multi-pass FK resolution
 * Run: node scripts/db/transfer-data.js
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const OLD_DB = 'postgresql://neondb_owner:npg_EdRzr4uyN8tT@ep-hidden-grass-aeyjqwqr-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const NEW_DB = process.env.DATABASE_URL;

const SKIP_TABLES = new Set(['migrations', '_prisma_migrations']);

// Columns that exist in old DB but were dropped from new DB (orphaned by migration fixes)
const EXCLUDE_COLS = {
  users:    new Set(['password_changed_at']),
  products: new Set(['is_staff_pick']),
};

function topoSort(tables, deps) {
  const visited = new Set();
  const result = [];
  function visit(t, stack = new Set()) {
    if (visited.has(t)) return;
    if (stack.has(t)) return; // skip circular
    stack.add(t);
    for (const dep of (deps[t] || [])) {
      if (tables.includes(dep)) visit(dep, new Set(stack));
    }
    visited.add(t);
    result.push(t);
  }
  for (const t of tables) visit(t);
  return result;
}

async function run() {
  const oldPool = new Pool({ connectionString: OLD_DB, max: 1 });
  const newPool = new Pool({ connectionString: NEW_DB, max: 1 });
  const oldClient = await oldPool.connect();
  const newClient = await newPool.connect();

  try {
    console.log('🔍 Fetching schema info...\n');

    const allTablesRes = await oldClient.query(`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`);
    const newTablesRes = await newClient.query(`SELECT tablename FROM pg_tables WHERE schemaname='public'`);
    const newTablesSet = new Set(newTablesRes.rows.map(r => r.tablename));
    const allTables = allTablesRes.rows.map(r => r.tablename);
    const tables = allTables.filter(t => !SKIP_TABLES.has(t) && newTablesSet.has(t));
    const missing = allTables.filter(t => !SKIP_TABLES.has(t) && !newTablesSet.has(t));

    if (missing.length) console.log('⚠️  Skipping (not in new DB): ' + missing.join(', ') + '\n');

    // Get new DB column info: names, types, generated flag
    const newColsRes = await newClient.query(`
      SELECT table_name, column_name, data_type, is_generated
      FROM information_schema.columns WHERE table_schema='public'
    `);
    const newCols = {}; // table → Set of col names
    const jsonbCols = {}; // table → Set of jsonb col names
    const generatedCols = {}; // table → Set of generated col names
    for (const r of newColsRes.rows) {
      if (!newCols[r.table_name]) { newCols[r.table_name] = new Set(); jsonbCols[r.table_name] = new Set(); generatedCols[r.table_name] = new Set(); }
      newCols[r.table_name].add(r.column_name);
      if (r.data_type === 'jsonb' || r.data_type === 'json') jsonbCols[r.table_name].add(r.column_name);
      if (r.is_generated === 'ALWAYS') generatedCols[r.table_name].add(r.column_name);
    }

    // Build FK dependency graph
    const fkRes = await newClient.query(`
      SELECT tc.table_name AS child, ccu.table_name AS parent
      FROM information_schema.table_constraints tc
      JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
      JOIN information_schema.constraint_column_usage ccu ON rc.unique_constraint_name = ccu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    `);
    const deps = {};
    for (const r of fkRes.rows) {
      if (!deps[r.child]) deps[r.child] = [];
      if (r.parent !== r.child) deps[r.child].push(r.parent);
    }

    const ordered = topoSort(tables, deps);
    console.log(`📋 ${ordered.length} tables to transfer\n`);

    // ── Truncate all in reverse dep order ──────────────────────────────────
    console.log('🗑️  Clearing new DB...');
    for (const table of [...ordered].reverse()) {
      try { await newClient.query(`TRUNCATE TABLE "${table}" CASCADE`); }
      catch (e) { console.log(`  ⚠️  ${table}: ${e.message.split('\n')[0]}`); }
    }
    console.log('✅ Cleared\n');

    // ── Load all data from old DB upfront ──────────────────────────────────
    console.log('📥 Loading data from old DB...');
    const tableData = {};
    for (const table of tables) {
      const res = await oldClient.query(`SELECT * FROM "${table}"`);
      tableData[table] = res.rows;
    }
    console.log('✅ Loaded\n');

    // ── Insert function for one table ──────────────────────────────────────
    async function insertTable(table, rows) {
      if (!rows.length) return { ok: 0, skip: 0, fail: 0 };

      const excludeSet  = EXCLUDE_COLS[table]   || new Set();
      const genSet      = generatedCols[table]   || new Set();
      const tableNewCols = newCols[table]        || new Set();
      const jsonbSet    = jsonbCols[table]       || new Set();

      const allCols = Object.keys(rows[0]);
      const cols = allCols.filter(c => !excludeSet.has(c) && !genSet.has(c) && tableNewCols.has(c));
      if (!cols.length) return { ok: 0, skip: rows.length, fail: 0 };

      const quotedCols = cols.map(c => `"${c}"`).join(', ');
      let ok = 0, skip = 0, fail = 0;
      const BATCH = 50;

      function sanitize(row) {
        return cols.map(c => {
          let val = row[c];
          if (val === undefined) return null;
          // Re-serialise JSONB values so pg inserts them correctly.
          // pg reads JSONB as JS objects/primitives. Passing a JS string back
          // into a JSONB param sends it as raw JSON text, which fails if the
          // string is not valid JSON. JSON.stringify wraps it properly.
          if (jsonbSet.has(c) && val !== null) {
            val = JSON.stringify(val);
          }
          return val;
        });
      }

      for (let i = 0; i < rows.length; i += BATCH) {
        const batch = rows.slice(i, i + BATCH);
        const sanitized = batch.map(sanitize);
        const ph = sanitized.map((_, ri) =>
          '(' + cols.map((_, ci) => `$${ri * cols.length + ci + 1}`).join(', ') + ')'
        ).join(', ');

        try {
          await newClient.query(
            `INSERT INTO "${table}" (${quotedCols}) VALUES ${ph} ON CONFLICT DO NOTHING`,
            sanitized.flat()
          );
          ok += batch.length;
        } catch (batchErr) {
          // Row-by-row fallback
          for (const row of sanitized) {
            const sph = '(' + cols.map((_, ci) => `$${ci + 1}`).join(', ') + ')';
            try {
              await newClient.query(
                `INSERT INTO "${table}" (${quotedCols}) VALUES ${sph} ON CONFLICT DO NOTHING`,
                row
              );
              ok++;
            } catch (rowErr) {
              const msg = rowErr.message.split('\n')[0];
              if (msg.includes('foreign key')) fail++;  // FK — retry later
              else skip++;                              // Data problem — skip
            }
          }
        }
      }
      return { ok, skip, fail };
    }

    // ── Multi-pass insert (up to 5 passes for FK chains) ──────────────────
    let remaining = [...ordered];
    let totalOk = 0, totalSkip = 0;
    const MAX_PASSES = 5;

    for (let pass = 1; pass <= MAX_PASSES; pass++) {
      if (!remaining.length) break;
      if (pass > 1) console.log(`\n🔄 Pass ${pass} — retrying ${remaining.length} tables with FK issues...\n`);

      const stillFailing = [];
      for (const table of remaining) {
        const rows = tableData[table];
        if (!rows.length) {
          if (pass === 1) console.log(`⬜ ${table} — empty`);
          continue;
        }
        const { ok, skip, fail } = await insertTable(table, rows);
        totalOk += ok; totalSkip += skip;
        if (pass === 1) {
          const note = fail > 0 ? ` (${fail} FK-pending, ${skip} data-skipped)` : skip > 0 ? ` (${skip} skipped)` : '';
          console.log(`${fail > 0 ? '🔄' : ok > 0 ? '✅' : '⬜'} ${table} — ${ok}/${rows.length} rows${note}`);
        }
        if (fail > 0) stillFailing.push(table);
      }
      remaining = stillFailing;
    }

    if (remaining.length) {
      console.log('\n--- Still failing after all passes (likely orphaned data in old DB) ---');
      for (const table of remaining) {
        const rows = tableData[table];
        const { ok } = await insertTable(table, rows);
        console.log(`  ❌ ${table}: only ${ok}/${rows.length} rows (FK violations remain)`);
      }
    }

    console.log(`\n✨ Transfer complete! ${totalOk} rows copied, ${totalSkip} skipped (invalid data).`);

  } catch (e) {
    console.error('\n❌ Fatal error:', e.message);
  } finally {
    oldClient.release(); newClient.release();
    await oldPool.end(); await newPool.end();
  }
}

run();
