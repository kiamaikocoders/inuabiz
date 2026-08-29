package ke.co.inuabiz.companion

import android.content.Context

class CompanionPrefs(context: Context) {
    private val prefs = context.getSharedPreferences("companion", Context.MODE_PRIVATE)

    var token: String?
        get() = prefs.getString("token", null)
        set(value) {
            prefs.edit().putString("token", value).apply()
        }

    var expectedMsisdn: String?
        get() = prefs.getString("expected_msisdn", null)
        set(value) {
            prefs.edit().putString("expected_msisdn", value).apply()
        }

    var lastSmsAt: Long
        get() = prefs.getLong("last_sms_at", 0L)
        set(value) {
            prefs.edit().putLong("last_sms_at", value).apply()
        }

    val isPaired: Boolean get() = !token.isNullOrBlank()

    fun maskedToken(): String {
        val t = token ?: return ""
        if (t.length <= 10) return "ibc_••••"
        return t.take(4) + "•".repeat((t.length - 8).coerceAtMost(20)) + t.takeLast(4)
    }
}
