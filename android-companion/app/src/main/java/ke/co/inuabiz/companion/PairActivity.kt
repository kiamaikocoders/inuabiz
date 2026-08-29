package ke.co.inuabiz.companion

import android.Manifest
import android.app.AlertDialog
import android.content.ClipboardManager
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.telephony.TelephonyManager
import android.view.View
import android.widget.EditText
import android.widget.ImageButton
import android.widget.LinearLayout
import android.widget.PopupMenu
import android.widget.TextView
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import com.google.android.material.button.MaterialButton
import java.text.DateFormat
import java.util.Date

class PairActivity : ComponentActivity() {
    private val prefs by lazy { CompanionPrefs(this) }
    private var revealed = false

    private lateinit var unpaired: LinearLayout
    private lateinit var paired: LinearLayout
    private lateinit var tokenInput: EditText
    private lateinit var tokenMasked: TextView
    private lateinit var lastSms: TextView
    private lateinit var menuBtn: ImageButton
    private lateinit var revealBtn: MaterialButton
    private lateinit var status: TextView

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

        unpaired = findViewById(R.id.unpaired)
        paired = findViewById(R.id.paired)
        tokenInput = findViewById(R.id.token)
        tokenMasked = findViewById(R.id.token_masked)
        lastSms = findViewById(R.id.last_sms)
        menuBtn = findViewById(R.id.menu)
        revealBtn = findViewById(R.id.reveal)
        status = findViewById(R.id.status)

        findViewById<TextView>(R.id.paste).setOnClickListener { pasteToken() }
        findViewById<MaterialButton>(R.id.save).setOnClickListener { saveToken(tokenInput.text.toString()) }
        findViewById<MaterialButton>(R.id.open_shop).setOnClickListener { openShop() }
        findViewById<MaterialButton>(R.id.open_shop_unpaired).setOnClickListener { openShop() }
        revealBtn.setOnClickListener { toggleReveal() }
        menuBtn.setOnClickListener { showMenu(it) }

        render()
        if (prefs.isPaired) requestPermissionsAndListen()
    }

    override fun onResume() {
        super.onResume()
        if (prefs.isPaired) renderPaired()
    }

    private fun render() {
        if (prefs.isPaired) {
            unpaired.visibility = View.GONE
            paired.visibility = View.VISIBLE
            menuBtn.visibility = View.VISIBLE
            renderPaired()
        } else {
            unpaired.visibility = View.VISIBLE
            paired.visibility = View.GONE
            menuBtn.visibility = View.GONE
            revealed = false
        }
    }

    private fun renderPaired() {
        tokenMasked.text = if (revealed) prefs.token else prefs.maskedToken()
        revealBtn.setText(if (revealed) R.string.hide_token else R.string.reveal_once)
        val at = prefs.lastSmsAt
        lastSms.text = if (at <= 0L) {
            getString(R.string.last_sms_never)
        } else {
            val label = DateFormat.getDateTimeInstance(DateFormat.MEDIUM, DateFormat.SHORT)
                .format(Date(at))
            getString(R.string.last_sms_fmt, label)
        }
    }

    private fun toggleReveal() {
        revealed = !revealed
        renderPaired()
    }

    private fun pasteToken() {
        val clip = getSystemService(ClipboardManager::class.java)?.primaryClip
        val text = clip?.getItemAt(0)?.coerceToText(this)?.toString()?.trim().orEmpty()
        if (text.isEmpty()) {
            Toast.makeText(this, R.string.clipboard_empty, Toast.LENGTH_SHORT).show()
            return
        }
        tokenInput.setText(text)
        tokenInput.setSelection(text.length)
    }

    private fun saveToken(raw: String) {
        val token = raw.trim()
        if (!token.startsWith("ibc_") || token.length < 20) {
            Toast.makeText(this, R.string.bad_token, Toast.LENGTH_LONG).show()
            return
        }
        prefs.token = token
        revealed = false
        render()
        requestPermissionsAndListen()
    }

    private fun showMenu(anchor: View) {
        val menu = PopupMenu(this, anchor)
        menu.menu.add(0, 1, 0, R.string.reveal_once)
        menu.menu.add(0, 2, 1, R.string.menu_replace)
        menu.menu.add(0, 3, 2, R.string.menu_unpair)
        menu.setOnMenuItemClickListener { item ->
            when (item.itemId) {
                1 -> {
                    revealed = true
                    renderPaired()
                    true
                }
                2 -> {
                    promptReplace()
                    true
                }
                3 -> {
                    confirmUnpair()
                    true
                }
                else -> false
            }
        }
        menu.show()
    }

    private fun promptReplace() {
        val input = EditText(this).apply {
            hint = getString(R.string.token_hint)
            setText("")
            setPadding(48, 32, 48, 32)
            inputType = android.text.InputType.TYPE_CLASS_TEXT or
                android.text.InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD
        }
        AlertDialog.Builder(this)
            .setTitle(R.string.replace_title)
            .setMessage(R.string.replace_body)
            .setView(input)
            .setPositiveButton(R.string.save) { _, _ -> saveToken(input.text.toString()) }
            .setNegativeButton(android.R.string.cancel, null)
            .show()
    }

    private fun confirmUnpair() {
        AlertDialog.Builder(this)
            .setTitle(R.string.unpair_title)
            .setMessage(R.string.unpair_body)
            .setPositiveButton(R.string.unpair_confirm) { _, _ -> unpair() }
            .setNegativeButton(R.string.unpair_cancel, null)
            .show()
    }

    private fun unpair() {
        prefs.token = null
        prefs.lastSmsAt = 0L
        stopService(Intent(this, CompanionService::class.java))
        tokenInput.setText("")
        revealed = false
        render()
        status.text = getString(R.string.not_paired)
    }

    private fun openShop() {
        startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(getString(R.string.shop_url))))
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
        render()
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
