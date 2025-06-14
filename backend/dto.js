import { body } from "express-validator";

// ✅ DTO for Creating a User
export const createUserDTO = [
  body("username").isString().trim().notEmpty().withMessage("Username is required"),
  body("email").isEmail().withMessage("Invalid email format"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  body("profile_picture").optional().isURL().withMessage("Invalid URL format"),
  body("bio").optional().isString().trim(),
];

// ✅ DTO for Patching (Updating) a User
export const updateUserDTO = [
  body("username").optional().isString().trim(),
  body("email").optional().isEmail().withMessage("Invalid email format"),
  body("password").optional().isLength({ min: 6 }),
  body("profile_picture").optional().isURL(),
  body("bio").optional().isString().trim(),
];
