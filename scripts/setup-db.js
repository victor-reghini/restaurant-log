/**
 * Database Setup & Seed Helper
 * Reads supabase/init-db.sql and prints instructions or executes if DATABASE_URL is set.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sqlPath = path.resolve(__dirname, '../supabase/init-db.sql');

if (!fs.existsSync(sqlPath)) {
  console.error(`❌ Arquivo SQL não encontrado em: ${sqlPath}`);
  process.exit(1);
}

const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

console.log('================================================================');
console.log('   RestôLog - Database Initialization & Seed Script (Postgres)');
console.log('================================================================');
console.log(`📄 Arquivo SQL carregado: supabase/init-db.sql (${sqlContent.length} bytes)`);
console.log('\nOpções de Execução:');
console.log('1. Supabase Dashboard (Recomendado):');
console.log('   - Abra https://supabase.com -> Seu Projeto -> SQL Editor');
console.log('   - Cole o conteúdo de "supabase/init-db.sql" e clique em "Run"');
console.log('\n2. Via psql / Linha de Comando:');
console.log('   psql "$DATABASE_URL" -f supabase/init-db.sql');
console.log('\n3. Via Supabase CLI:');
console.log('   supabase db reset --db-url "$DATABASE_URL"');
console.log('================================================================\n');

