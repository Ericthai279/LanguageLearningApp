import express from "express";
import pkg from "pg";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";

const { Pool } = pkg;
const app = express();
app.use(cors());
app.use(express.json());

// PostgreSQL Database Connection
const db = new Pool({
  user: "postgres",  
  host: "localhost",
  database: "postgres", 
  password: "012649", 
  port: 5432,  
});

// Test database connection
db.connect()
  .then(() => console.log("Connected to PostgreSQL database."))
  .catch((err) => console.error("Database connection error:", err.stack));

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("Created uploads directory");
}

// Set up Multer storage configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log(`Saving file: ${file.fieldname} to uploads folder`);
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    console.log(`File details - originalname: ${file.originalname}, mimetype: ${file.mimetype}`);
    // Create a safe filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname) || '.bin';
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  },
});

// Add debugging middleware
app.use((req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    console.log('Request headers:', JSON.stringify(req.headers, null, 2));
    console.log('Content-Type:', req.headers['content-type']);
  }
  next();
});

// Create a Multer upload instance
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    console.log('Processing file:', file);
    // Accept all files - you can add restrictions here if needed
    cb(null, true);
  }
});

// Serve static files from the uploads directory
app.use("/uploads", express.static(uploadsDir));

// Default route
app.get("/", (req, res) => {
  res.json("Welcome to Social Media API");
});

// User routes
app.get("/users", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM users");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json(err);
  }
});

app.post("/users", async (req, res) => {
  const { username, email, password_hash, profile_picture, bio } = req.body;
  const query = "INSERT INTO users (username, email, password_hash, profile_picture, bio) VALUES ($1, $2, $3, $4, $5) RETURNING id";
  
  try {
    const result = await db.query(query, [username, email, password_hash, profile_picture, bio]);
    res.json({ message: "User created successfully!", userId: result.rows[0].id });
  } catch (err) {
    res.status(500).json(err);
  }
});

// Get all posts
app.get("/posts", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM posts");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json(err);
  }
});

// Create a new post with file upload
app.post("/posts", (req, res, next) => {
  console.log("Received POST request to /posts");
  next();
}, upload.single('document'), async (req, res) => {
  console.log("After multer processing");
  console.log("File:", req.file);
  console.log("Body:", req.body);
  
  try {
    // Get file path if a file was uploaded
    const filePath = req.file ? `/uploads/${req.file.filename}` : null;
    
    // Get data from request body
    const { user_id, title, description } = req.body;
    
    if (!user_id) {
      return res.status(400).json({ message: "Missing required field: user_id" });
    }
    
    // Insert post into database
    const query = "INSERT INTO posts (user_id, title, description, media_url) VALUES ($1, $2, $3, $4) RETURNING id";
    const result = await db.query(query, [user_id, title || '', description || '', filePath]);
    
    res.json({
      message: "Post created successfully!",
      postId: result.rows[0].id,
      filePath: filePath,
      fileDetails: req.file ? {
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      } : null
    });
  } catch (err) {
    console.error("Error creating post:", err);
    res.status(500).json({ message: `Server error: ${err.message}` });
  }
});

// Update a post with optional file upload
app.put("/posts/:id", upload.single('document'), async (req, res) => {
  const postId = req.params.id;
  console.log(`Updating post ${postId}`);
  console.log("File:", req.file);
  console.log("Body:", req.body);
  
  try {
    const { title, description } = req.body;
    
    // Check if we need to update the file path
    let filePath = null;
    if (req.file) {
      filePath = `/uploads/${req.file.filename}`;
    }
    
    // Construct the query based on whether a new file was uploaded
    let query;
    let queryParams;
    
    if (filePath) {
      query = "UPDATE posts SET title = $1, description = $2, media_url = $3 WHERE id = $4 RETURNING *";
      queryParams = [title, description, filePath, postId];
    } else {
      query = "UPDATE posts SET title = $1, description = $2 WHERE id = $3 RETURNING *";
      queryParams = [title, description, postId];
    }
    
    const result = await db.query(query, queryParams);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Post not found" });
    }
    
    res.json({ 
      message: "Post updated successfully!", 
      post: result.rows[0],
      fileUpdated: !!req.file
    });
  } catch (err) {
    console.error("Error updating post:", err);
    res.status(500).json({ message: `Server error: ${err.message}` });
  }
});

// Delete a post
app.delete("/posts/:id", async (req, res) => {
  const postId = req.params.id;
  const query = "DELETE FROM posts WHERE id = $1";
  
  try {
    await db.query(query, [postId]);
    res.json({ message: "Post deleted successfully!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Comment routes
app.get("/comments/:postId", async (req, res) => {
  const postId = req.params.postId;
  const query = "SELECT * FROM comments WHERE post_id = $1";
  
  try {
    const result = await db.query(query, [postId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/comments", async (req, res) => {
  const { post_id, user_id, comment_text } = req.body;
  const query = "INSERT INTO comments (post_id, user_id, comment_text) VALUES ($1, $2, $3) RETURNING id";
  
  try {
    const result = await db.query(query, [post_id, user_id, comment_text]);
    res.json({ message: "Comment added successfully!", commentId: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Test upload endpoint
app.post("/upload", upload.single('document'), (req, res) => {
  console.log("Upload endpoint hit");
  console.log("File:", req.file);
  console.log("Body:", req.body);
  
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded." });
  }
  
  res.json({
    message: "File uploaded successfully!",
    fileInfo: req.file
  });
});

// Error handler middleware
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error("Multer error:", err);
    return res.status(400).json({ 
      error: true, 
      code: err.code,
      field: err.field,
      message: `Upload error: ${err.message}`
    });
  } else if (err) {
    console.error("Server error:", err);
    return res.status(500).json({ 
      error: true, 
      message: err.message
    });
  }
  next();
});

// Start server
const PORT = process.env.PORT || 3300;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}.`);
  console.log(`Uploads directory: ${uploadsDir}`);
});