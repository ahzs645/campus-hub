package com.campushub.mobile

import android.app.Activity
import android.content.Intent
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import com.journeyapps.barcodescanner.ScanContract
import com.journeyapps.barcodescanner.ScanOptions

/**
 * Helper for launching the ZXing barcode scanner to scan a QR code
 * from a TV's setup screen (local pairing flow).
 */
object QrScanHelper {

    private var callback: ((String) -> Unit)? = null

    fun launch(activity: ComponentActivity, onResult: (String) -> Unit) {
        callback = onResult

        val options = ScanOptions().apply {
            setDesiredBarcodeFormats(ScanOptions.QR_CODE)
            setPrompt("Scan the QR code on the TV screen")
            setCameraId(0)
            setBeepEnabled(false)
            setBarcodeImageEnabled(false)
            setOrientationLocked(false)
        }

        val intent = options.createScanIntent(activity)
        activity.startActivityForResult(intent, REQUEST_CODE_SCAN)
    }

    fun handleResult(requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == REQUEST_CODE_SCAN && resultCode == Activity.RESULT_OK) {
            val result = data?.getStringExtra("SCAN_RESULT")
            if (result != null) {
                callback?.invoke(result)
            }
            callback = null
        }
    }

    private const val REQUEST_CODE_SCAN = 49374
}
