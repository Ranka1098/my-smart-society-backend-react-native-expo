import memberModel from "../model/member.js";

const memberRemoveFcmToken = async (req, res) => {
  try {
    const memberId = req.member._id;
    await memberModel.findByIdAndUpdate(memberId, { fcmToken: null });
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export default memberRemoveFcmToken;
