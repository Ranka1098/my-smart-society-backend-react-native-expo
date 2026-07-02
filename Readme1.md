# Notification System — Socket.IO + FCM + DB

3 layer: DB save (history) + Socket (app open → turant UI) + FCM (app band → tray notif). Teeno saath chalte, ek dusre ka replacement nahi.

---

## 1. Socket.IO basics

Normal API = call karo, jawab lo, line kategi. Socket.IO = line khuli rehti, dono taraf jab chaho bol sakte.

### Backend setup

```js
const io = new Server(server, { cors: {...} });
app.set("io", io); // poore app me access ke liye, controller me req.app.get("io") se mile
```

`io` = pura exchange. `socket` = ek user ka individual connection.

```js
io.on("connection", (socket) => {
  // naya user connect hote hi fire, har user ke liye alag baar
});
```

### Rooms = targeted mailbox

```js
socket.on("join_member", (memberId) => {
  socket.join(`member_${memberId}`);
});
```

Ek socket multiple rooms me ho sakta. Room sirf backend memory me hota, UI me kuch nahi dikhta.

Naming pattern:
- `member_<id>` → ek member ka personal mailbox
- `admin_<buildingCode>` → admin shared room
- `staff_<buildingCode>` → staff shared room
- `guard_<id>` → guard

### Emit (backend → frontend)

```js
io.to(roomName).emit("event_name", data);
```

`.to(room)` = mailbox select karo. `.emit()` = letter daalo. Room ke andar jitne socket hain sabko ek saath milta — turant, koi refresh/API call nahi.

### Cycle

```
Admin add expense → POST → controller save DB
  → io.to(room).emit() → socket.on() frontend pe
  → UI turant update + toast + haptic
```

---

## 2. Frontend socket setup

```bash
npx expo install socket.io-client
```

**`src/socket/socket.js`** — central connection, sabki taraf se same use ho:

```js
import { io } from "socket.io-client";

const SOCKET_URL = "http://YOUR_BACKEND_IP:1098";

export const socket = io(SOCKET_URL, {
  autoConnect: false, // login ke baad khud connect karenge (memberId chahiye room join ke liye)
  transports: ["websocket"],
});
```

**Login ke baad connect + room join:**

```js
socket.connect();
socket.emit("join_building", buildingCode);
socket.emit("join_member", memberId);
```

**Logout pe disconnect** (warna purana session ka socket zinda reh jata, memory leak):

```js
socket.disconnect();
```

**Screen pe listener:**

```js
useEffect(() => {
  const handler = (data) => {
    setExpenses((prev) => [data, ...prev]);
  };
  socket.on("vendor_expense_added", handler);
  return () => socket.off("vendor_expense_added", handler); // cleanup zaroori, warna duplicate listener
}, []);
```

> ⚠️ Correction: backend ab sab notification types `"notification"` event se bhejta hai (`payload.type` se route karo), `"vendor_expense_added"` jaisa alag event naam nahi — niche section 5 dekho.

---

## 3. Haptic feedback

```bash
npx expo install expo-haptics
```

```js
import * as Haptics from "expo-haptics";

Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
```

`SweetAlertPop` se chhota success banner bhi laga sakte (optional).

---

## 4. FCM (Firebase Cloud Messaging)

Socket sirf app open/running me kaam karta. App band (killed) ho to socket disconnect — kuch nahi pahunchega.
FCM Google servers se aata, app band ho tab bhi tray me notification deliver karta.

```
Socket.IO → app open → turant UI update
FCM       → app open/bg/closed → notification tray
```

### Step 1 — member ka FCM token store karo

```js
fcmToken: { type: String, default: null }
```

App install pe Firebase unique token deta — login/app-open pe DB me save hona chahiye.

### Step 2 — Firebase Admin SDK init (already in `server.js`)

```js
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
```

### Step 3 — single member ko bhejo

```js
const sendPushNotification = async (token, title, body, data = {}) => {
  if (!token) return;
  const message = { token, notification: { title, body }, data };
  try {
    await admin.messaging().send(message);
  } catch (error) {
    console.error("FCM send error:", error.message);
  }
};
```

### Step 4 — sab members ko bhejo (multicast)

```js
const notifyAllMembers = async ({ buildingCode, title, message, data }) => {
  const members = await MemberModel.find({ buildingCode, fcmToken: { $ne: null } });
  const tokens = members.map((m) => m.fcmToken);
  if (tokens.length === 0) return;

  const fcmMessage = { notification: { title, body: message }, data, tokens };

  try {
    const response = await admin.messaging().sendEachForMulticast(fcmMessage);
    console.log(`Sent: ${response.successCount}, Failed: ${response.failureCount}`);
  } catch (error) {
    console.error("FCM multicast error:", error.message);
  }
};
```

`sendEachForMulticast` ek call me kai tokens ko bhejta — loop ki zaroorat nahi.

### Step 5 — controller me call

```js
await notifyAllMembers({
  buildingCode,
  title: "New Expense Added 💸",
  message: `${vendor.companyName} - ₹${amount} expense recorded`,
  data: { type: "EXPENSE", expenseId: expense._id.toString() },
});
```

`data` zaroori — tap karne pe sahi screen khole.

### Step 6 — frontend receive + tap handle

```js
import messaging from "@react-native-firebase/messaging";
import { router } from "expo-router";

// Foreground — tray me khud nahi aata, manually dikhao (banner/toast)
messaging().onMessage(async (remoteMessage) => {
  console.log("Foreground notification:", remoteMessage);
});

// Background → tap kiya
messaging().onNotificationOpenedApp((remoteMessage) => {
  const data = remoteMessage.data;
  if (data?.type === "EXPENSE") router.push(`/expense/${data.expenseId}`);
});

// Killed → tap se khuli
messaging().getInitialNotification().then((remoteMessage) => {
  if (remoteMessage) {
    const data = remoteMessage.data;
    if (data?.type === "EXPENSE") router.push(`/expense/${data.expenseId}`);
  }
});
```

3 states yaad rakho:
| State | Handler | Notes |
|---|---|---|
| Foreground | `onMessage` | tray me auto nahi aata, khud dikhao |
| Background tap | `onNotificationOpenedApp` | minimized thi, tray se tap |
| Killed tap | `getInitialNotification` | band thi, tap se open |

---

## 5. Central notification system (`notificationHelpers.js`)

Ek "notification factory" — har jagah se (admin action, visitor entry, complaint) yahi file call hoti. Core function `createAndSend` 3 kaam karta:

1. DB save (history, "Notifications" tab ke liye)
2. Socket emit (app open → turant UI)
3. FCM (app band → tray)

Baaki functions (`notifyAllMembers`, `notifyMemberToAdmin`, etc.) sirf `createAndSend` ko alag settings ke saath call karte — "kisko bhejna" decide karte.

### Part 1 — DB save

```js
const notification = await Notification.create({...});
```

Pehle DB save — socket/FCM fail bhi ho jaye to history reh jati.

### Part 2 — audience decide (MEMBERS example)

```js
if (audience === "MEMBERS") {
  const members = await Member.find({ buildingCode }).select("_id fcmToken");
  tokens = members.map((m) => m.fcmToken).filter(Boolean);

  members.forEach((m) => {
    const room = `member_${m._id.toString()}`;
    io.to(room).emit("notification", { type, title, message, data });
  });
}
```

`filter(Boolean)` → jiske paas token nahi (null) unhe hata do.
Members har ek ka room individual hota (`member_<id>`) isliye loop chahiye — ADMIN/STAFF/SUPERADMIN ek shared room (`admin_<buildingCode>`) me hote, wahan loop nahi:

```js
io.to(`admin_${buildingCode}`).emit("notification", {...});
```

### Part 3 — FCM bhejo

```js
if (tokens.length > 0) {
  await sendFCM(tokens, title, message, data);
}
```

Fail ho to bhi crash nahi — sirf log (resilience, DB me already save ho chuka).

### Helper variants

| Function | Kaam |
|---|---|
| `notifyAllMembers` | `audience: "MEMBERS"` fix, simple wrapper |
| `notifyAllMembersAndStaff` | `createAndSend` 2 baar — members + staff, alag DB record, alag room |
| `notifyMemberToAdmin` | ulta direction — member action → admin ko batao (`receiverId: senderId`) |
| `notifyVisitorToMember` | ek hi specific member, `createAndSend` use nahi karta, apna simple version: `io.to(member_${memberId}).emit(...)` + single token FCM |

### Important — frontend listener correction

Backend sab notification ek hi event `"notification"` se bhejta — alag-alag event names nahi (`"vendor_expense_added"` galat):

```js
socket.on("notification", (payload) => {
  if (payload.type === "EXPENSE") {
    setExpenses((prev) => [
      {
        _id: payload.data.expenseId,
        vendorName: payload.data.vendorName,
        amount: payload.data.amount,
      },
      ...prev,
    ]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
  // future: payload.type === "COMPLAINT" / "MEETING" — waise hi add karo
});
```

Ek listener, central, `type` field se route — scalable. Naya feature add karne pe naya socket event nahi banana, bas `type` check add karo.

---

## 6. `sendFCM` utility — actual sending engine

```js
export const sendFCM = async (tokens, title, body, data = {}) => {
  if (!tokens?.length) return; // safety check
```

### stringData conversion

FCM rule: `data` field me sirf strings allowed, number/boolean nahi chalega.

```js
const stringData = Object.fromEntries(
  Object.entries(data).map(([k, v]) => [k, String(v)])
);
```

`{ amount: 500 }` → `{ amount: "500" }`.

### Actual call

```js
const result = await getMessaging().sendEachForMulticast({
  tokens,
  notification: { title, body },
  data: stringData,
  android: {
    priority: "high",
    notification: {
      sound: "default",
      channelId: "default",
      defaultSound: true,
      defaultVibrateTimings: true,
      visibility: "PUBLIC",
      notificationCount: 1,
    },
  },
  apns: {
    payload: { aps: { sound: "default", badge: 1 } },
  },
});
```

| Field | Matlab |
|---|---|
| `priority: "high"` | doze/battery saver me bhi turant deliver |
| `channelId` | Android 8+ notification channel grouping |
| `visibility: "PUBLIC"` | lock screen pe full content (PRIVATE = sirf "New notification") |
| `notificationCount` | app icon badge (abhi hardcoded 1, future: dynamic unread count) |
| `apns` block | iOS — future-proof, abhi Android focus hai |

### Response + error handling

```js
console.log(`[FCM] Sent: ${result.successCount} success, ${result.failureCount} failed`);
```

```js
} catch (err) {
  console.log("[FCM] Error:", err.message);
}
```

Crash nahi hota fail pe — main flow (expense create, DB save) block nahi hota.

> Future improvement: jo token consistently fail ho raha (uninstalled app, etc.) — DB se cleanup karo, abhi ke liye skip.

---

## 7. Full flow recap

```
createVendorExpense controller
  → notifyAllMembers (notifyMembers.js)
    → createAndSend
      1. DB save
      2. io.to(member_<id>).emit("notification", {...}) — sabhi member rooms
      3. sendFCM(tokens, ...) (sendFcmNotification.js)
        → getMessaging().sendEachForMulticast()
          → Google FCM servers → phone tray
```

3 layers, 3 files, clean separation.

### Pending (frontend, member app)

- [ ] Socket connect + room join (login ke baad)
- [ ] `socket.on("notification", ...)` listener (expense screen pe)
- [ ] FCM foreground/background/killed handlers