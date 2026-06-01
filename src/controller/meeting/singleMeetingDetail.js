import meetingModel from "../../model/meeting.js";

// singleMeetingDetail.js
const singleMeetingDetail = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const buildingCode = req.buildingCode;

    const meeting = await meetingModel
      .findOne({ _id: meetingId, buildingCode })
      .populate("attendance.member", "memberType unitNo");
    if (!meeting) {
      return res
        .status(404)
        .json({ success: false, message: "Meeting not found" });
    }

    res.status(200).json({ success: true, meeting });
  } catch (error) {
    console.error("Single Meeting Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export default singleMeetingDetail;
