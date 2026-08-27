package ke.co.inuabiz.companion

import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

object IngestClient {
    fun postSms(token: String, smsBody: String, sender: String?): Boolean {
        val url = URL(BuildConfig.INGEST_URL)
        val conn = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 15_000
            readTimeout = 20_000
            doOutput = true
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("apikey", BuildConfig.SUPABASE_ANON_KEY)
            setRequestProperty("Authorization", "Bearer ${BuildConfig.SUPABASE_ANON_KEY}")
            setRequestProperty("x-companion-token", token)
        }
        val payload = JSONObject()
            .put("sms_body", smsBody)
            .put("sender", sender ?: "MPESA")
        OutputStreamWriter(conn.outputStream, Charsets.UTF_8).use { it.write(payload.toString()) }
        val code = conn.responseCode
        conn.disconnect()
        return code in 200..299
    }
}
