import { handleOptions, jsonResponse } from "../_shared/cors.ts";

/** Accept all sandbox C2B payments. */
Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  return jsonResponse({ ResultCode: 0, ResultDesc: "Accepted" });
});
