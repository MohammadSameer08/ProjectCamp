# ProjectCamp - Interview Preparation Guide

## 📋 Project Overview
**ProjectCamp** is a **Node.js + Express + MongoDB** backend application with user authentication, email verification, and password reset functionality.

---

## 🛠️ Tech Stack

| Technology | Purpose |
|-----------|---------|
| **Node.js** | Runtime environment |
| **Express.js** | Web framework |
| **MongoDB** | Database |
| **Mongoose** | ODM (Object Data Modeling) |
| **JWT** | Authentication |
| **Bcrypt** | Password hashing |
| **Nodemailer** | Email sending |

---

## 📁 Project Structure

```
ProjectCamp/
├── src/
│   ├── app.js                 # Express app setup
│   ├── index.js               # Server entry point
│   ├── controllers/           # Business logic
│   ├── models/                # Database schemas
│   ├── routes/                # API endpoints
│   ├── middlewares/           # Custom middleware
│   ├── validators/            # Input validation
│   └── utils/                 # Helper functions
└── package.json               # Dependencies
```

---

## 🔑 Key Features

### 1. **User Registration**

```javascript
// POST /api/v1/auth/register
// Code: src/controllers/auth.controller.js:32-79

export const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(409, "Email already in use");
  }

  // Create new user (password auto-hashed by pre-save hook)
  const user = await User.create({
    email,
    password,
    username,
    isEmailVerified: false,
  });

  // Generate verification token
  const { unHashedToken, hashedToken, tokenExpiry } = 
    user.generateTemporaryToken();
  
  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpiry = tokenExpiry;
  await user.save({ validateBeforeSave: false });

  // Send verification email
  await sendEmail({
    email: user.email,
    subject: "Email Verification",
    mailgenContent: emailVerificationMailGenContent(
      user.username,
      `${req.protocol}://${req.get("host")}/api/v1/users/verify-email/${unHashedToken}`
    ),
  });

  return res.status(201).json(
    new ApiResponse(200, { user: createdUser }, 
      "User Created successfully and verification email has been sent")
  );
});
```

**Flow:**
1. ✅ Validate input (using express-validator)
2. ✅ Check if email exists
3. ✅ Create user (password auto-hashed)
4. ✅ Generate verification token
5. ✅ Send verification email
6. ✅ Return response

---

### 2. **User Login**

```javascript
// POST /api/v1/auth/login
// Code: src/controllers/auth.controller.js:87-120

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user by email
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Compare password (bcrypt.compare)
  const isPasswordCorrect = await user.isPasswordCorrect(password);
  if (!isPasswordCorrect) {
    throw new ApiError(401, "Invalid credentials");
  }

  // Generate tokens
  const { accessToken, refreshToken } = 
    await generateAccessAndRefreshTokens(user._id);

  // Set secure cookies
  const options = { httpOnly: true, secure: true };
  
  return res
    .status(200)
    .cookie("refreshToken", refreshToken, options)
    .cookie("accessToken", accessToken, options)
    .json(new ApiResponse(200, 
      { user, accessToken, refreshToken }, 
      "Logged in successfully"
    ));
});
```

**Security Points:**
- ✅ Passwords compared using `bcrypt.compare()` (never plain text)
- ✅ Tokens set as HttpOnly cookies (prevents XSS)
- ✅ Secure flag enables HTTPS only
- ✅ Tokens expire (1 day access, 10 days refresh)

---

### 3. **JWT Authentication & Middleware**

```javascript
// Middleware: src/middlewares/auth.middleware.js

export const verifyJWT = asyncHandler(async (req, res, next) => {
  // Get token from cookie or Authorization header
  const token = 
    req.cookies?.accessToken || 
    req.headers?.authorization?.split(" ")[1];

  if (!token) {
    throw new ApiError(401, "Unauthorized: No token provided");
  }

  // Verify token using secret
  const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  
  // Get user from database
  const user = await User.findById(decodedToken._id).select(
    "-password -refreshToken -forgotPasswordToken -emailVerificationToken"
  );

  if (!user) {
    throw new ApiError(401, "Unauthorized: User not found");
  }

  // Attach user to request object
  req.user = user;
  next();
});

// Usage in routes:
router.route("/getCurrentUser").get(verifyJWT, getCurrentUser);
```

**How it works:**
1. Client sends request with JWT in header/cookie
2. Middleware extracts token
3. Verifies token signature (using secret key)
4. Decodes token to get user ID
5. Fetches user from DB
6. Attaches to `req.user`
7. Controller accesses `req.user` for current user

---

### 4. **Email Verification**

```javascript
// GET /api/v1/auth/verify-email/:verificationToken
// Code: src/controllers/auth.controller.js:155-185

export const verifyEmail = asyncHandler(async (req, res) => {
  const { verificationToken } = req.params;

  // Hash the token from URL (same way it was hashed during registration)
  let hashedToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  // Find user with matching hashed token and valid expiry
  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpiry: { $gt: Date.now() }, // Not expired
  });

  if (!user) {
    throw new ApiError(400, "Invalid or expired verification token");
  }

  // Mark email as verified
  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpiry = undefined;
  await user.save({ validateBeforeSave: false });

  return res.status(200).json(
    new ApiResponse(200, { user },
      "Email verified successfully. You can now log in."
    )
  );
});
```

**Security Flow:**
1. User gets email with link: `/verify-email/abc123xyz`
2. `abc123xyz` is sent (unhashed)
3. Server hashes it again
4. Compares with DB (both hashed)
5. If match + not expired → Email verified ✅

---

### 5. **Password Reset**

```javascript
// POST /api/v1/auth/forgot-password
// Code: src/controllers/auth.controller.js:311-340

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Generate temporary password reset token
  const { unHashedToken, hashedToken, tokenExpiry } = 
    user.generateTemporaryToken();

  user.forgotPasswordToken = hashedToken;
  user.forgotPasswordExpiry = tokenExpiry;
  await user.save({ validateBeforeSave: false });

  // Send reset email with unhashed token
  await sendEmail({
    email: user.email,
    subject: "Password Reset",
    mailgenContent: forgotPasswordMailGenContent(
      user.username,
      `${req.protocol}://${req.get("host")}/api/v1/users/reset-password/${unHashedToken}`
    ),
  });

  return res.status(200).json(
    new ApiResponse(200, {},
      "Password reset email sent successfully"
    )
  );
});
```

---

### 6. **Refresh Token**

```javascript
// POST /api/v1/auth/refresh-token
// Code: src/controllers/auth.controller.js:226-260

export const refreshAccessToken = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  
  if (!refreshToken) {
    throw new ApiError(400, "Refresh token is required");
  }

  // Verify refresh token
  const decodedToken = jwt.verify(
    refreshToken,
    process.env.REFRESH_TOKEN_SECRET
  );

  const user = await User.findById(decodedToken._id);
  if (!user) {
    throw new ApiError(401, "Unauthorized");
  }

  // Generate new access token
  const { accessToken, refreshToken: newRefreshToken } = 
    await generateAccessAndRefreshTokens(user._id);

  const options = { httpOnly: true, secure: true };

  return res
    .status(200)
    .cookie("refreshToken", newRefreshToken, options)
    .cookie("accessToken", accessToken, options)
    .json(new ApiResponse(200,
      { accessToken, refreshToken: newRefreshToken },
      "Access token refreshed successfully"
    ));
});
```

**Timeline Example:**
```
Day 1: Login
  → Access Token (1 day validity) ✅
  → Refresh Token (10 days validity) ✅

Day 2: Access Token Expired
  → Send refresh token to /refresh-token
  → Get new access token ✅
  → Can use API again ✅

Day 11: Both tokens expired
  → Must login again ❌
```

---

## 🔐 Password Hashing

```javascript
// Automatic hashing in user.models.js
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  
  // Hash password with bcrypt (10 rounds)
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare during login
userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};
```

**Why hashing?**
- ✅ If DB hacked → Attacker can't read plain passwords
- ✅ Bcrypt is one-way (can't be reversed)
- ✅ Salting prevents rainbow table attacks
- ✅ Industry standard (OWASP recommended)

---

## 🧪 Input Validation

```javascript
// src/validators/index.js

export const registerValidation = () => {
  return [
    body("email")
      .trim()
      .notEmpty()
      .isEmail()
      .withMessage("Invalid email address"),
    body("password")
      .isLength({ min: 3 })
      .withMessage("Password must be at least 3 characters long"),
    body("username")
      .trim()
      .notEmpty()
      .isLength({ min: 3 })
      .withMessage("Username must be at least 3 characters long"),
  ];
};

// Used in routes:
router.route("/register")
  .post(registerValidation(), validate, registerUser);
```

---

## 📧 Email Configuration

```javascript
// .env file settings
MAILTRAP_SMTP_HOST=sandbox.smtp.mailtrap.io
MAILTRAP_SMTP_PORT=2525
MAILTRAP_SMTP_USER=your_user
MAILTRAP_SMTP_PASS=your_pass
```

**Usage:**
```javascript
await sendEmail({
  email: user.email,
  subject: "Email Verification",
  mailgenContent: emailVerificationMailGenContent(
    user.username,
    verificationLink
  ),
});
```

---

## 🚀 API Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/register` | ❌ | Create new user |
| POST | `/login` | ❌ | User login |
| POST | `/logout` | ✅ | User logout |
| GET | `/getCurrentUser` | ✅ | Get current user info |
| POST | `/refresh-token` | ❌ | Refresh access token |
| GET | `/verify-email/:token` | ❌ | Verify email |
| POST | `/resend-verification-email` | ✅ | Resend verification |
| POST | `/forgot-password` | ❌ | Request password reset |
| POST | `/reset-password/:token` | ❌ | Reset password |

---

## 📊 Database Schema (User Model)

```javascript
{
  username: String,           // Unique, lowercase
  email: String,              // Unique, lowercase
  password: String,           // Hashed
  fullName: String,
  isEmailVerified: Boolean,   // Default: false
  refreshToken: String,       // Stored in DB for security
  
  // Email verification
  emailVerificationToken: String,
  emailVerificationExpiry: Date,
  
  // Password reset
  forgotPasswordToken: String,
  forgotPasswordExpiry: Date,
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date,
}
```

---

## ⚡ Key Concepts

### **Access Token vs Refresh Token**

| Aspect | Access Token | Refresh Token |
|--------|--------------|---------------|
| **Lifetime** | 1 day | 10 days |
| **Use** | Every API request | Get new access token |
| **Security** | High (short-lived) | Lower (long-lived) |
| **Storage** | HttpOnly cookie | HttpOnly cookie |

### **Hashing vs Encryption**

| Property | Hashing | Encryption |
|----------|---------|-----------|
| **Reversible?** | ❌ No | ✅ Yes |
| **Speed** | ⚡ Fast | 🐢 Slow |
| **Use Case** | Passwords, tokens | Sensitive data |

### **HttpOnly Cookies**

```javascript
const options = {
  httpOnly: true,   // ✅ Can't access via JavaScript (prevents XSS)
  secure: true,     // ✅ Only sent over HTTPS
  sameSite: "strict" // ✅ Prevents CSRF
};

res.cookie("accessToken", token, options);
```

---

## 🎯 Interview Questions & Answers

### **Q1: How do you authenticate users in your project?**
**Answer:**
- We use JWT (JSON Web Tokens) for authentication
- User logs in with email/password
- Server verifies password using bcrypt.compare()
- If valid, generates Access Token (1 day) and Refresh Token (10 days)
- Both stored as HttpOnly secure cookies
- Every API request includes Access Token
- Middleware `verifyJWT` validates the token and attaches user to request

### **Q2: What's the difference between Access Token and Refresh Token?**
**Answer:**
- **Access Token**: Short-lived (1 day), used for every API request for security
- **Refresh Token**: Long-lived (10 days), stored in DB, used only to get new access token when it expires
- If access token is stolen, attacker has limited time (1 day)
- If refresh token is stolen, it can be revoked from DB

### **Q3: How is password stored securely?**
**Answer:**
- Passwords are NEVER stored as plain text
- Before saving user, Mongoose pre-save hook hashes password using bcrypt with 10 rounds
- During login, we use bcrypt.compare() to compare entered password with stored hash
- Bcrypt is one-way (can't be reversed), so even if DB is hacked, passwords are safe

### **Q4: How does email verification work?**
**Answer:**
1. User registers → generates temporary token (random 20 bytes)
2. Token is hashed using SHA256
3. Hashed token stored in DB, unhashed sent via email link
4. User clicks link with unhashed token
5. Server hashes the token again
6. Compares with DB (both hashed)
7. If match + not expired → Email verified
8. Token expires in 20 minutes

### **Q5: What happens when access token expires?**
**Answer:**
- User tries to access protected route
- Middleware rejects the expired access token
- Client catches error and calls `/refresh-token` endpoint with refresh token
- Server verifies refresh token (still valid)
- Generates new access token
- Client retries original request with new token

### **Q6: What's the async-handler middleware?**
**Answer:**
- Wrapper function to handle async/await errors automatically
- Catches errors thrown in async functions
- Passes them to global error handler
- Prevents "unhandled promise rejection" errors

### **Q7: How do you validate user input?**
**Answer:**
- Use `express-validator` library
- Define validation rules in `validators/index.js`
- Apply validation middleware before controller
- Example: check email format, password length, username required
- If validation fails, return 422 error with details

### **Q8: What's CORS and how is it configured?**
**Answer:**
- CORS (Cross-Origin Resource Sharing) allows requests from different domains
- In `.env`: `CORS_ORIGIN=*` (allows all origins)
- Can restrict to specific domains: `CORS_ORIGIN=https://frontend.com`
- Prevents unauthorized cross-origin requests

---

## 💡 Key Learnings

1. **Never store plain passwords** - Always hash with bcrypt
2. **Use HttpOnly cookies** - Prevents XSS attacks
3. **Token expiration** - Access token short-lived, refresh token long-lived
4. **Input validation** - Always validate before processing
5. **Error handling** - Use try-catch or async wrappers
6. **Email verification** - Hash tokens before storing in DB
7. **Security headers** - Use CORS, HTTPS, secure cookies

---


## Project Route APIs Guide



### **Base URL:** `/api/v1/projects` (or wherever your API is mounted)
### **Authentication:** ✅ All routes require JWT token (Bearer token or cookie)

---

## **1. Get All Projects**
```http
GET /api/v1/projects
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response:**
```json
{
  "statusCode": 200,
  "data": [
    {
      "project": {
        "_id": "507f1f77bcf86cd799439011",
        "name": "My Project",
        "description": "Project description",
        "members": 5,
        "createdAt": "2024-01-01T10:00:00Z",
        "updatedAt": "2024-01-01T10:00:00Z"
      },
      "role": "ADMIN"
    }
  ],
  "message": "Projects fetched successfully"
}
```

---

## **2. Create Project**
```http
POST /api/v1/projects
```

**Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Body:**
```json
{
  "name": "My New Project",
  "description": "Project description"
}
```

**Response:**
```json
{
  "statusCode": 201,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "My New Project",
    "description": "Project description",
    "createdAt": "2024-01-01T10:00:00Z"
  },
  "message": "Project created successfully"
}
```

---

## **3. Get Project by ID**
```http
GET /api/v1/projects/:projectId
```

**Parameters:**
- `projectId` (required) - Project MongoDB ID

**Headers:**
```
Authorization: Bearer <accessToken>
```

---

## **4. Update Project** (Admin only)
```http
PUT /api/v1/projects/:projectId
```

**Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Updated Project Name",
  "description": "Updated description"
}
```

---

## **5. Delete Project** (Admin only)
```http
DELETE /api/v1/projects/:projectId
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

---

## **6. Get Project Members**
```http
GET /api/v1/projects/:projectId/members
```

**Response:**
```json
{
  "statusCode": 200,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "userId": "507f1f77bcf86cd799439013",
      "role": "ADMIN",
      "createdAt": "2024-01-01T10:00:00Z"
    }
  ],
  "message": "Project members fetched successfully"
}
```

---

## **7. Add Member to Project** (Admin only)
```http
POST /api/v1/projects/:projectId/members
```

**Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Body:**
```json
{
  "userId": "507f1f77bcf86cd799439013",
  "role": "MEMBER"
}
```

---

## **8. Update Member Role** (Admin only)
```http
PUT /api/v1/projects/:projectId/members/:userId
```

**Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Body:**
```json
{
  "role": "ADMIN"
}
```

---

## **9. Delete Member from Project** (Admin only)
```http
DELETE /api/v1/projects/:projectId/members/:userId
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

---

## **Using with cURL/Postman**

### **Example: Create a project**
```bash
curl -X POST http://localhost:3000/api/v1/projects \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Project",
    "description": "My first project"
  }'
```

### **Example: Get all projects**
```bash
curl -X GET http://localhost:3000/api/v1/projects \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR..."
```

---

## **Permission Levels**

| Action | Owner/Admin | Member | Viewer |
|--------|-------------|--------|--------|
| View Project | ✅ | ✅ | ✅ |
| Update Project | ✅ | ❌ | ❌ |
| Delete Project | ✅ | ❌ | ❌ |
| Add Members | ✅ | ❌ | ❌ |
| Update Member Role | ✅ | ❌ | ❌ |
| Remove Members | ✅ | ❌ | ❌ |

## 🔧 Running the Project

```bash
# Install dependencies
npm install

# Start development server (with nodemon)
npm run dev

# Start production server
npm start
```

**Default Port:** 8000 (from .env)

---