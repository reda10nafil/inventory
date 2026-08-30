package com.redako35.syncro_flow

import android.app.PendingIntent
import android.content.Intent
import android.nfc.NfcAdapter
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val channelName = "nfc_dispatch_channel"
    private var nfcAdapter: NfcAdapter? = null
    private var pendingIntent: PendingIntent? = null
    private var foregroundEnabled = false

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        nfcAdapter = NfcAdapter.getDefaultAdapter(this)
        val intent = Intent(this, javaClass).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
        pendingIntent = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_IMMUTABLE)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, channelName).setMethodCallHandler { call, result ->
            when (call.method) {
                "startForegroundDispatch" -> {
                    foregroundEnabled = true
                    nfcAdapter?.enableForegroundDispatch(this, pendingIntent, null, null)
                    result.success(null)
                }
                "stopForegroundDispatch" -> {
                    foregroundEnabled = false
                    try { nfcAdapter?.disableForegroundDispatch(this) } catch (_: Exception) {}
                    result.success(null)
                }
                else -> result.notImplemented()
            }
        }
    }

    override fun onResume() {
        super.onResume()
        if (foregroundEnabled) {
            try { nfcAdapter?.enableForegroundDispatch(this, pendingIntent, null, null) } catch (_: Exception) {}
        }
    }

    override fun onPause() {
        super.onPause()
        try { nfcAdapter?.disableForegroundDispatch(this) } catch (_: Exception) {}
    }
}
