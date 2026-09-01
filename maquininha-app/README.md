# Totem · Maquininha — app da Moderninha Smart 2

App Android nativo (Kotlin) que roda **na maquininha**. Ele:

1. escuta o backend (`/api/maquininha/pendentes`) por pedidos aguardando pagamento
2. dispara a cobrança no SDK da PagBank (`PlugPagServiceWrapper`)
3. reporta o resultado (`/api/maquininha/confirmar`)
4. imprime a comanda do cliente na impressora embutida

O totem (tablet) e a maquininha **não falam direto** — os dois falam com o backend.

## Rodar agora (sem SDK, em qualquer aparelho)

1. Abrir a pasta `maquininha-app/` no **Android Studio** (ele baixa o Gradle wrapper).
2. Criar `maquininha-app/local.properties` (não versionado):

   ```properties
   sdk.dir=/caminho/do/Android/Sdk
   BASE_URL=https://totem-connect-puce.vercel.app
   DEVICE_TOKEN=tok_totem_piloto_TROQUE_ISTO
   PAGAMENTO_IMPL=SIMULADO
   ```

3. No backend (Vercel): `PAGAMENTO_MOCK=false` + redeploy, e rodar `supabase/005_pagamento_valor.sql`.
4. Rodar o app num emulador/celular. Fazer um pedido no `/totem`.
   → o app mostra "Cobrando #N", aprova sozinho (simulado) em ~4s, o totem avança.

## Integrar o SDK real (SmartPOS / PlugPagServiceWrapper)

Depois de aprovado no Contato Comercial e com o terminal DEBUG em mãos:

1. `settings.gradle.kts` → descomentar o `maven { url = ".../PlugPagServiceWrapper/raw/master" }`
2. `app/build.gradle.kts` → descomentar `implementation("br.com.uol.pagseguro.plugpagservice.wrapper:wrapper:1.35.x")`
3. Preencher os `TODO` em `pagamento/PagamentoPlugPag.kt` com as assinaturas reais
   (base: app de exemplo **SmartCoffee** + GitHub `pagseguro-sdk-plugpagservicewrapper`)
4. `local.properties`:

   ```properties
   PAGAMENTO_IMPL=PLUGPAG
   ACTIVATION_CODE=<código do time de integração PagBank>
   ```

5. Instalar no terminal DEBUG via **ADB**:

   ```bash
   ./gradlew assembleRelease
   adb install -r app/build/outputs/apk/release/app-release.apk
   ```

## Homologação PagBank

- Fluxo: Contato Comercial (formulário) → terminal DEBUG → desenvolvimento → homologação.
- Enviar no chamado: **APK em Release** + **vídeo demo** mostrando o app e as chamadas de pagamento.
- SLA de homologação: **7 dias úteis**.
- **Endpoints do app** (informar na homologação):
  - `https://vzlnzllpvuyhefrkhedu.supabase.co` — não é chamado direto; o app fala com o
    backend em `BASE_URL` (Vercel). Endpoints efetivos:
  - `GET  {BASE_URL}/api/maquininha/pendentes`
  - `POST {BASE_URL}/api/maquininha/confirmar`
  - Hospedagem: Vercel + Supabase (AWS sa-east-1).

## Regras do SDK já refletidas no código

- **Uma única instância** de `PlugPag` (`PagamentoPlugPag` guarda como `lazy`)
- **Chamadas sempre em background** (`Orquestrador` usa `Dispatchers.IO`)
- **Nunca 2 cobranças juntas** (`Orquestrador` serializa com `Mutex`)
- Recusa não bloqueia — o pedido volta pra fila pra nova tentativa

## Estrutura

```
app/src/main/java/br/com/connectdigital/totemmaquininha/
  MainActivity.kt          UI (status: aguardando / cobrando / aprovado / recusado)
  Orquestrador.kt          laço: pendentes -> cobrar -> confirmar -> imprimir
  Comanda.kt               monta o texto da comanda
  backend/Backend.kt       HTTP pro backend (polling; trocável por Realtime)
  pagamento/Pagamento.kt   interface + tipos
  pagamento/PagamentoSimulado.kt   impl fake (qualquer aparelho)
  pagamento/PagamentoPlugPag.kt    impl real (TODO: preencher com o SDK)
```
