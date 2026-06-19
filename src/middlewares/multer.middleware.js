/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
import multer from "multer";

// @ts-ignore
const storage = multer.memoryStorage({
  // @ts-ignore
  destination: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
  // @ts-ignore
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
}); // Limit file size to 5MB

