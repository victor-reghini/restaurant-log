# RestôLog - External Services & Setup Guide

Este guia contém o passo a passo completo para executar a aplicação localmente e realizar a configuração dos serviços externos (Supabase, e alternativa Firebase).

---

## 1. Executando Localmente (Zero Configuração Externa)

A aplicação já vem configurada por padrão com um **Modo Demonstração (Mock In-Memory)**. Você não precisa configurar nenhum banco de dados para testar todas as funcionalidades imediatamente (filtros, proximidade por GPS, cardápios diários, favoritos e sugestões com aviso de duplicidade).

### Passos:
```bash
# 1. Instalar as dependências (se ainda não tiver instalado)
npm install

# 2. Iniciar o servidor de desenvolvimento Vite
npm run dev
```

Abra o navegador em `http://localhost:3000`.

---

## 1. Ambientes do Sistema (Desenvolvimento, Teste e Produção)

O sistema possui separação explícita de ambientes através de arquivos `.env.*`:

| Ambiente | Arquivo de Configuração | Comando de Execução | Descrição |
| :--- | :--- | :--- | :--- |
| **Desenvolvimento** | `.env.development` | `npm run dev` | Roda em modo ágil (Mock em memória por padrão ou Supabase local). |
| **Testes Automatizados** | `.env.test` | `npm run test` | Executa a suíte de testes com Vitest (cálculos Haversine, duplicidade, filtros). |
| **Produção** | `.env.production` | `npm run build:prod` | Conexão estrita com a instância real do Supabase em nuvem, otimizações e minificação. |

---

## 2. Inicialização do Banco de Dados e Dados Primitivos (Script Unificado)

O script unificado [supabase/init-db.sql](file:///home/npd/Downloads/projects/restaurant-log/supabase/init-db.sql) cria toda a infraestrutura e popula os dados primitivos necessários.

### O que o script cria:
1. **Extensões do PostgreSQL:** `uuid-ossp`, `postgis` (geometria espacial) e `pg_trgm` (similaridade de texto).
2. **Tabelas Primitivas de Domínio:**
   - `categories`: Categorias primitivas (Brasileira, Buffet, Vegetariana, Pizza, Hambúrguer, Italiana, Japonesa).
   - `pricing_models`: Modelos de cobrança (Buffet Livre, Buffet por Quilo, Prato Feito/À la Carte, Misto).
3. **Tabelas do Sistema e Relacionamentos:**
   - `restaurants`: Estabelecimentos com coluna gerada `GEOGRAPHY(Point, 4326)` e índices espaciais GIST.
   - `menu_items`: Itens de cardápio por dia da semana (`mon` a `sun`), preços e destaques (FK -> restaurants com `ON DELETE CASCADE`).
   - `reviews`: Avaliações de 1 a 5 estrelas com comentários e fotos.
   - `favorites`: Relacionamento N:N de favoritos dos usuários.
   - `restaurant_suggestions`: Fila de moderação para novos cadastros e edições.
4. **Triggers e RPCs de Alta Performance:**
   - `update_restaurant_rating_metrics`: Recalcula automaticamente nota e contagem de reviews na inserção.
   - `get_nearby_restaurants`: Busca por raio em km ordenada por distância em tempo de execução via PostGIS.
   - `find_duplicate_restaurants`: Detecção em tempo real de nomes similares e proximidade (< 250m).
5. **Dados Primitivos e Essenciais (Seeds):**
   - 5 restaurantes demonstrativos representativos dos modelos de negócio do projeto:
     - Buffet Livre + Por Quilo com Virado à Paulista na Segunda e Feijoada na Quarta.
     - Bistrô Vegetariano com cardápio executivo semanal fixo.
     - Pizzaria Artesanal Napolitana com lista de pratos.
     - Hamburgueria com smash burgers e carnes defumadas.
     - Restaurante por quilo clássico com grelhados.
   - Cardápios de segunda a sábado completos e avaliações iniciais.

### Como Executar o Script:
* **No Supabase Studio (Recomendado):**
  1. Acesse o painel do seu projeto no Supabase -> **SQL Editor**.
  2. Cole o conteúdo de [supabase/init-db.sql](file:///home/npd/Downloads/projects/restaurant-log/supabase/init-db.sql) e clique em **Run**.
* **Ou via CLI / Terminal:**
  ```bash
  npm run db:setup
  psql "$DATABASE_URL" -f supabase/init-db.sql
  ```

---

## 3. Configuração Passo a Passo dos Ambientes

O Supabase fornece banco relacional PostgreSQL com **PostGIS** nativo para cálculo ultra-rápido de proximidade geográfica.

### Passo 2.1: Criar o Projeto no Supabase
1. Acesse [supabase.com](https://supabase.com) e faça login.
2. Clique em **"New Project"**.
3. Escolha uma organização, defina um nome (ex: `restolog`), crie uma senha segura para o banco de dados e selecione a região mais próxima (ex: `sa-east-1` em São Paulo para menor latência).
4. Aguarde cerca de 1 a 2 minutos até o banco ser provisionado.

### Passo 2.2: Executar o Script SQL do Banco
1. No painel lateral do Supabase, clique em **SQL Editor** (ícone de terminal `>_`).
2. Clique em **"New query"**.
3. Abra o arquivo [supabase/schema.sql](file:///home/npd/Downloads/projects/restaurant-log/supabase/schema.sql) deste projeto.
4. Copie todo o conteúdo e cole no editor do Supabase.
5. Clique no botão **"Run"** (ou `Ctrl + Enter`).
6. O script criará:
   - Extensões `uuid-ossp`, `postgis` e `pg_trgm`.
   - Tabelas `restaurants`, `menu_items`, `reviews`, `favorites` e `restaurant_suggestions`.
   - Funções e índices espaciais GIST e trigram GIN.
   - Triggers automáticos para cálculo da média de avaliações.
   - Políticas de segurança Row Level Security (RLS).

### Passo 2.3: Configurar o Storage para Fotos de Pratos
1. No painel lateral, clique em **Storage**.
2. Clique em **"New Bucket"**.
3. Nomeie o bucket como: `restaurant-photos`.
4. Marque a opção **"Public bucket"** (para que as fotos dos pratos possam ser exibidas publicamente no app).
5. Clique em **"Save"**.

### Passo 2.4: Obter as Chaves de API e Configurar o `.env`
1. No menu lateral, clique na engrenagem **Project Settings** -> **API**.
2. Copie:
   - **Project URL** (ex: `https://xyzcompany.supabase.co`)
   - **anon public key** (chave pública do cliente)
3. Abra o arquivo `.env` na raiz do projeto e preencha:
```env
VITE_USE_MOCK=false
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
```
4. Reinicie o servidor com `npm run dev`. O app se conectará diretamente ao seu banco Supabase!

---

## 3. Configuração Alternativa: Firebase (Storage e Firestore)

Caso opte por utilizar o Firebase em vez do Supabase:

### Passo 3.1: Criar o Projeto Firebase
1. Acesse o [Firebase Console](https://console.firebase.google.com/).
2. Clique em **"Adicionar projeto"** e dê o nome de `restolog`.
3. Em **Criação do aplicativo**, adicione um app da Web (`</>`), defina o apelido e registre o app.

### Passo 3.2: Ativar o Cloud Firestore
1. No menu lateral, acesse **Build -> Firestore Database**.
2. Clique em **Criar banco de dados**, selecione o modo de teste ou configure as regras:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /restaurants/{restaurantId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /reviews/{reviewId} {
      allow read: if true;
      allow create: if true;
    }
    match /suggestions/{suggestionId} {
      allow create: if true;
      allow read: if request.auth != null;
    }
  }
}
```

### Passo 3.3: Ativar o Firebase Storage
1. No menu lateral, acesse **Build -> Storage**.
2. Clique em **Primeiros passos**, selecione a região e ative o bucket padrão para uploads de fotos.

---

## 4. Testes de Build e Verificação
Para garantir que o código está limpo, sem tipos soltos ou variáveis não utilizadas:
```bash
npm run build
```
O build compila o TypeScript (`tsc -b`) e empacota os ativos minificados com o Vite em `dist/`.

