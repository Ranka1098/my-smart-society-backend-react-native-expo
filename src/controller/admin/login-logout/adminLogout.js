
const adminLogout = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.log("Logout Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export default adminLogout;
