import noticeModel from "../../model/notice.js";

const deleteNotice = async (req, res) => {
  try {
    if (!req.adminId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { id } = req.params;

    // Find the notice first to verify building ownership
    const notice = await noticeModel.findById(id);

    if (!notice) {
      return res.status(404).json({ message: "Notice not found" });
    }

    // Check if the notice belongs to the admin's building
    if (notice.buildingCode.toString() !== req.buildingCode.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this notice" });
    }

    await noticeModel.findByIdAndUpdate(id, { isActive: false });

    res.json({ success: true, message: "Notice removed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export default deleteNotice;
