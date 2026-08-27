package ke.co.inuabiz.companion

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.telephony.TelephonyManager
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat

class PairActivity : ComponentActivity() {
    private val prefs by lazy { CompanionPrefs(this) }

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions(),
    ) { granted ->
        val smsOk = granted[Manifest.permission.RECEIVE_SMS] == true ||
            ContextCompat.checkSelfPermission(this, Manifest.permission.RECEIVE_SMS) ==
            PackageManager.PERMISSION_GRANTED
        if (smsOk) startListening()
        else Toast.makeText(this, R.string.sms_permission_needed, Toast.LENGTH_LONG).show()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_pair)
        val tokenInput = findViewById<EditText>(R.id.token)
        val status = findViewById<TextView>(R.id.status)
        findViewById<Button>(R.id.save).setOnClickListener {
            val token = tokenInput.text.toString().trim()
            if (!token.startsWith("ibc_") || token.length < 20) {
                Toast.makeText(this, R.string.bad_token, Toast.LENGTH_LONG).show()
                return@setOnClickListener
            }
            prefs.token = token
            requestPermissionsAndListen()
        }
        findViewById<Button>(R.id.unpair).setOnClickListener {
            prefs.token = null
            stopService(Intent(this, CompanionService::class.java))
            status.text = getString(R.string.not_paired)
        }
        if (prefs.isPaired) {
            tokenInput.setText(prefs.token)
            status.text = getString(R.string.paired)
            requestPermissionsAndListen()
        } else {
            status.text = getString(R.string.not_paired)
        }
    }

    private fun requestPermissionsAndListen() {
        val needed = mutableListOf(
            Manifest.permission.RECEIVE_SMS,
            Manifest.permission.READ_SMS,
        )
        if (Build.VERSION.SDK_INT >= 33) needed += Manifest.permission.POST_NOTIFICATIONS
        val missing = needed.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (missing.isEmpty()) startListening()
        else permissionLauncher.launch(missing.toTypedArray())
    }

    private fun startListening() {
        val expected = prefs.expectedMsisdn
        val line = try {
            getSystemService(TelephonyManager::class.java).line1Number
        } catch (_: SecurityException) {
            null
        }
        if (!expected.isNullOrBlank() && !line.isNullOrBlank() && normalize(line) != normalize(expected)) {
            Toast.makeText(this, R.string.sim_mismatch, Toast.LENGTH_LONG).show()
            return
        }
        ContextCompat.startForegroundService(this, Intent(this, CompanionService::class.java))
        findViewById<TextView>(R.id.status).text = getString(R.string.listening)
    }

    private fun normalize(raw: String): String {
        val d = raw.filter { it.isDigit() }
        return when {
            d.startsWith("254") && d.length == 12 -> d
            d.startsWith("0") && d.length == 10 -> "254${d.drop(1)}"
            d.length == 9 && (d.startsWith("7") || d.startsWith("1")) -> "254$d"
            else -> d
        }
    }
}
