import express from "express";
import createMeeting from "../controller/meeting/createMeeting.js";
import adminAuth from "../middleware/adminAuth.js";
import getAllMeetingList from "../controller/meeting/getAllMeetingList.js";
import singleMeetingDetail from "../controller/meeting/singleMeetingDetail.js";
const meetingRouter = express.Router();

meetingRouter.post("/createMeeting", adminAuth, createMeeting);
meetingRouter.get("/getAllMeeting", adminAuth, getAllMeetingList);
meetingRouter.get(
  "/singleMeetingDetail/:meetingId",
  adminAuth,
  singleMeetingDetail
);

export default meetingRouter;
