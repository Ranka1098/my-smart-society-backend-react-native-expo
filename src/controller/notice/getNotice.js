import noticeModel from "../../model/notice.js";

const getNotice = async (req, res) => {
  try {
    const buildingCode = req.buildingCode;

    const notices = await noticeModel
      .find({
        buildingCode,
        isActive: true,
      })
      .sort({ createdAt: -1 });

    res.json({ success: true, notices });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
export default getNotice;
