package com.campushub.mobile

import kotlin.random.Random

/**
 * Generates a 6-digit pairing code that the user enters in the cloud dashboard
 * to claim this device as a display.
 */
class PairingSession {

    val code: String = Random.nextInt(100000, 999999).toString()

    val formattedCode: String
        get() = "${code.substring(0, 3)} ${code.substring(3)}"
}
