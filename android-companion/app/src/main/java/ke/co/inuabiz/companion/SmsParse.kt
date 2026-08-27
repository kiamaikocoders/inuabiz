package ke.co.inuabiz.companion

object SmsParse {
    sealed class Result {
        data class Received(val receipt: String, val amount: Double, val sender: String?) : Result()
        data class Ignored(val reason: String) : Result()
    }

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

        val sender =
            Regex("\\bfrom\\s+(.+?)\\s+on\\s+\\d", RegexOption.IGNORE_CASE).find(text)?.groupValues?.get(1)?.trim()
                ?: Regex(
                    "\\bfrom\\s+(\\+?254\\d{9}|0[17]\\d{8}|\\d{9,12})\\b",
                    RegexOption.IGNORE_CASE,
                ).find(text)?.groupValues?.get(1)?.trim()

        return Result.Received(receipt, amount, sender)
    }
}
