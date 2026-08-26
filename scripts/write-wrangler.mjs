import { writeFileSync } from 'node:fs';

const databaseId = process.env.D1_DATABASE_ID;
if (!databaseId) {
  console.error('Missing D1_DATABASE_ID');
  process.exit(1);
}

const config = {
  $schema: 'node_modules/wrangler/config-schema.json',
  name: 'research-report',
  main: '.open-next/worker.js',
  compatibility_date: '2026-08-26',
  compatibility_flags: ['nodejs_compat'],
  assets: {
    directory: '.open-next/assets',
    binding: 'ASSETS'
  },
  observability: {
    enabled: true
  },
  d1_databases: [
    {
      binding: 'RESEARCH_DB',
      database_name: 'research-report-db',
      database_id: databaseId,
      migrations_dir: 'db/migrations'
    }
  ]
};

writeFileSync('wrangler.jsonc', `${JSON.stringify(config, null, 2)}\n`, 'utf8');
console.log('Generated wrangler.jsonc for RESEARCH_DB');
