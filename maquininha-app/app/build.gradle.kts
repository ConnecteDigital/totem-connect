import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// Lê BASE_URL / DEVICE_TOKEN / ACTIVATION_CODE de local.properties (não versionado)
val localProps = Properties().apply {
    val f = rootProject.file("local.properties")
    if (f.exists()) f.inputStream().use { load(it) }
}
fun prop(name: String, default: String) = (localProps.getProperty(name) ?: default)

android {
    namespace = "br.com.connectdigital.totemmaquininha"
    compileSdk = 34

    defaultConfig {
        applicationId = "br.com.connectdigital.totemmaquininha"
        // Guia de boas práticas SmartPOS da PagBank: minSdk e targetSdk = 23
        minSdk = 23
        targetSdk = 23
        versionCode = 2
        versionName = "0.2.0"

        buildConfigField("String", "BASE_URL", "\"${prop("BASE_URL", "https://totem-connect-puce.vercel.app")}\"")
        buildConfigField("String", "DEVICE_TOKEN", "\"${prop("DEVICE_TOKEN", "tok_totem_piloto_TROQUE_ISTO")}\"")
        buildConfigField("String", "ACTIVATION_CODE", "\"${prop("ACTIVATION_CODE", "")}\"")
        // "SIMULADO" roda em qualquer aparelho; "PLUGPAG" usa o SDK real na Smart 2
        buildConfigField("String", "PAGAMENTO_IMPL", "\"${prop("PAGAMENTO_IMPL", "SIMULADO")}\"")
    }

    buildFeatures {
        buildConfig = true
        viewBinding = true
    }

    // O alerta é regra da Google Play; este app é distribuído pela loja da PagBank (targetSdk 23 exigido por eles)
    lint { disable += "ExpiredTargetSdkVersion" }

    // Assinatura de release (keystore fica fora do repositório; senhas em local.properties)
    signingConfigs {
        create("release") {
            val arquivo = localProps.getProperty("RELEASE_STORE_FILE")
            if (arquivo != null) {
                storeFile = file(arquivo)
                storePassword = localProps.getProperty("RELEASE_STORE_PASSWORD")
                keyAlias = localProps.getProperty("RELEASE_KEY_ALIAS")
                keyPassword = localProps.getProperty("RELEASE_KEY_PASSWORD")
                enableV1Signing = true
                enableV2Signing = true
            }
        }
    }

    buildTypes {
        release {
            if (localProps.getProperty("RELEASE_STORE_FILE") != null) {
                signingConfig = signingConfigs.getByName("release")
            }
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.4")
    implementation("com.google.android.material:material:1.12.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")

    // SDK de pagamento PagBank (SmartPOS / PlugPagServiceWrapper).
    // Só necessário quando PAGAMENTO_IMPL = "PLUGPAG". Requer o repositório maven
    // descomentado em settings.gradle.kts.
    implementation("br.com.uol.pagseguro.plugpagservice.wrapper:wrapper:1.35.0")
}
