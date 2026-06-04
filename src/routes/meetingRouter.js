import express from "express";
import createMeeting from "../controller/meeting/createMeeting.js";
import adminAuth from "../middleware/adminAuth.js";
import getAllMeetingList from "../controller/meeting/getAllMeetingList.js";
import singleMeetingDetail from "../controller/meeting/singleMeetingDetail.js";
import memberAuth from "../middleware/memberAuth.js";
const meetingRouter = express.Router();

meetingRouter.post("/createMeeting", adminAuth, createMeeting);
meetingRouter.get("/admin/getAllMeeting", adminAuth, getAllMeetingList);
meetingRouter.get("/member/getAllMeeting",memberAuth, getAllMeetingList);
meetingRouter.get(
  "/singleMeetingDetail/:meetingId",
  adminAuth,
  singleMeetingDetail
);

export default meetingRouter;
