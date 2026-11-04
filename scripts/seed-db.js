/**
 * Database Setup & Seed Script
 * Connects to PostgreSQL (local Docker container, or ANY custom database configured in .env)
 * and creates all tables, relationships, extensions, triggers, and primitive seed data.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { execSync } from 'child_process';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple .env parser to avoid extra dependencies
function loadEnv() {
  const envFiles = ['.env', '.env.local', '.env.development'];
  for (const file of envFiles) {
    const fullPath = path.resolve(__dirname, '..', file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      content.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const [key, ...vals] = trimmed.split('=');
          const k = key.trim();
          const v = vals.join('=').trim().replace(/^["']|["']$/g, '');
          if (!process.env[k]) {
            process.env[k] = v;
          }
        }
      });
    }
  }
}

loadEnv();

const sqlFilePath = path.resolve(__dirname, '../supabase/init-db.sql');

if (!fs.existsSync(sqlFilePath)) {
  console.error(`❌ Arquivo SQL não encontrado em: ${sqlFilePath}`);
  process.exit(1);
}

const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');

// Resolves connection: user can specify DATABASE_URL or individual POSTGRES_* params in .env
const connectionString =
  process.env.DATABASE_URL ||
  `postgresql://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD || 'postgres'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.POSTGRES_DB || 'restolog'}`;

async function seedDatabase() {
  console.log('================================================================');
  console.log('   RestôLog - Script de Inicialização e Seeds do Banco de Dados');
  console.log('================================================================');
  
  // Mask password for display
  const maskedConn = connectionString.replace(/:([^:@]+)@/, ':****@');
  console.log(`🔌 Conectando ao PostgreSQL: ${maskedConn}`);

  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('✅ Conexão com o banco de dados realizada com sucesso!');

    console.log('🚀 Criando tabelas, relacionamentos, funções e populando dados primitivos...');
    await client.query(sqlContent);
    console.log('✅ Estrutura e dados primitivos aplicados com sucesso!');

    // Validation metrics
    const resCat = await client.query('SELECT COUNT(*) FROM public.categories');
    const resRest = await client.query('SELECT COUNT(*) FROM public.restaurants');
    const resMenu = await client.query('SELECT COUNT(*) FROM public.menu_items');
    const resReviews = await client.query('SELECT COUNT(*) FROM public.reviews');

    console.log('\n📊 Resumo dos dados no banco:');
    console.log(`   - Categorias primitivas: ${resCat.rows[0].count}`);
    console.log(`   - Restaurantes cadastrados: ${resRest.rows[0].count}`);
    console.log(`   - Itens de cardápio: ${resMenu.rows[0].count}`);
    console.log(`   - Avaliações iniciais: ${resReviews.rows[0].count}`);

    await client.end();
  } catch (err) {
    await client.end().catch(() => {});
    console.warn(`\n⚠️ Não foi possível conectar diretamente via TCP: ${err.message}`);

    // If default local container is running, attempt via docker exec fallback
    console.log('ℹ️ Tentando execução alternativa no container Docker local (restolog-postgres)...');
    try {
      execSync(`docker exec -i restolog-postgres psql -U postgres -d restolog < "${sqlFilePath}"`, {
        stdio: 'inherit',
      });
      console.log('✅ Migração e seed executados com sucesso via Docker CLI!');
    } catch {
      console.error('\n❌ Falha ao conectar ao banco de dados especificado.');
      console.error('Verifique as seguintes opções:');
      console.error('1. Se estiver usando o Docker do projeto, inicie o container:');
      console.error('   npm run docker:up');
      console.error('2. Se estiver usando outro banco de dados, certifique-se de configurar no seu .env:');
      console.error('   DATABASE_URL=postgresql://seu_usuario:sua_senha@seu_host:5432/seu_banco');
      console.error('3. Ou execute o script SQL diretamente no seu cliente SQL:');
      console.error(`   ${sqlFilePath}\n`);
      process.exit(1);
    }
  }
}

seedDatabase();

