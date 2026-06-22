import sharp from "sharp";
import StaffModel from "../../model/staff.js";
import Building from "../../model/building.js";
import uploadToCloudinary from "../../cloudinary/uploadToCloudinary.js";
import { notifyAllMembers } from "../notifcation/notifyMembers.js";
const compressAndUpload = async (buffer, folder, width) => {
  const compressed = await sharp(buffer)
    .resize({ width, withoutEnlargement: true })
    .jpeg({ quality: 70 })
    .toBuffer();
  const result = await uploadToCloudinary(compressed, folder);
  return result.secure_url;
};

const createdStaffMember = async (req, res) => {
  try {
    const { buildingCode, adminId } = req;
    const { role, workerName, joiningDate, workerPhoneNumber, workerAddress } =
      req.body;

    if (!buildingCode || !adminId)
      return res
        .status(400)
        .json({ success: false, message: "Building/Admin missing" });

    if (!role || !workerName || !joiningDate || !workerPhoneNumber)
      return res
        .status(400)
        .json({ success: false, message: "Required fields missing" });

    if (!req.files?.workerIdProof?.[0])
      return res
        .status(400)
        .json({ success: false, message: "Worker ID proof required" });

    const building = await Building.findOne({ buildingCode });
    if (!building)
      return res
        .status(404)
        .json({ success: false, message: "Building not found" });

    // DD-MM-YYYY → valid Date
    const [day, month, year] = joiningDate.split("-");
    const parsedDate = new Date(`${year}-${month}-${day}`);
    if (isNaN(parsedDate.getTime()))
      return res
        .status(400)
        .json({
          success: false,
          message: "Invalid joiningDate format. Use DD-MM-YYYY",
        });

    // Parallel Cloudinary uploads
    const uploadTasks = [];

    let workerPhotoUrl = null;
    let workerIdProofUrl = null;

    if (req.files?.workerPhoto?.[0]) {
      uploadTasks.push(
        compressAndUpload(
          req.files.workerPhoto[0].buffer,
          "staffPhotos",
          800
        ).then((url) => {
          workerPhotoUrl = url;
        })
      );
    }

    uploadTasks.push(
      compressAndUpload(
        req.files.workerIdProof[0].buffer,
        "staffIds",
        1200
      ).then((url) => {
        workerIdProofUrl = url;
      })
    );

    await Promise.all(uploadTasks);

    const newStaff = await StaffModel.create({
      buildingCode,
      role,
      workerName,
      joiningDate: parsedDate,
      workerPhoneNumber,
      workerAddress: workerAddress || "N/A",
      workerPhoto: workerPhotoUrl,
      workerIdProof: workerIdProofUrl,
    });

const io = req.app.get("io");
await notifyAllMembers({
  io,
  buildingCode,
  buildingId: building._id,
  type: "NEW_STAFF_MEMBER_ADDED",
  title: "New Staff Member 👷",
  message: `${workerName} (${role}) joined the society`,
  referenceId: newStaff._id,
  referenceModel: "Staff",
  data: { staffId: String(newStaff._id) },
});
    return res.status(201).json({
      success: true,
      message: "Staff created successfully",
      staff: newStaff,
    });
  } catch (error) {
    console.error("createStaff Error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message || "Server error" });
  }
};

export default createdStaffMember;
