# Homologação PagBank SmartPOS — texto para o formulário

> Formulário: página de Suporte SmartPOS → opção **"Homologação do aplicativo"**.
> Anexos: `homologacao/totem-maquininha-0.2.0-release.apk` + o vídeo (5 min).
> Copie cada bloco para o campo correspondente. Se o formulário tiver um campo único de descrição, cole tudo de "Descrição" até "Dúvidas".

---

## Dados

- **Empresa:** Connect Digital — CNPJ 55.161.845/0001-50 — Jaguaquara/BA
- **Aplicativo:** Totem · Maquininha
- **Pacote:** `br.com.connectdigital.totemmaquininha`
- **Versão:** 0.2.0 (versionCode 2)
- **Terminal de desenvolvimento:** Gertec GPOS780S — nº de série 6301072646003581
- **SDK:** PlugPagServiceWrapper 1.35.0

## Descrição do aplicativo

Totem de autoatendimento para lanchonetes. O cliente monta o pedido num tablet (totem) e paga na maquininha, sem operador de caixa. O aplicativo roda no terminal SmartPOS e é o elo entre o nosso servidor e o pagamento:

1. Consulta o nosso servidor (HTTPS) e recebe o pedido que aguarda pagamento: valor e forma escolhida no totem (crédito, débito ou Pix).
2. Abre a cobrança no terminal com `doPayment` (à vista), sem o operador digitar nada.
3. Informa o resultado ao servidor: aprovado, recusado ou cancelado. O totem avança para "pedido realizado" e imprime a senha do pedido na impressora do próprio totem.

O aplicativo não imprime comprovante no terminal (`printReceipt = false`). Ele responde automaticamente "sem via do cliente" (`doPrintAction(5)`) à pergunta de comprovante, porque não há operador para tocar na tela.

## Funcionalidades demonstradas no vídeo

- Débito com cartão inserido e senha (aprovado).
- Crédito por aproximação (aprovado).
- Recusa: valor terminado em ,70 no ambiente de teste. O app mostra o motivo e reabre a cobrança.
- Cancelamento pelo totem em cobrança com cartão (`abort()`).
- Pix: QR exibido e cancelado pelo botão "Cancelar a venda" do terminal. O pedido é cancelado e o totem volta ao início.

## Serviços externos utilizados (com justificativa)

Somente o nosso servidor, via HTTPS (TLS 1.2+), sem tráfego em texto claro (`usesCleartextTraffic=false`):

| Endpoint | Uso | Frequência |
|---|---|---|
| `GET https://totem-connect-puce.vercel.app/api/maquininha/pendentes?aguardar=20` | buscar pedido aguardando pagamento | espera longa: o servidor segura a resposta até 20 s (cerca de 3 requisições por minuto em repouso) |
| `GET https://totem-connect-puce.vercel.app/api/maquininha/status?pedidoId=…` | saber se o cliente cancelou no totem durante a cobrança | a cada 3 s, só enquanto há cobrança aberta |
| `POST https://totem-connect-puce.vercel.app/api/maquininha/confirmar` | informar o resultado da cobrança | 1 a 2 por transação |

Autenticação por token do dispositivo (cabeçalho `x-device-token`). O app não recebe nem armazena dados de cartão: toda a captura é feita pelo PlugPagService.

## Checklist do Guia de boas práticas

- APK de 5,3 MB; `minSdkVersion` e `targetSdkVersion` = 23; assinatura V1 e V2.
- `versionCode` incrementado a cada release.
- Sem `allowBackup`, `testOnly` ou `debuggable` no release.
- Sem WebView/WebApp, sem Google Play Services, sem SDKs de terceiros (usa só o WrapperPPS), sem serviços de acessibilidade.
- Sem armazenamento externo, SQLite ou SharedPreferences com dados críticos.
- Não altera configurações do sistema (data, hora, idioma).
- **Permissões:** `INTERNET`, `ACCESS_NETWORK_STATE` e `br.com.uol.pagseguro.permission.MANAGE_PAYMENTS`. `CHANGE_WIFI_STATE` é incluída pelo próprio WrapperPPS, e `DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION` pelo AndroidX.
- **Dados coletados:** apenas o necessário para o pedido (valor, número do pedido e resultado da transação). Nenhum dado pessoal do portador.

## Dúvidas para o time de Integrações

1. **Cancelar Pix pendente pelo SDK:** em cobranças Pix (`TYPE_PIX`), `abort()` retorna 0, mas a tela do QR Code (`QrCodeActivity`) permanece aberta até expirar (cerca de 3 min). O log do serviço só registra "Requesting operation abort" no momento da expiração. Em crédito e débito o `abort()` funciona. Como cancelar uma cobrança Pix pendente a partir do aplicativo?
2. **Via do cliente:** é aceito responder automaticamente `doPrintAction(5)` (sem via) num autoatendimento sem operador? A via do cliente é obrigatória em algum caso?
3. **Consumo de dados:** a espera longa gera cerca de 4 mil requisições pequenas por dia em repouso. Está dentro do esperado? Os terminais ficarão em Wi‑Fi nos estabelecimentos. Se for preciso, reduzimos mais.
4. **Ambiente de teste:** confirmamos que valores terminados em ,70 retornam "R 70 – Ligar para o emissor", e que M3011 ocorre de forma intermitente em aproximação. Há outras regras do sandbox que devemos conhecer?
5. **Produção:** após a aprovação, como fica a distribuição (loja de aplicativos / Reseller) e a ativação dos terminais dos estabelecimentos?
