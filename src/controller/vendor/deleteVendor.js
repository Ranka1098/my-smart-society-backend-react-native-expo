// FILE: deleteVendor.js

import vendorModel from "../../model/Vendor.js";
import mongoose from "mongoose";

export const deleteVendor = async (req, res) => {
  try {
    const { vendorId } = req.body;

    // Check vendorId valid hai ya nahi
    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Vendor ID",
      });
    }

    const deletedVendor = await vendorModel.findByIdAndDelete(vendorId);
    if (!deletedVendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Vendor deleted successfully",
    });
  } catch (error) {
    console.error("Delete Vendor Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
