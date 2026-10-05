
1. building.js (model/schema)
   Kaam: Building ki DB table structure. Subscription se related fields:

plan — konsa plan lagi hai (TRIAL/MONTHLY ka reference)
subscriptionStatus — active/grace/expired/blocked
lockLevel — none/read_only/full_lock (middleware isi ko check karega)
graceEndsAt — grace kab khatam hogi
blockedAt, blockedReason — superadmin ne block kiya to kab/kyu
Kyu: Har building ka current subscription state yahi store hota. Baaki sab files isi ko read/update karte.

2. subscriptionPlanSchema.js (model)
   Kaam: Plan types define karta — TRIAL, MONTHLY_STANDARD etc. Fix price NAHI, perFlatRate + perShopRate (per unit rate).

Kyu: Amount fix nahi rakha kyuki building ka size alag alag — 50 flat wali building aur 200 flat wali building same price nahi de sakti. Rate × count = amount.

3. transactionSchema.js (model)
   Kaam: Har payment/trial/renewal ka permanent record — kaun, kab, kitna, kis method se.

Kyu: Payment history dikhane ke liye (admin + superadmin dono). idempotencyKey unique hai — same request 2 baar aaye (button double-click, network retry) to dobara process NAHI hoga, duplicate payment se bachaata.

4. calculateSubscriptionAmount.js (utility)
   Kaam: 2 function:

countActiveUnits(buildingCode) — Member collection se live flat/shop count nikalta
calculateSubscriptionAmount(plan, flatCount, shopCount) — rate × count = final amount
Kyu: Renewal ke waqt "abhi kitna paisa lagega" calculate karne ke liye. ⚠️ Isme Member field names (unitType, status) tumhare actual schema se match karna — abhi placeholder hai.

5. assignFreeTrialOnRegister.js (utility function)
   Kaam: Naya building register hote hi call hota — 30 din free trial set karta, Transaction row banata (type: free_trial, amount 0).

Kyu: Har naya building automatically trial pe start ho, manual kaam na karna pade.

Kaha call karna: Tumhare registration controller me, building create hone ke turant baad:

js
const building = await Building.create({...});
await assignFreeTrialOnRegister(building, req.app.get("io")); 6. processRenewal.js (CORE — sabse important)
Kaam: Ye SHARED function hai — dono renewal type (admin ka gateway wala, superadmin ka manual wala) ISI ko call karte. Andar kya hota:

Idempotency check (duplicate na ho)
Building dhundo, assertRenewable() check (blocked hai to error)
Plan dhundo, amount calculate karo (countActiveUnits + calculateSubscriptionAmount)
Transaction row banao (pending)
Building update — naya expiry, status active, lockLevel none
Transaction success mark karo
Socket emit — frontend ko live update
Kyu: Ek hi jagah logic rakhne se — kal agar rate calculation badalni ho, sirf ek file edit karni, dono renewal type automatically update ho jayenge.

7. renewMySubscription.js (controller — ADMIN/MEMBER wala)
   Kaam: Route handler — POST /admin/subscription/renew. Body me planId, method (upi/card/etc), gatewayTxnId (payment gateway se aaya), idempotencyKey. processRenewal() ko call karta initiatedBy: { role: "admin" } ke saath.

Kyu: Ye tumhara Case 1 — member/admin khud payment karke renew karta.

Status: ✅ ready hai.

8. renewSubscription.js (controller — SUPERADMIN wala)
   Status: ❌ YE PURANI/BROKEN FILE HAI. Ye processRenewal.js use hi nahi karti — apna alag adhoora logic hai (fix months, rate-based nahi, Transaction row nahi banati, assertRenewable check nahi karti). Rate-based naye system se match nahi karti.

Kya karna: Ye file replace karni hai — niche di hui hai.

9. checkSubscriptionExpiry.js — DO COPIES aayi tumse, confusion isi se hua
   Doc index 5 (chhota wala) = OLD, ISKO DELETE KARO
   Doc index 9 (bada wala, reminders+grace+expiry teeno) = YE ASLI/NAYA WALA, ISI KO USE KARO
   Kaam: Roz 12:01 AM chalta:

Active buildings jinki expiry 7/1/0 din me hai → reminder bhejo
Expiry cross ho gayi → status grace, lockLevel read_only, 2 din ka graceEndsAt set
Grace bhi khatam → status expired, lockLevel full_lock
Kaha call karna: server.js / app.js me server start ke baad:

js
import checkSubscriptionExpiry from "./cron/checkSubscriptionExpiry.js";
checkSubscriptionExpiry(io); 10. checkBuildingSubscription.js (middleware)
Kaam: Har protected route pe lagta (member/admin auth ke baad). Building ka lockLevel seedha check karta:

none → sab allowed
read_only → sirf GET allowed, POST/PUT/DELETE block
full_lock → sab block
blocked status → alag error message
Kyu: Ek jagah se poori app me expired/grace/blocked building ka access control ho jaye — har controller me alag-alag check likhna na pade.

Kaha lagana: Route file me:

js
router.post("/some-route", memberAuth, checkBuildingSubscription, controllerFn); 11. getBuildingByCode.js (controller — superadmin dashboard)
Kaam: Superadmin ek building ka poora subscription detail dekhe — current plan, status, history, saare transactions. Sirf read-only display hai, renewal nahi karta.

Ab tumhara asli sawal — "2 dono tarike se renewal"
Tarika A — Member/Admin khud (payment gateway)
Already ready: frontend → payment gateway (razorpay/etc) → success → renewMySubscription API call

Frontend flow:

1. User "Renew" button dabaye
2. Frontend payment gateway open kare (Razorpay checkout)
3. Payment success → gateway se transactionId milega
4. Frontend call kare: POST /admin/subscription/renew
   body: { planId, method: "upi", gatewayTxnId, idempotencyKey: uuid() }
5. Response me naya subscriptionExpiry milega → UI update
   Tarika B — Superadmin manual
   Abhi broken hai. Naya processRenewal.js use karke rewrite karta hu — chahiye?

Batao "ha likh do" bolo to superadmin ka naya renewSubscription.js (processRenewal core use karke) + uska frontend call kaisa hoga wo dikhata hu.


RONTEND (component):

SubscriptionHistoryDummy.js → React Native screen, sirf UI

BACKEND — Models (schema):

admin.js
building.js
transactionSchema.js
subscriptionPlanSchema.js

BACKEND — API routes (controller, direct hit hota):

adminRegister.js → POST register
verifyAdminOtp.js → POST verify-otp
getBuildingByCode.js → GET building/:code
getSubscriptionPlans.js → GET plans
renewMySubscription.js → POST admin renew
renewSubscription.js → POST superadmin renew
setDummyExpiry.js → POST test expiry
cashfreeWebhookDummy.js → POST webhook

BACKEND — Helper/core logic (koi route nahi, andar se call hote):

assignFreeTrialOnRegister.js → verifyAdminOtp se call hota
processRenewal.js → renewMySubscription + renewSubscription dono se call hota (shared core)
calculateSubscriptionAmount.js → processRenewal se call hota

BACKEND — Middleware:

checkBuildingSubscription.js → routes ke beech me lockLevel check

Test script (route nahi, node se run hota):

testCashfreeWebhook.js

///////////////////////////////
import Visitor from "../../model/Visitor.js";
import Notice from "../../model/notice.js";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const LIST_LIMIT = 5;

// Status jo "andar gaya" count hota hai.
// Forced entry bhi status "Approved" hai (verificationMethod = "ForcedEntry").
const ENTERED_STATUS = "Approved";

// ── DATE UTILS (IST) ──
const todayIST = () =>
  new Date(Date.now() + IST_OFFSET_MS).toISOString().split("T")[0];

// "YYYY-MM-DD" format + real calendar date (2026-02-31 reject)
const isValidDateStr = (s) => {
  if (typeof s !== "string" || !DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00.000+05:30`);
  if (Number.isNaN(d.getTime())) return false;
  return new Date(d.getTime() + IST_OFFSET_MS).toISOString().startsWith(s);
};

const getDayRange = (dateStr) => ({
  $gte: new Date(`${dateStr}T00:00:00.000+05:30`),
  $lte: new Date(`${dateStr}T23:59:59.999+05:30`),
});

// ── CONTROLLER ──
const getGuardDashboard = async (req, res) => {
  try {
    const { buildingCode, date } = req.query;

    // string check: ?buildingCode[$ne]=x jaise NoSQL injection se bachav
    if (typeof buildingCode !== "string" || !buildingCode.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "buildingCode required" });
    }

    if (date !== undefined && date !== "" && !isValidDateStr(date)) {
      return res
        .status(400)
        .json({ success: false, message: "date must be YYYY-MM-DD" });
    }

    const code = buildingCode.trim();
    const today = todayIST();
    const dateStr = date || today;
    const isToday = dateStr === today;
    const dayRange = getDayRange(dateStr);

    // Pre-approved = member ne respond kar diya, guard ne abhi entry nahi li
    const preApprovedFilter = {
      buildingCode: code,
      status: "Pending",
      respondedBy: { $ne: null },
    };

    const [
      visitorCount,
      preApprovedCount,
      preApprovedList,
      recentVisitors,
      currentlyInsideCount,
      notices,
    ] = await Promise.all([
      // History (getVisitorLog) jaisa hi filter: buildingCode + entryTime
      Visitor.countDocuments({ buildingCode: code, createdAt: dayRange }),

      // Real count (list sirf 5 hoti hai, count nahi)
      Visitor.countDocuments(preApprovedFilter),

      Visitor.find({
        buildingCode: code,
        status: ENTERED_STATUS,
        createdAt: dayRange,
      })
        .sort({ createdAt: -1 })
        .limit(LIST_LIMIT)
        .lean(),

      Visitor.find({
        buildingCode: code,
        status: ENTERED_STATUS,
        entryTime: dayRange,
      })
        .sort({ entryTime: -1 })
        .limit(LIST_LIMIT)
        .lean(),

      // "Abhi andar": date range nahi. Raat ko andar aaya aur subah tak andar hai
      // to bhi count hona chahiye. Purani date par ye meaningless hai, isliye 0.
      isToday
        ? Visitor.countDocuments({
            buildingCode: code,
            status: ENTERED_STATUS,
            exitTime: null, // missing field bhi match hota hai
          })
        : 0,

      Notice.find({ buildingCode: code })
        .sort({ createdAt: -1 })
        .limit(LIST_LIMIT)
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        stats: {
          visitorCount,
          currentlyInsideCount,
          preApprovedCount,
        },
        preApproved: preApprovedList,
        recentVisitors,
        notices,
      },
    });
  } catch (error) {
    console.error("getGuardDashboard error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default getGuardDashboard;
