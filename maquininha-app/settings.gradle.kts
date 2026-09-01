pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.PREFER_SETTINGS)
    repositories {
        google()
        mavenCentral()
        // SDK da PagBank (PlugPagServiceWrapper). Descomente ao integrar o SDK real.
        // maven { url = uri("https://github.com/pagseguro/PlugPagServiceWrapper/raw/master") }
    }
}

rootProject.name = "TotemMaquininha"
include(":app")
