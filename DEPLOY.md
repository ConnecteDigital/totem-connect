# Deploy — GitHub + Vercel

## 1. Subir pro GitHub

O repositório git já está iniciado localmente (branch `master`). Falta criar o repo remoto e dar push.

1. Em https://github.com/new, cria um repositório **vazio** (sem README, sem .gitignore, sem licença):
   - Nome sugerido: `totem-connect`
   - Pode ser **Private**.
2. No terminal, dentro de `C:\Users\conne\Connect Totem`, roda (troca `SEU-USUARIO`):

   ```bash
   git remote add origin https://github.com/SEU-USUARIO/totem-connect.git
   git push -u origin master
   ```

   Se o GitHub pedir login, usa um **Personal Access Token** como senha
   (github.com > Settings > Developer settings > Personal access tokens).

## 2. Conectar na Vercel

1. Em https://vercel.com/new, **Import** o repositório `totem-connect`.
2. Configurações do projeto:
   - **Framework Preset:** Other (o `vercel.json` já define `buildCommand` e `framework: null`).
   - **Build Command:** `npm run build` (já vem do `vercel.json`).
   - **Output Directory:** deixa em branco — o Nitro gera `.vercel/output` e a Vercel detecta sozinha.
   - **Install Command:** `npm install` (padrão).
3. **Environment Variables** (aba Settings > Environment Variables, ou na tela de import):

   | Nome | Valor | Ambientes |
   |---|---|---|
   | `SUPABASE_URL` | `https://vzlnzllpvuyhefrkhedu.supabase.co` | Production, Preview, Development |
   | `SUPABASE_ANON_KEY` | a publishable key (`sb_publishable_...`) | Production, Preview, Development |
   | `SUPABASE_SERVICE_ROLE_KEY` | a secret key (`sb_secret_...`) | Production, Preview, Development |
   | `VITE_ESTABELECIMENTO_ID` | `11111111-1111-1111-1111-111111111111` | todos |
   | `TOTEM_DEVICE_TOKEN` | `tok_totem_piloto_TROQUE_ISTO` | todos |

   > As telas atuais são 100% mock e **não usam** essas variáveis ainda — mas já deixa
   > configurado pra quando a gente ligar no Supabase.

4. **Deploy.** No fim a Vercel dá uma URL tipo `totem-connect.vercel.app`.

## 3. Testar em dispositivos

- Abre a URL no tablet (Chrome Android) na horizontal → `/totem`
- Abre no computador → `/pdv` e `/relatorios`
- Cada push novo pra `master` faz deploy automático.

## Rodar local

```bash
npm install
npm run dev      # http://localhost:3000
```

Rotas: `/` (hub de dev), `/totem`, `/pdv`, `/relatorios`.
