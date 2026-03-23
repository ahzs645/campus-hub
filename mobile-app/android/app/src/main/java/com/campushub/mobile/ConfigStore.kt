package com.campushub.mobile

import android.content.Context
import android.content.SharedPreferences

/**
 * Persists pairing state — which cloud display this device is linked to.
 */
class ConfigStore(context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences("campus_hub_mobile", Context.MODE_PRIVATE)

    var displayId: String?
        get() = prefs.getString(KEY_DISPLAY_ID, null)
        set(value) = prefs.edit().putString(KEY_DISPLAY_ID, value).apply()

    var displayName: String?
        get() = prefs.getString(KEY_DISPLAY_NAME, null)
        set(value) = prefs.edit().putString(KEY_DISPLAY_NAME, value).apply()

    fun clear() {
        prefs.edit()
            .remove(KEY_DISPLAY_ID)
            .remove(KEY_DISPLAY_NAME)
            .apply()
    }

    companion object {
        private const val KEY_DISPLAY_ID = "display_id"
        private const val KEY_DISPLAY_NAME = "display_name"
    }
}
