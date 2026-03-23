package com.campushub.mobile

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.campushub.mobile.databinding.ActivityMainBinding

/**
 * Main entry point. Routes to either:
 * - Pairing flow (if no display is paired yet)
 * - TWA display mode (if already paired to a cloud display)
 */
class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var configStore: ConfigStore

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        configStore = ConfigStore(this)

        // Check if already paired
        val displayId = configStore.displayId
        if (displayId != null) {
            launchDisplay(displayId)
            return
        }

        // Show pairing UI
        showPairingScreen()
    }

    private fun showPairingScreen() {
        binding.pairingScreen.visibility = View.VISIBLE
        binding.pairedScreen.visibility = View.GONE

        // Generate a pairing code for this device
        val pairingSession = PairingSession()
        val pairCode = pairingSession.code

        binding.pairCodeDisplay.text = pairingSession.formattedCode
        binding.pairCodeInstructions.text = getString(
            R.string.pair_instructions,
            pairCode
        )

        // Generate QR code for the cloud pairing URL
        val pairUrl = "${BuildConfig.CLOUD_BASE_URL}/tvs/register?pairCode=$pairCode"
        try {
            val qrBitmap = QrCodeRenderer.render(pairUrl, 512)
            binding.pairQrCode.setImageBitmap(qrBitmap)
        } catch (_: Exception) {
            binding.pairQrCode.visibility = View.GONE
        }

        // Start polling for claim
        PairingPoller(
            pairCode = pairCode,
            apiUrl = BuildConfig.PAIR_API_URL,
            onPaired = { displayId, displayName ->
                runOnUiThread {
                    configStore.displayId = displayId
                    configStore.displayName = displayName
                    Toast.makeText(this, "Paired to: $displayName", Toast.LENGTH_SHORT).show()
                    launchDisplay(displayId)
                }
            },
            onError = { error ->
                runOnUiThread {
                    binding.pairStatus.text = error
                    binding.pairStatus.visibility = View.VISIBLE
                }
            }
        ).start()

        // Manual display ID entry fallback
        binding.manualPairButton.setOnClickListener {
            val manualId = binding.manualDisplayIdInput.text.toString().trim()
            if (manualId.isNotEmpty()) {
                configStore.displayId = manualId
                configStore.displayName = manualId
                launchDisplay(manualId)
            } else {
                Toast.makeText(this, "Enter a display ID", Toast.LENGTH_SHORT).show()
            }
        }

        // Scan QR from a TV to pair directly (local HTTP pairing from tv-app)
        binding.scanTvQrButton.setOnClickListener {
            QrScanHelper.launch(this) { scannedUrl ->
                handleScannedTvUrl(scannedUrl)
            }
        }
    }

    private fun handleScannedTvUrl(url: String) {
        // If it's a local TV url (http://192.168.x.x:8888/?pair=123456),
        // open the tv-setup page with this info pre-filled
        val uri = Uri.parse(url)
        val pairCode = uri.getQueryParameter("pair")
        if (pairCode != null) {
            val tvSetupUrl = "${BuildConfig.DISPLAY_BASE_URL.removeSuffix("/display/")}/" +
                "tv-setup?address=${Uri.encode(uri.scheme + "://" + uri.authority)}" +
                "&pairCode=$pairCode"
            launchTwa(tvSetupUrl)
        } else {
            // Generic URL — just open it
            launchTwa(url)
        }
    }

    private fun showPairedScreen(displayId: String) {
        binding.pairingScreen.visibility = View.GONE
        binding.pairedScreen.visibility = View.VISIBLE

        binding.pairedDisplayId.text = displayId
        binding.pairedDisplayName.text = configStore.displayName ?: displayId

        binding.openDisplayButton.setOnClickListener {
            launchDisplay(displayId)
        }

        binding.unpairButton.setOnClickListener {
            configStore.clear()
            showPairingScreen()
        }

        binding.openDashboardButton.setOnClickListener {
            launchTwa(BuildConfig.CLOUD_BASE_URL)
        }
    }

    private fun launchDisplay(displayId: String) {
        val displayUrl = "${BuildConfig.DISPLAY_BASE_URL}$displayId"
        launchTwa(displayUrl)
    }

    private fun launchTwa(url: String) {
        try {
            val intent = Intent(this,
                Class.forName("com.google.androidbrowserhelper.trusted.LauncherActivity"))
            intent.data = Uri.parse(url)
            startActivity(intent)
        } catch (_: Exception) {
            // Fallback: open in Chrome Custom Tab or browser
            val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
            startActivity(browserIntent)
        }
    }

    override fun onResume() {
        super.onResume()
        // If paired but came back from TWA, show the paired management screen
        val displayId = configStore.displayId
        if (displayId != null && binding.pairingScreen.visibility == View.VISIBLE) {
            showPairedScreen(displayId)
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        // Handle deep links from cloud (e.g., campushub://pair?displayId=xxx)
        intent.data?.let { uri ->
            if (uri.scheme == "campushub" && uri.host == "pair") {
                val displayId = uri.getQueryParameter("displayId")
                val displayName = uri.getQueryParameter("name")
                if (displayId != null) {
                    configStore.displayId = displayId
                    configStore.displayName = displayName ?: displayId
                    launchDisplay(displayId)
                }
            }
        }
    }
}
