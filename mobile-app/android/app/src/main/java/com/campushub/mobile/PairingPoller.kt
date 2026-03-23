package com.campushub.mobile

import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/**
 * Polls the cloud pairing API to check if a dashboard user has claimed
 * this device using its pairing code.
 *
 * Flow:
 * 1. Mobile app generates a 6-digit code and POSTs it to /api/pair/register
 * 2. User enters that code in the cloud dashboard when registering a TV
 * 3. This poller checks /api/pair/status?code=XXXXXX until claimed or expired
 */
class PairingPoller(
    private val pairCode: String,
    private val apiUrl: String,
    private val onPaired: (displayId: String, displayName: String) -> Unit,
    private val onError: (message: String) -> Unit,
    private val pollIntervalMs: Long = 3000L,
    private val maxAttempts: Int = 200  // ~10 minutes
) {
    @Volatile
    private var running = false

    fun start() {
        running = true
        Thread {
            // Step 1: Register the pairing code with the cloud
            if (!registerCode()) {
                onError("Failed to register pairing code with cloud")
                return@Thread
            }

            // Step 2: Poll for claim
            var attempts = 0
            while (running && attempts < maxAttempts) {
                try {
                    val result = checkStatus()
                    if (result != null) {
                        running = false
                        onPaired(result.first, result.second)
                        return@Thread
                    }
                } catch (e: Exception) {
                    // Network hiccup — keep polling
                }
                attempts++
                Thread.sleep(pollIntervalMs)
            }

            if (running) {
                running = false
                onError("Pairing code expired. Tap to generate a new one.")
            }
        }.start()
    }

    fun stop() {
        running = false
    }

    /**
     * POST /api/pair/register { code: "123456" }
     * Registers this code so the cloud knows it's waiting.
     */
    private fun registerCode(): Boolean {
        return try {
            val url = URL("$apiUrl/register")
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            conn.doOutput = true
            conn.connectTimeout = 10000
            conn.readTimeout = 10000

            val body = JSONObject().apply {
                put("code", pairCode)
                put("deviceType", "android-mobile")
                put("deviceModel", android.os.Build.MODEL)
            }
            conn.outputStream.use { it.write(body.toString().toByteArray()) }

            val status = conn.responseCode
            conn.disconnect()
            status in 200..299
        } catch (_: Exception) {
            false
        }
    }

    /**
     * GET /api/pair/status?code=123456
     * Returns (displayId, displayName) if claimed, null if still waiting.
     */
    private fun checkStatus(): Pair<String, String>? {
        val url = URL("$apiUrl/status?code=$pairCode")
        val conn = url.openConnection() as HttpURLConnection
        conn.requestMethod = "GET"
        conn.connectTimeout = 10000
        conn.readTimeout = 10000

        return try {
            if (conn.responseCode == 200) {
                val responseBody = conn.inputStream.bufferedReader().readText()
                val json = JSONObject(responseBody)
                val status = json.optString("status")
                if (status == "claimed") {
                    val displayId = json.getString("displayId")
                    val displayName = json.optString("displayName", displayId)
                    Pair(displayId, displayName)
                } else {
                    null
                }
            } else {
                null
            }
        } finally {
            conn.disconnect()
        }
    }
}
