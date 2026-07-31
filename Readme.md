itorEntry", "VisitorHistory"]
ERROR fetchLogs error: [AxiosError: Request failed with status code 401]

Call Stack
construct (<native>)
apply (<native>)
\_construct (node_modules\@babel\runtime\helpers\construct.js)
Wrapper (node_modules\@babel\runtime\helpers\wrapNativeSuper.js)
construct (<native>)
\_callSuper (node_modules\@babel\runtime\helpers\callSuper.js)
AxiosError#constructor (node_modules\axios\dist\esm\axios.js)
settle (node_modules\axios\dist\esm\axios.js)
onloadend (node_modules\axios\dist\esm\axios.js)
invoke (node_modules\react-native\src\private\webapis\dom\events\EventTarget.js)
dispatch (node_modules\react-native\src\private\webapis\dom\events\EventTarget.js)
INTERNAL_DISPATCH_METHOD_KEY (node_modules\react-native\src\private\webapis\dom\events\EventTarget.js)
dispatchTrustedEvent (node_modules\react-native\src\private\webapis\dom\events\internals\EventTargetInternals.js)
setReadyState (node_modules\react-native\Libraries\Network\XMLHttpRequest.js)
\_\_didCompleteResponse (node_modules\react-native\Libraries\Network\XMLHttpRequest.js)
apply (<native>)
RCTNetworking.addListener$argument_1 (node_modules\react-native\Libraries\Network\XMLHttpRequest.js)
apply (<native>)
emit (node_modules\react-native\Libraries\vendor\emitter\EventEmitter.js)
apply (<native>)
<anonymous> (node_modules\@babel\runtime\helpers\superPropGet.js)
RCTDeviceEventEmitterImpl#emit (node_modules\react-native\Libraries\EventEmitter\RCTDeviceEventEmitter.js)
Axios#request (node_modules\axios\dist\esm\axios.js)
throw (<native>)
asyncGeneratorStep (node_modules\@babel\runtime\helpers\asyncToGenerator.js)
\_throw (node_modules\@babel\runtime\helpers\asyncToGenerator.js)
tryCallOne (address at (InternalBytecode.js:1:1180)
anonymous (address at (InternalBytecode.js:1:1874)

Haan bhai, sahi jagah hai.

Order theek hai:

Role check
Fields check
Building exist check
Building active check
Subscription check ← ye yaha hona hi chahiye
User (admin/member) exist check
Verify check
Password check
Token

Kyu sahi hai: Building expired/blocked hai to user exist karta hai ya nahi, verify hai ya nahi — koi matter nahi karta. Pehle hi block kar do, DB pe extra query bhi bach gaya (admin/member lookup skip ho jata hai).

Ek gap hai dono file me: building.subscriptionStatus === "expired" check trial expire ka case cover nahi karta agar tumhare schema me "trial" status bhi hai aur trial khatam hone pe status update nahi hota kahi cron se. Confirm kar lena — agar subscriptionStatus cron/pre-save hook se auto-update hota hai to fine hai, warna trial-expired users login kar payenge.
