plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "ke.co.inuabiz.companion"
    compileSdk = 35

    defaultConfig {
        applicationId = "ke.co.inuabiz.companion"
        minSdk = 26
        targetSdk = 35
        versionCode = 2
        versionName = "1.1.0"
        buildConfigField(
            "String",
            "INGEST_URL",
            "\"https://hnzzkmifgufurkqvnchp.supabase.co/functions/v1/ingest-mpesa-sms\"",
        )
        buildConfigField(
            "String",
            "SUPABASE_ANON_KEY",
            "\"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuenprbWlmZ3VmdXJrcXZuY2hwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5MDA4MjYsImV4cCI6MjEwMjQ3NjgyNn0.w0R9sr8jyrLfds7FAriQ3PIbyaQDE-24wwrNFFirOWc\"",
        )
    }

    buildFeatures {
        buildConfig = true
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.activity:activity-ktx:1.9.3")
    implementation("com.google.android.material:material:1.12.0")
}
