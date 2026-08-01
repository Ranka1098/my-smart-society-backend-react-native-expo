
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
