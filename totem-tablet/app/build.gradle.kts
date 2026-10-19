import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// Lê BASE_URL / DEVICE_TOKEN / PIN_OPERADOR de local.properties (não versionado)
val localProps = Properties().apply {
    val f = rootProject.file("local.properties")
    if (f.exists()) f.inputStream().use { load(it) }
}
fun prop(name: String, default: String) = (localProps.getProperty(name) ?: default)

android {
    namespace = "br.com.connectdigital.totemtablet"
    compileSdk = 34

    defaultConfig {
        applicationId = "br.com.connectdigital.totemtablet"
        minSdk = 26
        // 33: o tablet (HarmonyOS 2 / base Android 10) não exige as regras novas de serviço em
        // primeiro plano do Android 14, e o app não vai pra Play Store.
        targetSdk = 33
        versionCode = 3
        versionName = "0.1.2"

        buildConfigField("String", "BASE_URL", "\"${prop("BASE_URL", "https://totem-connect-puce.vercel.app")}\"")
        buildConfigField("String", "DEVICE_TOKEN", "\"${prop("DEVICE_TOKEN", "tok_totem_piloto_TROQUE_ISTO")}\"")
        buildConfigField("String", "PIN_OPERADOR", "\"${prop("PIN_OPERADOR", "1234")}\"")
    }

    buildFeatures { buildConfig = true }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
}
