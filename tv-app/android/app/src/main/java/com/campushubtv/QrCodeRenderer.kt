package com.campushubtv

import android.graphics.Bitmap
import android.graphics.Color
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter

object QrCodeRenderer {
  fun render(contents: String, size: Int): Bitmap {
    val bitMatrix = QRCodeWriter().encode(contents, BarcodeFormat.QR_CODE, size, size)
    val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.RGB_565)

    for (x in 0 until size) {
      for (y in 0 until size) {
        bitmap.setPixel(x, y, if (bitMatrix[x, y]) Color.BLACK else Color.WHITE)
      }
    }

    return bitmap
  }
}
