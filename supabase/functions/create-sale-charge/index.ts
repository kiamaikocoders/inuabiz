import { handleOptions, jsonResponse } from "../_shared/cors.ts";

/** @deprecated Vendor POS no longer uses platform STK. Use checkout-sale with channel MPESA. */
Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  return jsonResponse(
    {
      error:
        "Platform STK for vendor sales is disabled. Use checkout-sale with channel MPESA.",
    },
    410,
  );
});
