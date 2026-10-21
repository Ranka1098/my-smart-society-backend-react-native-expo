export const emitGuardSync = (req, buildingCode, { action, visitorId }) => {
  try {
    const g = req.staff ?? req.user;
    req.app.get("io")?.to(`guard_${buildingCode}`).emit("guard_sync", {
      action,
      visitorId: String(visitorId),
      byGuardId: String(g?._id ?? ""),
      byGuardName: g?.workerName || g?.name || "Guard",
      at: Date.now(),
    });
  } catch (e) {
    console.error("emitGuardSync error:", e);
  }
};