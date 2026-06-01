import sharp from "sharp";
import StaffModel from "../../model/staff.js";
import Building from "../../model/building.js";
import uploadToCloudinary from "../../cloudinary/uploadToCloudinary.js";

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

    // VALIDATION
    if (!buildingCode || !adminId) {
      return res
        .status(400)
        .json({ success: false, message: "Building/Admin missing" });
    }

    if (!role || !workerName || !joiningDate || !workerPhoneNumber) {
      return res
        .status(400)
        .json({ success: false, message: "Required fields missing" });
    }

    if (!req.files?.workerIdProof?.[0]) {
      return res
        .status(400)
        .json({ success: false, message: "Worker ID proof required" });
    }

    // BUILDING CHECK
    const building = await Building.findOne({ buildingCode });
    if (!building) {
      return res
        .status(404)
        .json({ success: false, message: "Building not found" });
    }

    // UPLOAD (parallel jab dono files hain)
    let workerPhoto = null;
    let workerIdProof = null;

    try {
      const uploads = [];

      if (req.files?.workerPhoto?.[0]) {
        uploads.push(
          compressAndUpload(
            req.files.workerPhoto[0].buffer,
            "staffPhotos",
            800
          ).then((url) => {
            workerPhoto = url;
          })
        );
      }

      uploads.push(
        compressAndUpload(
          req.files.workerIdProof[0].buffer,
          "staffIds",
          1200
        ).then((url) => {
          workerIdProof = url;
        })
      );

      await Promise.all(uploads);
    } catch (err) {
      console.error("Cloudinary Error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Image upload failed" });
    }

    // CREATE
    const newStaff = await StaffModel.create({
      buildingCode,
      role,
      workerName,
      joiningDate,
      workerPhoneNumber,
      workerAddress: workerAddress || "N/A",
      workerPhoto,
      workerIdProof,
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
