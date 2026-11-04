# RestôLog - Diário e Curadoria de Restaurantes

## Descrição do Projeto

Site (que deve evoluir para aplicação mobile, tanto para iOS quanto para Android) onde o usuário poderá salvar uma lista pessoal de restaurantes. Nos cadastros de restaurantes deve haver informações sobre preço (pode ser fixo, preço definido de pratos prontos por exemplo ou ainda um valor fixo de buffet livre, mas pode ser por quilo também), cardápio (pode ter um cardápio por dia da semana, um cardápio fixo ou ainda uma lista de pratos feitos com seus respectivos preços), horários de funcionamento além de nome, descrição, endereço e uma avaliação de 0 a 5 estrelas. 

Em uma lista de "favoritos" o usuário poderá marcar os restaurantes que ele mais gosta. Outra funcionalidade é a possibilidade de fazer comentários em cada restaurante com ou sem fotos.

Os restaurantes poderão ser categorizados (pizza, hamburger, salada, chines, japonesa, etc) e por faixa de preço ($, $$, $$$).

A ideia é ter algo próximo de aplicativos como iFood e AiqFome, mas com foco em um cardápio mais fixo, por exemplo, o cardápio do dia, ou o cardápio fixo da semana, ou ainda uma lista de pratos, mas sem o foco em entrega, mas sim em uma lista de restaurantes que o usuário gosta, que ele recomenda, que ele frequentou e gosta.

Inicialmente o sistema será apenas para um grupo fechado de usuários, mas o objetivo é que ele seja aberto para o público em geral. Portanto deve haver algum mecanismo para controle de usuários e evitar o cadastro de restaurantes de forma indiscriminada, gerando duplicidade por exemplo. Outro ponto é que a qualquer momento, um usuário poderá sugerir a entrada de um novo restaurante, ou a atualização de algum restaurante.

O app deve utilizar da localização do usuário para sugerir restaurantes que estão próximos dele.

O projeto segue Clean Architecture e SOLID, modular, com documentação detalhada da arquitetura em [ARCHITECTURE.md](ARCHITECTURE.md) e roadmap de evolução em [ROADMAP.md](ROADMAP.md).

---

## Como Rodar o Projeto

O sistema opera com dois ambientes principais:
1. **Ambiente Local**: PostgreSQL executado via Docker (container incluso no projeto) ou conectado a qualquer outro banco de dados PostgreSQL informado no `.env`.
2. **Ambiente de Produção**: Conectado diretamente ao Supabase na nuvem.

---

### 1. Pré-requisitos
* **Node.js**: versão 18 ou superior (`node -v`)
* **NPM**: gerenciador de pacotes (`npm -v`)
* **Docker & Docker Compose**: opcional, apenas se desejar rodar o banco PostgreSQL local via container (`docker compose version`)

---

### 2. Instalação das Dependências

Clone o repositório e instale as dependências:
```bash
npm install
```

---

### 3. Ambiente Local (PostgreSQL via Docker ou Banco Próprio)

#### Opção A: Usando o PostgreSQL Local com Docker (Recomendado para Dev)
O projeto inclui um `docker-compose.yml` pré-configurado com PostgreSQL 15 e a extensão espacial **PostGIS** (`postgis/postgis:15-3.3-alpine`):

```bash
# 1. Inicia o banco de dados local no Docker
npm run docker:up

# 2. Executa o script para criar as tabelas, relacionamentos e popular com dados primitivos
npm run db:seed
```

> **Dica:** O container Docker já executa automaticamente o script `supabase/init-db.sql` na primeira inicialização através de `/docker-entrypoint-initdb.d/`. O comando `npm run db:seed` serve para repopular ou atualizar o banco a qualquer momento.

Para parar ou resetar o container:
```bash
# Para o container
npm run docker:down

# Reseta os volumes e recria o banco do zero
npm run docker:reset
```

#### Opção B: Usando Qualquer Outro Banco de Dados PostgreSQL
Não é obrigatório usar o container Docker do projeto. Caso você já possua uma instância do PostgreSQL (local, Docker externo, RDS, etc.), basta configurar a URL de conexão no arquivo `.env`:

1. Copie o arquivo de exemplo:
   ```bash
   cp .env.example .env
   ```
2. Defina sua string de conexão no `.env`:
   ```env
   DATABASE_URL=postgresql://seu_usuario:sua_senha@seu_host:5432/seu_banco
   ```
3. Execute o script de criação e população das tabelas:
   ```bash
   npm run db:seed
   ```
   O script conectará diretamente no banco informado e criará todas as extensões (`postgis`, `pg_trgm`, `uuid-ossp`), tabelas, relacionamentos, triggers e dados iniciais.

#### 4. Iniciando a Aplicação Localmente
```bash
npm run dev
```
Acesse no navegador: `http://localhost:3000`.

> **Modo Demonstração (Mock):** Caso deseje testar a interface imediatamente sem subir nenhum banco, mantenha `VITE_USE_MOCK=true` no `.env`. Para conectar à API/banco, altere para `VITE_USE_MOCK=false`.

---

### 4. Ambiente de Produção (Supabase)

Para rodar em produção conectado ao Supabase:

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Acesse o **SQL Editor** no painel do Supabase, cole o conteúdo de [supabase/init-db.sql](supabase/init-db.sql) e clique em **Run**.
3. No menu **Storage**, crie um bucket público chamado `restaurant-photos`.
4. Configure as variáveis de produção no seu `.env` ou nas variáveis da sua plataforma de hospedagem (Vercel, Netlify, Cloudflare, etc.):
   ```env
   VITE_APP_ENV=production
   VITE_USE_MOCK=false
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica
   ```
5. Gere o build de produção minificado:
   ```bash
   npm run build:prod
   ```
6. Para testar o build localmente:
   ```bash
   npm run preview
   ```

---

### 5. Resumo dos Comandos Disponíveis

| Comando | Descrição |
| :--- | :--- |
| `npm run dev` | Inicia o frontend em modo de desenvolvimento local |
| `npm run docker:up` | Sobe o container Docker do banco PostgreSQL local (`restolog`) |
| `npm run db:seed` | Cria tabelas, relacionamentos, triggers e popula dados (Docker ou qualquer banco do `.env`) |
| `npm run docker:reset` | Zera volumes e recria o banco Docker do zero |
| `npm run docker:down` | Para o container Docker |
| `npm run build` | Compila o projeto TypeScript e valida tipos |
| `npm run build:prod` | Gera o build de produção otimizado e minificado |
| `npm run preview` | Executa o servidor de pré-visualização do build de produção |
