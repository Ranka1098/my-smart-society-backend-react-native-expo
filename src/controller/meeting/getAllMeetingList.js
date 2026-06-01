import meetingModel from "../../model/meeting.js";

const getAllMeetingList = async (req, res) => {
  try {
    const buildingCode = req.buildingCode; // 🔐 middleware se
    // const meetings = await meetingModel.find({});

    const meetings = await meetingModel
      .find({ buildingCode })
      .sort({ meetingDate: -1 }) // 🔥 latest first
      .populate("attendance.member", "memberType unitNo");

    res.status(200).json({
      success: true,
      total: meetings.length,
      meetings,
    });
  } catch (error) {
    console.error("All Meeting List Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export default getAllMeetingList;
