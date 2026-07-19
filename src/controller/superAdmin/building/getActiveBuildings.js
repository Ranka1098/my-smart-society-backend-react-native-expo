// controller/superadmin/getActiveBuildings.js
import Building from "../../../model/building.js";

const getActiveBuildings = async (req, res) => {
  try {
    const buildings = await Building.find({ subscriptionStatus: "active" });

    return res.status(200).json({ success: true, buildings });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export default getActiveBuildings;
