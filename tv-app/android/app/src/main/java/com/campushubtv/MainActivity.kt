package com.campushubtv

import android.annotation.SuppressLint
import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.http.SslError
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.KeyEvent
import android.view.View
import android.webkit.SslErrorHandler
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.addCallback
import androidx.appcompat.app.AppCompatActivity
import com.campushubtv.databinding.ActivityMainBinding
import java.net.Inet4Address
import java.net.NetworkInterface
import java.net.URLEncoder
import java.nio.charset.StandardCharsets

class MainActivity : AppCompatActivity(), TvHttpServer.Listener {
  private lateinit var binding: ActivityMainBinding
  private lateinit var configStore: TvConfigStore
  private var setupSession = SetupSession.create()

  @Volatile
  private lateinit var currentConfig: TvConfig

  private var currentDisplayUrl: String = ""
  private var isSetupVisible = false
  private var isShowingError = false
  private var isLoadingFallback = false
  private var pendingMainFrameRequest: String? = null
  private var server: TvHttpServer? = null
  private val mainHandler = Handler(Looper.getMainLooper())

  private val loadTimeoutRunnable = Runnable {
    if (!isSetupVisible) {
      showError("Timed out while loading $currentDisplayUrl")
    }
  }

  private val autoReloadRunnable = object : Runnable {
    override fun run() {
      if (!isSetupVisible && !isShowingError) {
        binding.displayWebView.reload()
      }
      if (BuildConfig.AUTO_RELOAD_INTERVAL_MS > 0L) {
        mainHandler.postDelayed(this, BuildConfig.AUTO_RELOAD_INTERVAL_MS)
      }
    }
  }

  private val identifyHideRunnable = Runnable {
    binding.identifyOverlay.visibility = View.GONE
  }

  private val networkCallback =
      object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) = updateSetupAddress()

        override fun onLost(network: Network) = updateSetupAddress()
      }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    binding = ActivityMainBinding.inflate(layoutInflater)
    setContentView(binding.root)

    configStore = TvConfigStore(this)
    currentConfig = configStore.load()

    setupWebView()
    setupButtons()
    setupBackHandling()
    registerNetworkCallback()
    startServer()
    updateSetupAddress()

    if (BuildConfig.AUTO_RELOAD_INTERVAL_MS > 0L) {
      mainHandler.postDelayed(autoReloadRunnable, BuildConfig.AUTO_RELOAD_INTERVAL_MS)
    }

    showDisplayForConfig(currentConfig, forceReload = true)
  }

  override fun onDestroy() {
    unregisterNetworkCallback()
    server?.stop()
    mainHandler.removeCallbacksAndMessages(null)
    binding.displayWebView.destroy()
    super.onDestroy()
  }

  override fun onConfigUpdated(config: TvConfig) {
    runOnUiThread {
      currentConfig = config
      configStore.save(config)
      showDisplayForConfig(config, forceReload = true)
    }
  }

  override fun onAction(action: TvAction) {
    runOnUiThread {
      when (action) {
        TvAction.RELOAD -> binding.displayWebView.reload()
        TvAction.RESET -> {
          val defaultConfig = TvConfigStore.defaultConfig()
          currentConfig = defaultConfig
          configStore.resetToDefault()
          showDisplayForConfig(defaultConfig, forceReload = true)
        }
        TvAction.IDENTIFY -> showIdentifyOverlay()
      }
    }
  }

  override fun getCurrentConfig(): TvConfig = currentConfig

  override fun getDeviceName(): String = getString(R.string.app_name)

  override fun getSetupSession(): SetupSession = setupSession

  override fun dispatchKeyEvent(event: KeyEvent): Boolean {
    if (event.action == KeyEvent.ACTION_UP && event.keyCode == KeyEvent.KEYCODE_MENU) {
      toggleSetup()
      return true
    }

    return super.dispatchKeyEvent(event)
  }

  override fun onKeyLongPress(keyCode: Int, event: KeyEvent?): Boolean {
    if (keyCode == KeyEvent.KEYCODE_BACK) {
      toggleSetup()
      return true
    }

    return super.onKeyLongPress(keyCode, event)
  }

  @SuppressLint("SetJavaScriptEnabled")
  private fun setupWebView() {
    binding.displayWebView.settings.javaScriptEnabled = true
    binding.displayWebView.settings.domStorageEnabled = true
    binding.displayWebView.settings.mediaPlaybackRequiresUserGesture = false
    binding.displayWebView.settings.allowFileAccess = true
    binding.displayWebView.settings.allowContentAccess = true
    binding.displayWebView.settings.allowFileAccessFromFileURLs = true
    binding.displayWebView.settings.allowUniversalAccessFromFileURLs = true
    binding.displayWebView.settings.loadsImagesAutomatically = true
    binding.displayWebView.settings.useWideViewPort = true
    binding.displayWebView.settings.loadWithOverviewMode = true
    binding.displayWebView.isFocusable = true
    binding.displayWebView.isFocusableInTouchMode = true
    binding.displayWebView.setBackgroundColor(0xFF000000.toInt())
    binding.displayWebView.webChromeClient = WebChromeClient()
    binding.displayWebView.webViewClient =
        object : WebViewClient() {
          override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
            pendingMainFrameRequest = url
            showLoading(true)
            hideError()
            mainHandler.removeCallbacks(loadTimeoutRunnable)
            mainHandler.postDelayed(loadTimeoutRunnable, BuildConfig.LOAD_TIMEOUT_MS)
          }

          override fun onPageFinished(view: WebView?, url: String?) {
            if (url == pendingMainFrameRequest || pendingMainFrameRequest == null) {
              mainHandler.removeCallbacks(loadTimeoutRunnable)
              showLoading(false)
            }
          }

          override fun onReceivedError(
              view: WebView?,
              request: WebResourceRequest?,
              error: WebResourceError?
          ) {
            if (request?.isForMainFrame == true) {
              showError(error?.description?.toString() ?: "Unknown loading error")
            }
          }

          override fun onReceivedHttpError(
              view: WebView?,
              request: WebResourceRequest?,
              errorResponse: WebResourceResponse?
          ) {
            if (request?.isForMainFrame == true && errorResponse != null) {
              showError("HTTP ${errorResponse.statusCode} while loading ${request.url}")
            }
          }

          override fun onReceivedSslError(
              view: WebView?,
              handler: SslErrorHandler?,
              error: SslError?
          ) {
            handler?.cancel()
            showError("SSL error while loading ${error?.url ?: currentDisplayUrl}")
          }
        }
  }

  private fun setupButtons() {
    binding.retryButton.setOnClickListener {
      showDisplayForConfig(currentConfig, forceReload = true)
    }

    binding.openSetupButton.setOnClickListener {
      showSetup()
    }

    binding.loadOfflineButton.setOnClickListener {
      loadOfflineFallback()
    }

    binding.openDisplayButton.setOnClickListener {
      showDisplay()
    }

    binding.resetButton.setOnClickListener {
      val defaultConfig = TvConfigStore.defaultConfig()
      currentConfig = defaultConfig
      configStore.resetToDefault()
      updateSetupAddress()
      showDisplayForConfig(defaultConfig, forceReload = true)
    }
  }

  private fun setupBackHandling() {
    onBackPressedDispatcher.addCallback(this) {
      if (isSetupVisible) {
        showDisplay()
      } else {
        showSetup()
      }
    }
  }

  private fun startServer() {
    val tvServer = TvHttpServer(BuildConfig.SETUP_SERVER_PORT, this)
    server = tvServer
    try {
      tvServer.start()
    } catch (_: Exception) {
      showError("Could not start the local setup server")
    }
  }

  private fun registerNetworkCallback() {
    val connectivityManager = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    try {
      connectivityManager.registerDefaultNetworkCallback(networkCallback)
    } catch (_: Exception) {
      updateSetupAddress()
    }
  }

  private fun unregisterNetworkCallback() {
    val connectivityManager = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    try {
      connectivityManager.unregisterNetworkCallback(networkCallback)
    } catch (_: Exception) {
      // Ignored.
    }
  }

  private fun showDisplayForConfig(config: TvConfig, forceReload: Boolean) {
    currentDisplayUrl = config.resolveDisplayUrl()
    if (forceReload) {
      showDisplay()
      binding.displayWebView.loadUrl(currentDisplayUrl)
    }
  }

  private fun showDisplay() {
    isSetupVisible = false
    binding.setupScreen.visibility = View.GONE
    binding.displayWebView.visibility = View.VISIBLE
  }

  private fun showSetup() {
    isSetupVisible = true
    showLoading(false)
    hideError()
    updateSetupAddress()
    binding.setupScreen.visibility = View.VISIBLE
    binding.displayWebView.visibility = View.INVISIBLE
    binding.setupScreen.post {
      binding.setupScreen.scrollTo(0, 0)
      binding.setupContent.requestFocus()
    }
  }

  private fun toggleSetup() {
    if (isSetupVisible) {
      showDisplay()
    } else {
      showSetup()
    }
  }

  private fun showLoading(show: Boolean) {
    binding.loadingOverlay.visibility = if (show && !isSetupVisible && !isShowingError) View.VISIBLE else View.GONE
  }

  private fun showError(message: String) {
    isShowingError = true
    isLoadingFallback = false
    mainHandler.removeCallbacks(loadTimeoutRunnable)
    binding.errorMessage.text = message
    binding.errorOverlay.visibility = View.VISIBLE
    binding.retryButton.requestFocus()
    showLoading(false)
  }

  private fun hideError() {
    isShowingError = false
    binding.errorOverlay.visibility = View.GONE
  }

  private fun loadOfflineFallback() {
    isLoadingFallback = true
    hideError()
    showDisplay()
    binding.displayWebView.loadUrl(BuildConfig.OFFLINE_FALLBACK_URL)
  }

  private fun updateSetupAddress() {
    runOnUiThread {
      val localAddress = findLocalIpv4Address()
      val baseUrl =
          localAddress?.let { "http://$it:${BuildConfig.SETUP_SERVER_PORT}" }
      val qrUrl = baseUrl?.let { setupSession.buildPairUrl(it) }

      binding.setupAddress.text = baseUrl ?: getString(R.string.setup_waiting)
      binding.setupPairCode.text =
          if (qrUrl == null) {
            getString(R.string.setup_pair_code_pending)
          } else {
            getString(R.string.setup_pair_code_value, setupSession.formattedPairCode())
          }

      if (qrUrl == null) {
        binding.qrImage.setImageDrawable(null)
        return@runOnUiThread
      }

      binding.qrImage.setImageBitmap(QrCodeRenderer.render(qrUrl, 720))
    }
  }

  private fun showIdentifyOverlay() {
    binding.identifyOverlay.visibility = View.VISIBLE
    mainHandler.removeCallbacks(identifyHideRunnable)
    mainHandler.postDelayed(identifyHideRunnable, 3000L)
  }

  private fun findLocalIpv4Address(): String? {
    val preferredInterfaces = listOf("wlan0", "eth0")
    val addresses = mutableListOf<String>()

    NetworkInterface.getNetworkInterfaces()?.toList().orEmpty().forEach { networkInterface ->
      if (!networkInterface.isUp || networkInterface.isLoopback) {
        return@forEach
      }

      networkInterface.inetAddresses.toList().forEach { address ->
        if (address is Inet4Address && !address.isLoopbackAddress) {
          val hostAddress = address.hostAddress
          if (!hostAddress.isNullOrBlank()) {
            if (networkInterface.name in preferredInterfaces) {
              return hostAddress
            }
            addresses += hostAddress
          }
        }
      }
    }

    return addresses.firstOrNull()
  }
}

private fun TvConfig.resolveDisplayUrl(): String {
  val trimmedBase = BuildConfig.CAMPUS_HUB_BASE_URL.trimEnd('/')
  val defaultDisplayUrl = "$trimmedBase${BuildConfig.DEFAULT_DISPLAY_PATH}"
  return if (!configJson.isNullOrBlank()) {
    val encoded = URLEncoder.encode(configJson, StandardCharsets.UTF_8.toString())
    "$trimmedBase/display/?configJson=$encoded"
  } else {
    url.ifBlank { defaultDisplayUrl }
  }
}
