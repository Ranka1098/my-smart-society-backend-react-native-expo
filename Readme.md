Determined user sought simplified, step-by-step checklist format
Determined user sought simplified, step-by-step checklist format
Simple rakhne ke liye — 6 step, order me karo:

Step 1: Visitor model fix
purpose enum me worker categories add karo (Maid, Cook, Driver, Cleaner, Gardener, Security), verificationMethod enum me "PreApprovedWorker" add karo. Baaki schema same rahega.

Step 2: WorkerProfile ke liye 2 hi API bano

POST /worker/request-approval — pehli baar aane pe (name, mobile, category, flatNo agar FlatStaff, photo). WorkerProfile create/upsert karo status PendingApproval.
POST /worker/approve — admin (SocietyStaff) ya member (FlatStaff) approve kare, status Approved set karo.
Ye tera existing createVisitorPendingRequest.js ka copy hai bas Visitor ki jagah WorkerProfile save hoga. Naya file mat socho — usi pattern se likho.

Step 3: Daily entry ke liye 2 hi API bano

GET /worker/search?query= — sirf status: "Approved" wale worker return kare
POST /worker/quick-entry — workerId lekar Visitor record bana de, photoUrl worker se copy karo (naya upload mat karo)
Step 4: Frontend — sirf 1 naya button
"Daily Staff Entry" — search box → name type karo → list se tap karo → seedha save (no camera, no timer, no approval wait). Baaki 3 button (Staff Approval, Staff Entry ko hata ke sirf ye rakho, New Visitor) same rahenge — Staff Approval ab sirf pehli baar wale worker ke liye use hoga.

Step 5: Purane "Staff Entry" (auto-approved) button hata do
Ab zaroorat nahi — daily staff entry naya flow handle kar dega. Confusion kam hoga, module simple rahega.

Step 6: Test order

Naya worker → approval request bhejo → admin/member se approve karao
Same worker ko "Daily Staff" search me dhoondo → entry save karo → photo naya upload nahi hua confirm karo (network tab dekh lo)
Purane Visitor flow (guest, member) touch mat karo — wo already sahi hai
Bas itna. Exit flow me kuch change nahi karna — wo already sahi hai jaisa maine bataya.

Priority: Step 1-3 backend pehle karo, phir Step 4 frontend. Ek ek karke, poora backend pehle test karo Postman se, phir UI lagao.