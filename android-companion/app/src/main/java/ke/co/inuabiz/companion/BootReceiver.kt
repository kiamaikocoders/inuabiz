package ke.co.inuabiz.companion

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
        if (!CompanionPrefs(context).isPaired) return
        ContextCompat.startForegroundService(context, Intent(context, CompanionService::class.java))
    }
}
