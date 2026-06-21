import adminModel from "../../../model/admin.js";

const adminLogout = async (req, res) => {
  try {
     console.log("req.admin:", req.admin); // ← ye dekho null hai ya nahi
    // FCM token remove
    await adminModel.findByIdAndUpdate(req.admin.id, { fcmToken: null });

    return res
      .status(200)
      .json({ success: true, message: "Logout successful" });
  } catch (error) {
    console.log("Logout Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default adminLogout;
