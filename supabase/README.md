# Setup do Supabase — Totem Connect

Passo a passo pra deixar o banco pronto. Depois disso a gente liga o app.

## 1. Criar o projeto
1. Entre em https://supabase.com e crie a conta (pode ser com o Google `connectefinanceiro@gmail.com`).
2. **New project**:
   - Name: `totem-connect`
   - Database password: gere uma forte e **guarde** (não precisa dela no dia a dia, mas anota).
   - Region: `South America (São Paulo)`.
3. Espera ~2 min provisionar.

## 2. Rodar o schema
1. Menu lateral > **SQL Editor** > **New query**.
2. Cola todo o conteúdo de `schema.sql` > **Run**.
3. Tem que terminar sem erro (uns "NOTICE" são normais).

## 3. Rodar o seed (dados do piloto)
1. Nova query, cola `seed.sql` > **Run**.
2. Isso cria a "Hamburgueria Piloto", categorias, produtos, adicionais e 2 dispositivos.
3. Depois a gente ajusta nome/produtos pela tela de Cadastro.

## 4. Criar o usuário admin (Gabriel)
1. Menu lateral > **Authentication** > **Users** > **Add user** > **Create new user**.
   - Email: `connectefinanceiro@gmail.com`
   - Password: escolhe uma.
   - Marca **Auto Confirm User**.
2. Clica no usuário criado e copia o **UUID** dele.
3. Volta no **SQL Editor**, cola e roda (trocando o UUID):
   ```sql
   insert into usuarios (id, estabelecimento_id, papel)
   values ('COLE_O_UUID_AQUI', '11111111-1111-1111-1111-111111111111', 'connect_admin')
   on conflict (id) do update
     set estabelecimento_id = excluded.estabelecimento_id, papel = excluded.papel;
   ```

## 5. Conferir o Storage
- Menu lateral > **Storage**. Deve existir um bucket **`produtos`** (o schema cria).
- Se não apareceu, cria manual: **New bucket** > name `produtos` > marca **Public bucket**.

## 6. Pegar as chaves (pra me passar)
Menu lateral > **Project Settings** > **API**:

| O que | Onde | Uso |
|---|---|---|
| **Project URL** | "Project URL" | `SUPABASE_URL` |
| **anon public** | "Project API keys" > `anon` `public` | `SUPABASE_ANON_KEY` (vai pro navegador, com RLS) |
| **service_role** | "Project API keys" > `service_role` `secret` | `SUPABASE_SERVICE_ROLE_KEY` (só server, **segredo**) |

> A `service_role` é chave de administrador — ignora RLS. **Não** manda ela em print, repositório
> público, nem cola em lugar que não seja o `.env.local` da sua máquina. Quando eu montar o
> scaffold, vou deixar um `.env.example`; você copia pra `.env.local` e cola as 3 lá.
> Pode me passar a **URL** e a **anon** por aqui sem problema; a **service_role** você mesmo
> põe no `.env.local`.

## 7. Me avisa
Quando terminar os passos 1–6, me manda:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- confirmação de que rodou schema + seed + criou o usuário admin

Aí eu começo a ligar o app no banco.
