import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";

// frontend (src/utils/image.js) ke THUMB se exactly same string
export const THUMB = "w_400,c_limit";
export const thumbOf = (url) =>
  url?.includes("/upload/") ? url.replace("/upload/", `/upload/${THUMB}/`) : url;

const uploadToCloudinary = (buffer, folder, options = {}) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image", ...options },
      (err, result) => (err ? reject(err) : resolve(result)),
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });

export default uploadToCloudinary;