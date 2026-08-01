import Transaction from "../model/transactionSchema.js";

/**
 * Idempotency check — sabse pehle har controller (renew/block/freeTrial) me call karo.
 * Agar same key mil gaya, purana result hi wapas bhejo, aage process mat karo.
 */
export const checkIdempotent = async (idempotencyKey) => {
  if (!idempotencyKey) {
    const err = new Error("idempotencyKey required");
    err.statusCode = 400;
    throw err;
  }
  const existing = await Transaction.findOne({ idempotencyKey });
  return existing; // null agar naya request hai
};

/**
 * Renew sirf tab allowed jab building "grace" ya "expired" me ho — month khatam
 * hone ka case. "active" ya "blocked" building renew NAHI kar sakta:
 *   - active  -> abhi valid hai, renew ki zaroorat nahi
 *   - blocked -> ye time-bound suspension hai, renewal se solve NAHI hota,
 *                blockedUntil khatam hone ka wait karna padega (cron auto-clear karega)
 */
export const assertRenewable = (building) => {
  if (building.subscriptionStatus === "active") {
    const err = new Error("Building is already active — renewal not needed");
    err.statusCode = 400;
    err.code = "RENEW_NOT_ALLOWED_STILL_ACTIVE";
    throw err;
  }
  if (building.subscriptionStatus === "blocked") {
    const err = new Error(
      "Building is blocked (time-bound suspension) — wait till blockedUntil, renewal does not lift a block"
    );
    err.statusCode = 400;
    err.code = "RENEW_NOT_ALLOWED_BLOCKED";
    throw err;
  }
  // grace, expired — renewable
};

/**
 * Superadmin block — kisi bhi status se laga sakta hai (active/grace/expired).
 * Manual hai, time-bound nahi — sirf explicit unblock action se hatega.
 */
export const assertBlockable = (building) => {
  if (building.subscriptionStatus === "blocked") {
    const err = new Error("Building already blocked");
    err.statusCode = 400;
    err.code = "ALREADY_BLOCKED";
    throw err;
  }
};

/**
 * Sirf superadmin ke "unblock" button se hi chalta hai — koi auto/time-based
 * trigger nahi. Status wapas active/grace/expired me jaayega based on
 * subscriptionExpiry (block ke dauraan expiry date change nahi hui thi).
 */
export const resolveStatusAfterBlock = (building, now = new Date()) => {
  if (!building.subscriptionExpiry || building.subscriptionExpiry > now) {
    return { status: "active", lockLevel: "none" };
  }
  const graceEnd = building.graceEndsAt;
  if (graceEnd && graceEnd > now) {
    return { status: "grace", lockLevel: "read_only" };
  }
  return { status: "expired", lockLevel: "full_lock" };
};

/**
 * Manual unblock (superadmin ka sole power) — sirf tab valid jab
 * building abhi "blocked" me ho. Ye ek hi tarika hai blocked se nikalne ka.
 */
export const assertUnblockable = (building) => {
  if (building.subscriptionStatus !== "blocked") {
    const err = new Error("Building is not blocked");
    err.statusCode = 400;
    err.code = "NOT_BLOCKED";
    throw err;
  }
};