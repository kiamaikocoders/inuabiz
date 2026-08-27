package ke.co.inuabiz.companion

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import kotlin.concurrent.thread

class SmsReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return
        val prefs = CompanionPrefs(context)
        val token = prefs.token ?: return
        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return
        val body = messages.joinToString("") { it.messageBody.orEmpty() }
        val from = messages.firstOrNull()?.displayOriginatingAddress
        if (SmsParse.parse(body) is SmsParse.Result.Ignored) return
        thread(name = "inuabiz-ingest") {
            try {
                IngestClient.postSms(token, body, from)
            } catch (_: Exception) {
                // Foreground service retry is out of scope; POS still allows manual code.
            }
        }
    }
}
