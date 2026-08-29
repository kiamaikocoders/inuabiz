package ke.co.inuabiz.companion

object SmsParse {
    sealed class Result {
        data class Received(
            val receipt: String,
            val amount: Double,
            val sender: String?,
            val senderName: String?,
        ) : Result()
        data class Ignored(val reason: String) : Result()
    }

    private val phoneRe = Regex("(\\+?254[17]\\d{8}|0[17]\\d{8})")

    fun parse(body: String): Result {
        val text = body.replace(Regex("\\s+"), " ").trim()
        if (text.isEmpty()) return Result.Ignored("empty")
        val lower = text.lowercase()

        if (Regex("\\bsent to\\b").containsMatchIn(lower) ||
            Regex("\\byou have sent\\b").containsMatchIn(lower)
        ) {
            return Result.Ignored("outbound")
        }
        if (Regex("\\bairtime\\b").containsMatchIn(lower) ||
            Regex("\\bfuliza\\b").containsMatchIn(lower)
        ) {
            return Result.Ignored("non_sale")
        }

        val isReceived =
            Regex("\\byou have received\\b").containsMatchIn(lower) ||
                Regex("\\bhas been received\\b").containsMatchIn(lower) ||
                Regex("\\breceived ksh\\b").containsMatchIn(lower) ||
                Regex("\\bksh[\\d,.]+\\s+received\\b").containsMatchIn(lower) ||
                (Regex("\\breceived\\b").containsMatchIn(lower) && !Regex("\\bsent\\b").containsMatchIn(lower))
        if (!isReceived) return Result.Ignored("not_received")

        val receiptStart = Regex("^([A-Z0-9]{8,12})\\s+Confirmed", RegexOption.IGNORE_CASE).find(text)
        val receiptLoose = Regex("\\b([A-Z][A-Z0-9]{8,11})\\b").find(text)
        val receipt = (receiptStart?.groupValues?.get(1) ?: receiptLoose?.groupValues?.get(1) ?: "")
            .uppercase()
        if (!Regex("^[A-Z0-9]{8,12}$").matches(receipt)) {
            return Result.Ignored("no_receipt")
        }

        val amountMatch = Regex("(?:Ksh|KES|KSH)\\s*([\\d,]+(?:\\.\\d{1,2})?)", RegexOption.IGNORE_CASE)
            .find(text)
            ?: return Result.Ignored("no_amount")
        val amount = amountMatch.groupValues[1].replace(",", "").toDoubleOrNull()
        if (amount == null || amount <= 0) return Result.Ignored("bad_amount")

        val fromRaw =
            Regex("\\bfrom\\s+(.+?)\\s+on\\s+\\d", RegexOption.IGNORE_CASE).find(text)?.groupValues?.get(1)
                ?: Regex("\\bfrom\\s+(.+?)(?:\\.|\\s+New\\s)", RegexOption.IGNORE_CASE).find(text)?.groupValues?.get(1)
                ?: Regex(
                    "\\bfrom\\s+(\\+?254[17]\\d{8}|0[17]\\d{8}|\\d{9,12})\\b",
                    RegexOption.IGNORE_CASE,
                ).find(text)?.groupValues?.get(1)

        val party = splitParty(fromRaw.orEmpty())
        return Result.Received(receipt, amount, party.second, party.first)
    }

    /** name to MSISDN */
    private fun splitParty(fromRaw: String): Pair<String?, String?> {
        var raw = fromRaw.replace(Regex("\\s+"), " ").trim()
        raw = raw.replace(Regex("\\s+New\\s+(M-PESA|M-Pesa|Utility|till).*$", RegexOption.IGNORE_CASE), "").trim()
        raw = raw.replace(Regex("[.,;]+$"), "").trim()
        val phone = phoneRe.find(raw)
        var msisdn: String? = null
        var name = raw
        if (phone != null) {
            msisdn = to254(phone.value)
            name = raw.replace(phone.value, " ").replace(Regex("\\s+"), " ").trim()
        }
        name = name.replace(Regex("\\s+Acc\\.?\\s*[\\d\\s]+$", RegexOption.IGNORE_CASE), "").trim()
        name = name.replace(Regex("^from\\s+", RegexOption.IGNORE_CASE), "").trim()
        if (name.isEmpty() || Regex("^[\\d+\\s-]+$").matches(name)) name = ""
        return Pair(name.ifEmpty { null }, msisdn)
    }

    private fun to254(input: String): String? {
        val d = input.replace(Regex("\\D"), "")
        val n = when {
            d.startsWith("254") && d.length == 12 -> d
            d.startsWith("0") && d.length == 10 -> "254${d.substring(1)}"
            d.length == 9 && (d.startsWith("7") || d.startsWith("1")) -> "254$d"
            else -> d
        }
        return if (n.length == 12) n else null
    }
}
