// utils/getActiveUnitCounts.js

import Member from "../../../model/member.js";

export const getActiveUnitCounts = async (buildingCode) => {
  const activeFlats = await Member.countDocuments({
    buildingCode,
    memberType: "Flat",
    role: "primary",
    approvalStatus: "Approved",
  });

  const activeShops = await Member.countDocuments({
    buildingCode,
    memberType: "Shop",
    role: "primary",
    approvalStatus: "Approved",
  });

  return { activeFlats, activeShops };
};
