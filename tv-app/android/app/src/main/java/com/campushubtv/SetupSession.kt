package com.campushubtv

import java.security.SecureRandom

data class SetupSession(
    val pairCode: String,
    val supportsWebSocket: Boolean = false,
    val webSocketPath: String = BuildConfig.SETUP_WEBSOCKET_PATH,
) {
  fun buildPairUrl(baseUrl: String): String = "$baseUrl/?pair=$pairCode"

  fun formattedPairCode(): String =
      if (pairCode.length == 6) {
        pairCode.substring(0, 3) + " " + pairCode.substring(3)
      } else {
        pairCode
      }

  companion object {
    private val secureRandom = SecureRandom()

    fun create(): SetupSession {
      val pairCode = (100000 + secureRandom.nextInt(900000)).toString()
      return SetupSession(pairCode = pairCode)
    }
  }
}
