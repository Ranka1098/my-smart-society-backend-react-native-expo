1.backend socket setup completed
2.fcm setup complted
3.notifcation setup completed

frontend
✅ socket.js (util) — sahi hai
connectSocket, getSocket, disconnectSocket — clean singleton pattern. Koi dikkat nahi.

✅ Member \_layout.js — sabse complete, pro-level
Confirm sahi:

join_member emit ho raha (line socket.emit("join_member", memberId)) ✓
socket.on("notification", ...) listener ✓ — Redux unread count + in-app alert (SweetAlertPop) dono ho rahe
socket.on("visitor_request", ...) ✓ — alag feature, bhi wired hai
FCM foreground handler (onMessage) ✓ — notifee se manually system tray me dikha raha (smart move, kyunki FCM foreground me khud tray me nahi dikhata)
Connection retry logic (socket.once("connect", ...) agar abhi connected nahi) ✓ — race condition handle ho raha
Cleanup (socket.off, listenerAttached.current = false) ✓

1 chhoti gap: join*building(buildingCode) kahin emit nahi ho raha member side — sirf join_member ho raha hai. Tera notifyAllMembers individual member*${id} rooms use karta hai (broadcast bhi unhi rooms pe), to abhi functionally chal jayega. Lekin agar kabhi tu building-wide announcement (jaise notice, meeting) bhi same room pattern se bhejega to fine hai — bas dhyan rakhna join_building zaroorat na pade to chhodo, agar future me building-level socket events banao to add karna.

⚠️ Admin \_layout.js — adhura
const socket = getSocket();
if (!socket) return;
Bada gap: Admin yahan sirf getSocket() call kar raha — kahin connectSocket() call nahi ho raha, aur na hi koi join_admin emit ho raha.
Matlab:

Agar socket pehle se kahin connect nahi hua (login screen pe), to getSocket() null return karega, aur listener kabhi lagega hi nahi
socket.emit("join*admin", buildingCode) kahin nahi hai — backend room admin*${buildingCode} hai, par admin kabhi join hi nahi kar raha. To agar tu kal notifyMemberToAdmin use karega (member → admin complaint), wo notification socket se kabhi admin tak nahi pahunchegi.

useEffect(() => {
const socket = connectSocket(); // getSocket() nahi, connectSocket()

const adminBuildingCode = ... // redux se nikaalo adminAuth slice se

const attachListener = () => {
socket.emit("join_admin", adminBuildingCode);
socket.on("notification", handler);
};

if (socket.connected) attachListener();
else socket.once("connect", attachListener);

return () => socket.off("notification", handler);
}, []);

❌ Staff _layout.js — socket bilkul nahi hai
Koi getSocket, connectSocket, join_staff, socket.on — kuch bhi nahi. Tera backend room staff_${buildingCode} bana hua hai (io.to('staff\_...')), but staff app kabhi join hi nahi karta. Agar Security Guard ko koi notification bhejni ho (jaise visitor approval status), abhi wo kabhi nahi pahunchegi.

/caveman login ke baadlogin.js (actual component) tune is baar bheja nahi — sirf slices bheje hain. Ye sab Redux state files hain, ye batati nahi connectSocket() kahan call hota hai.
Slices se itna confirm hua:

setMemberLogin, setAdminLogin, setStaffLogin — login success pe Redux me data set hota
notificationSlice clean hai, role-based unread count sahi structure me

Lekin socket connect kahan trigger hota hai — abhi bhi pata nahi.

call karna hai
Theek hai, samajh gaya — tujhe khud nahi pata kahan call karna hai. Bata deta hu exactly kahan aur kaise, copy-paste kar sakta hai.

Socket connect 1 hi jagah honi chahiye: login success ke turant baad, jahan dispatch(setMemberLogin(...)) ya setAdminLogin(...) ya setStaffLogin(...) call hota hai.

Tera login component (jo bhi naam ho — Login.jsx ya login.js) me pattern aisa hoga (approx):

const res = await api.post("/memberLogin", { ... });
if (res.data.success) {
dispatch(setMemberLogin(res.data.member));
// 👇 YAHAN ADD KARNA HAI
router.replace("/(member)/memberDashboard");
}

Iske turant upar ye 2 lines add karo:import { connectSocket, getSocket } from "../src/utils/socket"; // path apna check karo

// login success ke andar:
const socket = connectSocket();
socket.emit("join_member", res.data.member.\_id);

Poora context:
if (res.data.success) {
dispatch(setMemberLogin(res.data.member));

const socket = connectSocket();
socket.emit("join_member", res.data.member.\_id);

router.replace("/(member)/memberDashboard");
}

Same pattern teeno jagah:
FileRoleKya emit karna
Member login.membersocket.emit("join_member", member.\_id)
Admin login.adminsocket.emit("join_admin", admin.buildingCode)
Staff login.staffsocket.emit("join_staff", staff.buildingCode)

Kyu yahan? Kyunki yahi pehli jagah hai jahan tujhe memberId/buildingCode pata chalta hai (login response se). Socket connect usse pehle bhi ho sakta hai, par room join karne ke liye ID chahiye — to login success hi sahi jagah hai.


Note: Tera _layout.js (member) me already getSocket() + socket.once("connect", ...) ka fallback retry logic hai — to agar login se socket connect ho jaye, layout khud-ba-khud listener attach kar lega. Lekin agar login me connectSocket() na ho, to layout ka getSocket() hamesha null milega (kyunki socket banaya hi nahi gaya) — yahi tera root cause hai.
Bas itna add kar — login.js bhejna ho confirm karne ke liye to bhej, warna khud try kar le.


Bug 2 — Member layout: double join_member emit
Login pe: useFCMAndSocket → socket.emit("join_member", userId) ✅
Layout pe: socket.emit("join_member", memberId) again ✅
App reopen (AuthInitializer) pe: socket.emit("join_member", userId) ✅
Teen baar same room join — harmless but dirty. Asli problem nahi yeh.

Bug 3 — Staff layout: zero socket listeners ❌
Member layout me notification + visitor_request listener hai.
Admin layout me notification listener hai.
Staff _layout.js me kuch nahi — sirf Drawer return karta hai.
Staff ko notifications milti hi nahi kyunki koi sun nahi raha.