import Member from "../../../model/member.js"; // ⚠️ apne actual Member model ka path/fields check kar lena

/**
 * Building ke ACTIVE flat aur shop count nikalta hai — maintenance generate
 * hui ya nahi, uspe depend NAHI karta. Directly Member/unit collection se
 * count karta hai jo abhi occupied/active hai.
 *
 * ⚠️ Field names assume kiye hain (unitType, status, buildingCode). Apne
 * Member schema ke actual field names se match karke adjust kar lena —
 * agar tumhare paas alag "Flat"/"Shop" collection hai to wahan se count karo,
 * ya jo bhi source of truth hai occupied units ka.
 */
export const countActiveUnits = async (buildingCode) => {
  const [flatCount, shopCount] = await Promise.all([
    Member.countDocuments({
      buildingCode,
      unitType: "flat", // ya jo bhi field flat/shop differentiate karta hai
      status: "active", // ya isActive: true — apne schema ke hisaab se
    }),
    Member.countDocuments({
      buildingCode,
      unitType: "shop",
      status: "active",
    }),
  ]);

  return { flatCount, shopCount };
};

/**
 * Rate-based amount = (active flats * perFlatRate) + (active shops * perShopRate).
 * Trial plan ke rates 0 honge to amount khud hi 0 aa jaayega.
 */
export const calculateSubscriptionAmount = (plan, flatCount, shopCount) => {
  const flatAmount = (plan.perFlatRate || 0) * flatCount;
  const shopAmount = (plan.perShopRate || 0) * shopCount;
  return flatAmount + shopAmount;
};