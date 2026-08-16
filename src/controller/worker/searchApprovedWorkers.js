// controller/workerController.js (add this)
import WorkerProfile from "../../model/WorkerProfile.js";

export const searchApprovedWorkers = async (req, res) => {
  try {
    const buildingCode = req.buildingCode;
    const { query } = req.query;

    if (!buildingCode) {
      return res
        .status(401)
        .json({ success: false, message: "buildingCode missing in token" });
    }

    const filter = { buildingCode, status: "Approved" };

    if (query && query.trim()) {
      const regex = new RegExp(query.trim(), "i");
      filter.$or = [
        { name: regex },
        { mobile: regex },
        { flatNo: regex }, // ✅ NAYA — flat/shop no se bhi search ho sake
      ];
    }

    const workers = await WorkerProfile.find(filter)
      .select("name mobile category workerType flatNo memberType photoUrl") // ✅ memberType bhi select kar
      .sort({ name: 1 })
      .limit(30);

    return res
      .status(200)
      .json({ success: true, count: workers.length, workers });
  } catch (err) {
    console.error("searchApprovedWorkers error:", err);
    return res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
};
