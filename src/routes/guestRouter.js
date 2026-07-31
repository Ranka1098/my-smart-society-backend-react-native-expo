import express from "express";
import createPreApproved from "../controller/guest/createPreApproved.js";
import getMemberPreApproved from "../controller/guest/getMemberPreApproved.js";
import getGuardPreApproved from "../controller/guest/getGuardPreApproved.js";
import cancelPreApproved from "../controller/guest/cancelPreApproved.js";
import allowEntry from "../controller/guest/allowEntry.js";
import denyEntry from "../controller/guest/denyEntry.js";
import getMemberVisitorHistory from "../controller/guest/getMemberVisitorHistory.js";

import memberAuth from "../middleware/memberAuth.js";
import staffAuth from "../middleware/staffAuth.js";
import checkBuildingSubscription from "../middleware/checkBuildingSubscription.js";

const guestRouter = express.Router();

// Member routes
guestRouter.post("/pre-approve", memberAuth, checkBuildingSubscription, createPreApproved);
guestRouter.get("/pre-approved", memberAuth, checkBuildingSubscription, getMemberPreApproved);
guestRouter.patch("/pre-approve/:id/cancel", memberAuth, checkBuildingSubscription, cancelPreApproved);
guestRouter.get("/getMemberVisitorHistory", memberAuth, checkBuildingSubscription, getMemberVisitorHistory);

// Guard routes
guestRouter.get("/pre-approved/guard", staffAuth, checkBuildingSubscription, getGuardPreApproved);
guestRouter.patch("/pre-approve/:id/allow", staffAuth, checkBuildingSubscription, allowEntry);
guestRouter.patch("/pre-approve/:id/deny", staffAuth, checkBuildingSubscription, denyEntry);

export default guestRouter;