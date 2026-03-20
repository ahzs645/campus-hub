package com.campushubtv

import android.content.Context

data class TvConfig(
    val url: String,
    val configJson: String? = null,
)

class TvConfigStore(context: Context) {
  private val preferences =
      context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)

  fun load(): TvConfig {
    val defaultConfig = defaultConfig()
    val url = preferences.getString(KEY_URL, defaultConfig.url) ?: defaultConfig.url
    val configJson = preferences.getString(KEY_CONFIG_JSON, defaultConfig.configJson)
    return TvConfig(url = url, configJson = configJson)
  }

  fun save(config: TvConfig) {
    preferences
        .edit()
        .putString(KEY_URL, config.url)
        .putString(KEY_CONFIG_JSON, config.configJson)
        .apply()
  }

  fun resetToDefault() {
    save(defaultConfig())
  }

  companion object {
    private const val PREFERENCES_NAME = "campus_hub_tv"
    private const val KEY_URL = "display_url"
    private const val KEY_CONFIG_JSON = "config_json"

    fun defaultConfig(): TvConfig =
        TvConfig(
            url = BuildConfig.CAMPUS_HUB_BASE_URL.trimEnd('/') + BuildConfig.DEFAULT_DISPLAY_PATH,
            configJson = null,
        )
  }
}
