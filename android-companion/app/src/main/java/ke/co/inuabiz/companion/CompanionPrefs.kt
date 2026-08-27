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

    val isPaired: Boolean get() = !token.isNullOrBlank()
}
