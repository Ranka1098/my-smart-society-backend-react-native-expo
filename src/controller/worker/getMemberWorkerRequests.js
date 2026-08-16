import WorkerProfile from "../../model/WorkerProfile.js";

const getMemberWorkerRequests = async (req, res) => {
  try {
    const buildingCode = req.member.buildingCode;
    const flatNo = String(req.member.unitNo || "").trim();
    const memberType = req.member.memberType;
    const { status } = req.query;

    if (!flatNo) {
      return res
        .status(400)
        .json({ success: false, message: "Member ka flat number nahi mila" });
    }

    const filter = {
      buildingCode,
      workerType: "FlatStaff",
      flatNo,
      ...(memberType ? { memberType } : {}),
    };
    if (status) filter.status = status; // ✅ CHANGE — status na diya to sab status aayenge

    const workers = await WorkerProfile.find(filter).sort({ createdAt: -1 });

    return res
      .status(200)
      .json({ success: true, count: workers.length, workers });
  } catch (err) {
    console.error("getMemberWorkerRequests error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default getMemberWorkerRequests;
