# RestôLog - Guia de Configuração e Ambientes

Este guia detalha a configuração dos dois ambientes do sistema:
1. **Ambiente Local:** PostgreSQL via Docker (container fornecido) ou qualquer banco PostgreSQL configurado no `.env`.
2. **Ambiente de Produção:** Supabase na nuvem.

---

## 1. Ambientes do Sistema

| Ambiente | Banco de Dados | Configuração | Inicialização |
| :--- | :--- | :--- | :--- |
| **Local** | PostgreSQL (Docker ou Externo) | `.env` com `DATABASE_URL` | `npm run docker:up` + `npm run db:seed` |
| **Produção** | Supabase (Cloud) | `.env` com `VITE_SUPABASE_URL` | `npm run build:prod` |

---

## 2. Inicialização do Banco Local (Script Unificado: `supabase/init-db.sql`)

O script de banco de dados cria toda a infraestrutura necessária:
1. **Extensões:** `uuid-ossp`, `postgis` (geometria espacial) e `pg_trgm` (busca fuzzy para anti-duplicação).
2. **Tabelas Primitivas:** `categories` e `pricing_models`.
3. **Tabelas do Domínio:** `restaurants` (com coluna `GEOGRAPHY(Point, 4326)` e índice GIST), `menu_items`, `reviews`, `favorites` e `restaurant_suggestions`.
4. **Triggers e RPCs:** Cálculo automático de notas (`update_restaurant_rating_metrics`), busca por raio em km (`get_nearby_restaurants`) e busca por similaridade (`find_duplicate_restaurants`).
5. **Dados Primitivos e Essenciais (Seeds):** 5 restaurantes completos com cardápios diários/semanais e avaliações.

### Como Popular o Banco Local:

#### Se estiver usando o Docker do projeto:
```bash
npm run docker:up
npm run db:seed
```

#### Se estiver usando qualquer outro banco PostgreSQL próprio:
Basta definir a string de conexão no arquivo `.env`:
```env
DATABASE_URL=postgresql://usuario:senha@seu-host:5432/seu-banco
```
E executar:
```bash
npm run db:seed
```
O script `scripts/seed-db.js` detectará a URL e executará a criação de todas as tabelas e dados primitivos diretamente no banco apontado.

---

## 3. Configuração de Produção (Supabase)

1. Crie o projeto em [supabase.com](https://supabase.com).
2. Cole o conteúdo de `supabase/init-db.sql` no **SQL Editor** do Supabase e execute.
3. No menu **Storage**, crie o bucket público `restaurant-photos`.
4. Preencha as credenciais no `.env` de produção:
   ```env
   VITE_APP_ENV=production
   VITE_USE_MOCK=false
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica
   ```
