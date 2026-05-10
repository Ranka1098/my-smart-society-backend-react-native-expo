const buildMemberRequestMessage = ({ unitType, unitNumber }) => {
  if (!unitType || !unitNumber) {
    return "🏠 New member registered and waiting for admin approval";
  }

  const type = String(unitType).toLowerCase();

  let label = "Member";
  let emoji = "🏠";

  if (type === "flat") {
    label = "Flat";
    emoji = "🏢";
  } else if (type === "shop") {
    label = "Shop";
    emoji = "🏪";
  }

  return `${emoji} New ${label} ${unitNumber} registered and waiting for admin approval`;
};
export default buildMemberRequestMessage;
