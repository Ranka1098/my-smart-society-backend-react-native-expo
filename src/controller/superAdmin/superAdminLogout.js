import superAdminModel from "../../model/superAdmin.js";

const superAdminLogout = async (req, res) => {
  try {
    console.log("req.superAdmin:", req.superAdmin); // ← ye dekho null hai ya nahi
    // FCM token remove
    await superAdminModel.findByIdAndUpdate(req.superAdmin.id, {
      fcmToken: null,
    });

    return res
      .status(200)
      .json({ success: true, message: "Logout successful" });
  } catch (error) {
    console.log("Logout Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default superAdminLogout;
