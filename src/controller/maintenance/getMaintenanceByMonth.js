import MaintenanceMonth from "../../model/maintenanceMonthSchema.js";
import Maintenance from "../../model/maintenance.js";

const getMaintenanceByMonth = async (req, res) => {
  try {
    const buildingCode = req.buildingCode;

    if (!buildingCode) {
      return res.status(400).json({
        success: false,
        message: "Building code is required",
      });
    }

    const [months, extraDocs] = await Promise.all([
      MaintenanceMonth.find({ buildingCode }).sort({ createdAt: -1 }).lean(),
      Maintenance.find({ buildingCode, "extras.0": { $exists: true } })
        .select("month memberName memberType No extras")
        .lean(),
    ]);

    // month ke hisaab se group
    const extrasByMonth = {};
    for (const d of extraDocs) {
      (extrasByMonth[d.month] ||= []).push({
        _id: d._id,
        memberName: d.memberName,
        memberType: d.memberType,
        No: d.No,
        extras: d.extras,
      });
    }
    Object.values(extrasByMonth).forEach((list) =>
      list.sort((a, b) =>
        String(a.No).localeCompare(String(b.No), undefined, { numeric: true }),
      ),
    );

    const data = months.map((m) => ({
      ...m,
      extrasList: extrasByMonth[m.month] || [],
    }));

    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

export default getMaintenanceByMonth;
