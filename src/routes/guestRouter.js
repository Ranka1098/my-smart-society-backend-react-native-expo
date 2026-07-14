import express from "express";
import createPreApproved from "../controller/guest/createPreApproved.js";
import getMemberPreApproved from "../controller/guest/getMemberPreApproved.js";
import getGuardPreApproved from "../controller/guest/getGuardPreApproved.js";
import cancelPreApproved from "../controller/guest/cancelPreApproved.js";
import allowEntry from "../controller/guest/allowEntry.js";
import denyEntry from "../controller/guest/denyEntry.js";
import getMemberVisitorHistory from "../controller/guest/getMemberVisitorHistory.js";
const guestRouter = express.Router();
guestRouter.post("/pre-approve", createPreApproved);
guestRouter.get("/pre-approved", getMemberPreApproved); // member: ?buildingCode&memberId
guestRouter.get("/pre-approved/guard", getGuardPreApproved); // guard: ?buildingCode
guestRouter.patch("/pre-approve/:id/cancel", cancelPreApproved);
guestRouter.patch("/pre-approve/:id/allow", allowEntry);
guestRouter.patch("/pre-approve/:id/deny", denyEntry);
guestRouter.get("/getMemberVisitorHistory", getMemberVisitorHistory);
export default guestRouter;
