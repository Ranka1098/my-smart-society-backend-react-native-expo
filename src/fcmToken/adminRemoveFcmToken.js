import { releaseFcmToken } from "./claimFcmToken.js";

const adminRemoveFcmToken = async (req, res) => {
  try {
    const id = req.admin?._id ?? req.admin?.id;
    if (!id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    await releaseFcmToken("admin", id);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("adminRemoveFcmToken error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default adminRemoveFcmToken;