import memberModel from "../../../model/member.js";

const memberLogout = async (req, res) => {
  try {
    // FCM token remove
    await memberModel.findByIdAndUpdate(req.member._id, { fcmToken: null });

    return res
      .status(200)
      .json({ success: true, message: "Logout successful" });
  } catch (error) {
    console.log("Member Logout Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default memberLogout;
