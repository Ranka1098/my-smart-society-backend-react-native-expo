// utils/resolveMemberName.js
const resolveMemberName = (pending) => {
  if (pending.memberType === "Flat" && pending.status === "Owner") {
    return pending.flatOwnerName;
  }

  if (pending.memberType === "Flat" && pending.status === "Rent") {
    return pending.flatRenterName;
  }

  if (pending.memberType === "Shop" && pending.status === "Owner") {
    return pending.shopOwnerName;
  }

  if (pending.memberType === "Shop" && pending.status === "Rent") {
    return pending.shopRenterName;
  }

  return "Member";
};

export default resolveMemberName;
