import express from "express";
import createMeeting from "../controller/meeting/createMeeting.js";
import adminAuth from "../middleware/adminAuth.js";
import getAllMeetingList from "../controller/meeting/getAllMeetingList.js";
import singleMeetingDetail from "../controller/meeting/singleMeetingDetail.js";
import memberAuth from "../middleware/memberAuth.js";
import checkBuildingSubscription from "../middleware/checkBuildingSubscription.js";

const meetingRouter = express.Router();

meetingRouter.post(
  "/createMeeting",
  adminAuth,
  checkBuildingSubscription,
  createMeeting
);
meetingRouter.get(
  "/admin/getAllMeeting",
  adminAuth,
  checkBuildingSubscription,
  getAllMeetingList
);
meetingRouter.get(
  "/member/getAllMeeting",
  memberAuth,
  checkBuildingSubscription,
  getAllMeetingList
);
meetingRouter.get(
  "/singleMeetingDetail/:meetingId",
  adminAuth,
  checkBuildingSubscription,
  singleMeetingDetail
);
export default meetingRouter;
