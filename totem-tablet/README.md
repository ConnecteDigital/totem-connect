# Totem · App do tablet (quiosque)

App Android que roda **no tablet do totem** (Huawei MatePad SE 11, HarmonyOS 2 / base Android).
O tablet e a Smart 2 não falam entre si: os dois falam com o backend.

O app:
1. abre o `/totem` em tela cheia (WebView), sem barra, sem botão voltar
2. é a "tela inicial" do tablet (abre sozinho quando ele liga)
3. a cada 10s manda bateria/online pro backend (`POST /api/totem/estado`) e recebe
   `telaDesejada` ("ligada"/"desligada") — o botão do PDV muda isso
4. apaga a tela (`DevicePolicyManager.lockNow`) ou acende (wake lock) conforme o PDV pedir

> WebView **não** tem WebUSB. A impressão pela USB nativa entra numa próxima versão como ponte
> JavaScript (`window.TotemNativo`); por enquanto a impressão só funciona no Chrome.

## Compilar

Toolchain nesta máquina: `C:\Users\conne\android-dev` (JDK 17 + SDK + Gradle).

```powershell
$env:JAVA_HOME="$env:USERPROFILE\android-dev\jdk17"; $env:ANDROID_HOME="$env:USERPROFILE\android-dev\sdk"
cd totem-tablet
.\gradlew.bat assembleDebug
# APK: app\build\outputs\apk\debug\app-debug.apk
```

`local.properties` (não versionado): `sdk.dir`, `BASE_URL`, `DEVICE_TOKEN` (token do dispositivo
tipo `totem` na tabela `dispositivos`) e `PIN_OPERADOR` (padrão `1234` — TROCAR em produção).

## Instalar e configurar no tablet (uma vez)

1. Passar o APK pro tablet e instalar (permitir "instalar apps desconhecidos").
2. Abrir o app. No totem: **5 toques na logo** (tela inicial) → `/totem/impressora` →
   **"Ajustes do tablet"** → PIN.
3. Nos ajustes: **(1)** ativar administrador, **(2)** liberar uso de bateria, **(3)** definir
   como tela inicial. Na Huawei também: Ajustes do app → Início automático/"gerenciar manualmente"
   ligado (todas as opções) para o Android não fechar o app.
4. Rodar `supabase/006_totem_controle.sql` no Supabase (botão no PDV).
