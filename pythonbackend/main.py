from fastapi import FastAPI, HTTPException, Depends, File, UploadFile, Form, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any, Union
import os
import nltk
import torch
import numpy as np
import soundfile as sf
import shutil
import uuid
import whisper
import tempfile
from pathlib import Path
from transformers import VitsModel, AutoTokenizer, AutoModelForSeq2SeqLM
from langdetect import detect
from sqlalchemy import create_engine, Column, Integer, String, DateTime, ForeignKey, CheckConstraint, Boolean, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship, Session
from datetime import datetime, timedelta
import language_tool_python
import bcrypt
import jwt
from passlib.context import CryptContext
import logging
from PyPDF2 import PdfReader
from docx import Document
import io
# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Download NLTK data
nltk.download('punkt', quiet=True)

# Initialize FastAPI
app = FastAPI(title="Social Media and Chatbot API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database setup
DATABASE_URL = "postgresql://postgres:012649@localhost:5432/postgres"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# JWT Settings
SECRET_KEY = "your-secret-key-change-in-production"  # Change this in production!
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 1 week

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Create uploads directory
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Initialize Whisper model (use 'turbo' for faster processing)
whisper_model = None

# Database models
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    profile_picture = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    posts = relationship("Post", back_populates="user", cascade="all, delete")
    comments = relationship("Comment", back_populates="user", cascade="all, delete")
    messages = relationship("ChatMessage", back_populates="user", cascade="all, delete")

class Post(Base):
    __tablename__ = "posts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    media_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="posts")
    comments = relationship("Comment", back_populates="post", cascade="all, delete")

class Comment(Base):
    __tablename__ = "comments"
    
    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    comment_text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    post = relationship("Post", back_populates="comments")
    user = relationship("User", back_populates="comments")

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    user_input = Column(String, nullable=False)
    action = Column(String, nullable=False)
    response = Column(String, nullable=False)
    audio_path = Column(String, nullable=True)
    detected_language = Column(String, nullable=True)  # Added for STT language detection
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Constraints - Updated to include 'stt'
    __table_args__ = (
        CheckConstraint("action IN ('translate', 'tts', 'grammar', 'stt')", name="check_action"),
    )
    
    # Relationships
    user = relationship("User", back_populates="messages")

# Create tables
Base.metadata.create_all(bind=engine)

# Initialize models
translation_model = None
translation_tokenizer = None
tts_models = {}
tts_tokenizers = {}
tool_en = None

# Pydantic models for request/response
class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    username: str

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    profile_picture: Optional[str] = None
    bio: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    profile_picture: Optional[str] = None
    bio: Optional[str] = None
    created_at: datetime
    
    class Config:
        orm_mode = True

class PostCreate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None

class PostResponse(BaseModel):
    id: int
    user_id: int
    title: Optional[str] = None
    description: Optional[str] = None
    media_url: Optional[str] = None
    created_at: datetime
    
    class Config:
        orm_mode = True

class CommentCreate(BaseModel):
    post_id: int
    user_id: int
    comment_text: str

class CommentResponse(BaseModel):
    id: int
    post_id: int
    user_id: int
    comment_text: str
    created_at: datetime
    
    class Config:
        orm_mode = True

class ChatInput(BaseModel):
    user_id: int
    text: str
    action: str  # 'translate', 'tts', 'grammar', 'stt'

class ChatResponse(BaseModel):
    id: int
    user_id: int
    user_input: str
    action: str
    response: str
    audio_path: Optional[str] = None
    detected_language: Optional[str] = None  # Added for STT
    created_at: datetime
    
    class Config:
        orm_mode = True

# Dependency to get the database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()

def get_user_by_id(db: Session, user_id: int):
    return db.query(User).filter(User.id == user_id).first()

def load_whisper_model():
    """Load the Whisper model for speech-to-text"""
    global whisper_model
    if whisper_model is None:
        logger.info("Loading Whisper model...")
        try:
            
            whisper_model = whisper.load_model("tiny")
            logger.info("Whisper model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load Whisper model: {str(e)}")
            raise e
    return whisper_model

def validate_audio_duration(audio_path: str, max_duration: int = 60) -> bool:
    """Validate that audio file is not longer than max_duration seconds"""
    try:
        import librosa
        # Get audio duration without loading the entire file
        duration = librosa.get_duration(path=audio_path)
        return duration <= max_duration
    except:
        # Fallback method using soundfile
        try:
            data, sample_rate = sf.read(audio_path)
            duration = len(data) / sample_rate
            return duration <= max_duration
        except Exception as e:
            logger.error(f"Error validating audio duration: {str(e)}")
            return False

def transcribe_audio(audio_path: str) -> Dict[str, str]:
    """
    Transcribe audio file using Whisper model
    Returns: dict with 'text' and 'detected_language'
    """
    try:
        model = load_whisper_model()
        
        # Validate audio duration (max 1 minute)
        if not validate_audio_duration(audio_path, max_duration=60):
            raise ValueError("Audio file must be 1 minute or shorter")
        
        logger.info(f"Transcribing audio file: {audio_path}")
        
        # Load and preprocess audio
        audio = whisper.load_audio(audio_path)
        audio = whisper.pad_or_trim(audio)
        
        # Create log-Mel spectrogram
        mel = whisper.log_mel_spectrogram(audio, n_mels=model.dims.n_mels).to(model.device)
        
        # Detect language
        _, probs = model.detect_language(mel)
        detected_language = max(probs, key=probs.get)
        
        logger.info(f"Detected language: {detected_language}")
        
        # Transcribe the audio
        options = whisper.DecodingOptions(
            language=detected_language,
            fp16=False  # Set to False for better compatibility
        )
        result = whisper.decode(model, mel, options)
        
        transcribed_text = result.text.strip()
        
        logger.info(f"Transcription completed: {transcribed_text[:100]}...")
        
        return {
            'text': transcribed_text,
            'detected_language': detected_language
        }
        
    except Exception as e:
        logger.error(f"Error during transcription: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

def load_translation_model():
    global translation_model, translation_tokenizer
    if translation_model is None:
        logger.info("Loading translation model...")
        model_name = "VietAI/envit5-translation"
        translation_tokenizer = AutoTokenizer.from_pretrained(model_name)
        translation_model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
        logger.info("Translation model loaded.")

def load_tts_model(lang):
    global tts_models, tts_tokenizers
    if lang not in tts_models:
        logger.info(f"Loading TTS model for {lang}...")
        model_name = "facebook/mms-tts-vie" if lang == 'vie' else "facebook/mms-tts-eng"
        tts_models[lang] = VitsModel.from_pretrained(model_name)
        tts_tokenizers[lang] = AutoTokenizer.from_pretrained(model_name)
        logger.info(f"TTS model for {lang} loaded.")
    return tts_models[lang], tts_tokenizers[lang]

def load_grammar_tool(lang):
    global tool_en
    if lang == 'eng' and tool_en is None:
        logger.info("Loading grammar tool...")
        tool_en = language_tool_python.LanguageTool('en-US')
        logger.info("Grammar tool loaded.")
    return tool_en if lang == 'eng' else None

#detech language
def detect_language(text):
    try:
        lang = detect(text)
        if lang == 'vi':
            return 'vie'
        elif lang == 'en':
            return 'eng'
        raise ValueError("Only Vietnamese and English are supported.")
    except Exception:
        # Default to English if detection fails
        return 'eng'

#translate
def translate_text(text, source_lang="eng", target_lang="vie"):
    load_translation_model()
    prefix = f"{source_lang}:"
    input_text = f"{prefix} {text}"
    inputs = translation_tokenizer(input_text, return_tensors="pt", padding=True, truncation=True, max_length=512).input_ids
    outputs = translation_model.generate(inputs, max_length=512)
    translated = translation_tokenizer.batch_decode(outputs, skip_special_tokens=True)[0]
    return translated

#generate and save audio
def generate_and_save_audio(text, lang, output_dir=UPLOAD_DIR):
    model, tokenizer = load_tts_model(lang)
    inputs = tokenizer(text, return_tensors="pt")
    output_filename = f"audio_{uuid.uuid4()}.wav"
    output_path = output_dir / output_filename
    
    with torch.no_grad():
        output = model(**inputs).waveform
    
    output = output.squeeze(0).detach().cpu().numpy()
    output = np.clip(output, -1, 1)
    output = (output * 32767).astype(np.int16)
    rate = int(model.config.sampling_rate)
    sf.write(str(output_path), output, rate, format="WAV", subtype="PCM_16")
    
    return f"/uploads/{output_filename}"  # Return path relative to server

def check_grammar(text, lang):
    if lang == 'vie':
        return "Grammar checking for Vietnamese is not supported."
    
    tool = load_grammar_tool(lang)
    if not tool:
        return "Grammar checking not available for this language."
    
    matches = tool.check(text)
    corrections = [f"Error: {m.context}\nMessage: {m.message}\nSuggestions: {', '.join(m.replacements[:3])}" for m in matches]
    return "\n\n".join(corrections) if corrections else "No grammar issues found."

# Authentication dependency
def get_token(request: Request):
    return request.headers.get("Authorization")

def get_current_user(db: Session = Depends(get_db), authorization: str = Depends(get_token)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    token = authorization.split("Bearer ")[1]
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    user = get_user_by_id(db, int(user_id))
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user

# Simplified authentication for chatbot (accepts user_id directly)
def get_chatbot_user(user_id: int, db: Session = Depends(get_db)):
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# Mount static files directory for uploads
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Root endpoint
@app.get("/")
def read_root():
    return {"message": "Welcome to Social Media and Chatbot API"}

# Authentication endpoints
@app.post("/auth/register", response_model=UserResponse)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    # Check if email already exists
    db_user = get_user_by_email(db, user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if username exists
    if db.query(User).filter(User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Create new user
    hashed_password = get_password_hash(user.password)
    db_user = User(
        username=user.username,
        email=user.email,
        password_hash=hashed_password,
        profile_picture=user.profile_picture,
        bio=user.bio
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user

@app.post("/auth/login", response_model=Token)
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    user = get_user_by_email(db, user_data.email)
    if not user or not verify_password(user_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, 
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.id,
        "username": user.username
    }

@app.post("/auth/refresh", response_model=Token)
def refresh_token(db: Session = Depends(get_db), authorization: str = Depends(get_token)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    token = authorization.split("Bearer ")[1]
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], options={"verify_exp": False})
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        
        user = get_user_by_id(db, int(user_id))
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        new_token = create_access_token(
            data={"sub": str(user.id)},
            expires_delta=access_token_expires
        )
        
        return {
            "access_token": new_token,
            "token_type": "bearer",
            "user_id": user.id,
            "username": user.username
        }
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
# User endpoints
@app.get("/users", response_model=List[UserResponse])
def get_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return users

@app.get("/users/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = get_user_by_id(db, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user
@app.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    bio: Optional[str] = Form(''),
    document: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    logger.info(f"Received update_user request for user_id={user_id}, bio={bio}, document={document.filename if document else None}")
    user = get_user_by_id(db, user_id)
    if not user:
        logger.error(f"User not found: user_id={user_id}")
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.id != current_user.id:
        logger.error(f"Unauthorized update attempt: user_id={user_id}, current_user_id={current_user.id}")
        raise HTTPException(status_code=403, detail="Not authorized to update this user")
    
    profile_picture = user.profile_picture
    if document:
        file_extension = os.path.splitext(document.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = UPLOAD_DIR / unique_filename
        
        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(document.file, buffer)
            
            if user.profile_picture:
                old_file_path = UPLOAD_DIR / os.path.basename(user.profile_picture)
                if os.path.exists(old_file_path):
                    os.remove(old_file_path)
            
            profile_picture = f"/uploads/{unique_filename}"
        except Exception as e:
            logger.error(f"File upload error: {str(e)}")
            raise HTTPException(status_code=500, detail="Error uploading file")
        finally:
            document.file.close()
    
    user.bio = bio
    if profile_picture:
        user.profile_picture = profile_picture
    
    db.commit()
    db.refresh(user)
    
    logger.info(f"User updated successfully: user_id={user_id}, bio={bio}")
    return user


# Post endpoints
@app.get("/posts", response_model=List[PostResponse])
def get_posts(db: Session = Depends(get_db)):
    posts = db.query(Post).all()
    return posts

@app.get("/posts/{post_id}", response_model=PostResponse)
def get_post(post_id: int, db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post
@app.post("/posts", response_model=PostResponse)
async def create_post(
    user_id: int = Form(...),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    document: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    # Verify user exists
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Handle file upload
    media_url = None
    if document:
        # Generate unique filename
        file_extension = os.path.splitext(document.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = UPLOAD_DIR / unique_filename
        
        # Save the file
        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(document.file, buffer)
            media_url = f"/uploads/{unique_filename}"
        except Exception as e:
            logger.error(f"File upload error: {str(e)}")
            raise HTTPException(status_code=500, detail="Error uploading file")
        finally:
            document.file.close()
    
    # Create post
    post = Post(
        user_id=user_id,
        title=title or "",
        description=description or "",
        media_url=media_url
    )
    
    db.add(post)
    db.commit()
    db.refresh(post)
    
    return post

@app.put("/posts/{post_id}", response_model=PostResponse)
async def update_post(
    post_id: int,
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    document: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    # Get post
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Handle file upload
    if document:
        # Generate unique filename
        file_extension = os.path.splitext(document.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = UPLOAD_DIR / unique_filename
        
        # Save the file
        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(document.file, buffer)
            
            # Delete old file if it exists
            if post.media_url:
                old_file_path = UPLOAD_DIR / os.path.basename(post.media_url)
                if os.path.exists(old_file_path):
                    os.remove(old_file_path)
            
            post.media_url = f"/uploads/{unique_filename}"
        except Exception as e:
            logger.error(f"File upload error: {str(e)}")
            raise HTTPException(status_code=500, detail="Error uploading file")
        finally:
            document.file.close()
    
    # Update post
    if title is not None:
        post.title = title
    if description is not None:
        post.description = description
    
    db.commit()
    db.refresh(post)
    
    return post

@app.delete("/posts/{post_id}")
def delete_post(post_id: int, db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Delete media file if it exists
    if post.media_url:
        file_path = UPLOAD_DIR / os.path.basename(post.media_url)
        if os.path.exists(file_path):
            os.remove(file_path)
    
    db.delete(post)
    db.commit()
    
    return {"message": "Post deleted successfully"}

# Comment endpoints
@app.get("/comments/{post_id}", response_model=List[CommentResponse])
def get_comments(post_id: int, db: Session = Depends(get_db)):
    comments = db.query(Comment).filter(Comment.post_id == post_id).all()
    return comments

@app.post("/comments", response_model=CommentResponse)
def create_comment(comment: CommentCreate, db: Session = Depends(get_db)):
    # Verify post exists
    post = db.query(Post).filter(Post.id == comment.post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Verify user exists
    user = get_user_by_id(db, comment.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Create comment
    db_comment = Comment(
        post_id=comment.post_id,
        user_id=comment.user_id,
        comment_text=comment.comment_text
    )
    
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    
    return db_comment

# Speech-to-Text endpoint
@app.post("/speech-to-text", response_model=ChatResponse)
async def speech_to_text(
    user_id: int = Form(...),
    audio_file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    try:
        # Verify user exists
        user = get_user_by_id(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Validate file type
        if not audio_file.content_type or not audio_file.content_type.startswith('audio/'):
            raise HTTPException(status_code=422, detail="File must be an audio file")
        
        # Create temporary file for processing
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
            # Copy uploaded file to temporary location
            shutil.copyfileobj(audio_file.file, temp_file)
            temp_path = temp_file.name
        
        try:
            # Transcribe the audio
            transcription_result = transcribe_audio(temp_path)
            transcribed_text = transcription_result['text']
            detected_language = transcription_result['detected_language']
            
            if not transcribed_text.strip():
                raise HTTPException(status_code=422, detail="No speech detected in audio file")
            
            # Save to database
            chat_message = ChatMessage(
                user_id=user_id,
                user_input="[Audio file uploaded]",
                action="stt",
                response=transcribed_text,
                detected_language=detected_language,
                audio_path=None  # We don't save the input audio, only transcription
            )
            
            db.add(chat_message)
            db.commit()
            db.refresh(chat_message)
            
            logger.info(f"STT completed for user {user_id}: '{transcribed_text[:50]}...'")
            
            return chat_message
            
        finally:
            # Clean up temporary file
            try:
                os.unlink(temp_path)
            except Exception as e:
                logger.warning(f"Failed to delete temporary file {temp_path}: {str(e)}")
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"STT processing error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Speech-to-text processing failed: {str(e)}")
    finally:
        audio_file.file.close()

# Chatbot endpoints
@app.post("/chat", response_model=ChatResponse)
async def process_chat(input: ChatInput, db: Session = Depends(get_db)):
    try:
        user_id = input.user_id
        text = input.text.strip()
        action = input.action.lower()
        logger.info(f"Processing chat: user_id={user_id}, text='{text}', action={action}")
        if not text:
            raise HTTPException(status_code=400, detail="Text is required.")
        if action not in ['translate', 'tts', 'grammar', 'stt']:
            raise HTTPException(status_code=400, detail="Invalid action.")

        # Verify user exists
        user = get_user_by_id(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")

        # Process chat based on action
        lang = detect_language(text)
        logger.info(f"Detected language: {lang}")
        response = ""
        audio_path = None
        detected_language = None

        if action == "translate":
            source_lang = 'eng' if lang == 'eng' else 'vie'
            target_lang = 'vie' if source_lang == 'eng' else 'eng'
            logger.info(f"Translating from {source_lang} to {target_lang}")
            response = translate_text(text, source_lang, target_lang)
        elif action == "tts":
            audio_path = generate_and_save_audio(text, lang)
            response = f"Audio generated successfully"
        elif action == "grammar":
            response = check_grammar(text, lang)
        elif action == "stt":
            # For STT through chat endpoint, we just return an info message
            response = "Please use the /speech-to-text endpoint to upload audio files for transcription."

        # Save to database
        chat_message = ChatMessage(
            user_id=user_id,
            user_input=text,
            action=action,
            response=response,
            audio_path=audio_path,
            detected_language=detected_language
        )
        db.add(chat_message)
        db.commit()
        db.refresh(chat_message)

        return chat_message
    except Exception as e:
        logger.error(f"Chat processing error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/chat/history", response_model=List[ChatResponse])
async def get_history(db: Session = Depends(get_db)):
    messages = db.query(ChatMessage).order_by(ChatMessage.created_at.desc()).all()
    return messages

@app.get("/chat/history/{user_id}", response_model=List[ChatResponse])
async def get_user_chat_history(user_id: int, db: Session = Depends(get_db)):
    # Verify user exists
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Fetch messages for the specific user
    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.user_id == user_id)
        .order_by(ChatMessage.created_at.desc())
        .all()
    )
    
    if not messages:
        return []  # Return empty list if no messages found
    
    return messages
@app.post("/document/extract", response_model=dict)
async def extract_document_text(file: UploadFile = File(...)):
    """Extract text from PDF or DOCX files."""
    if file.content_type not in [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ]:
        raise HTTPException(status_code=400, detail="Unsupported file format. Use PDF or DOCX.")

    # Use temporary file to process upload
    with tempfile.NamedTemporaryFile(delete=False, suffix=".tmp") as tmp_file:
        tmp_file.write(await file.read())
        tmp_file_path = tmp_file.name

    text = ""
    try:
        if file.content_type == "application/pdf":
            pdf_reader = PdfReader(tmp_file_path)
            for page in pdf_reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
        else:  # DOCX
            doc = Document(tmp_file_path)
            for para in doc.paragraphs:
                text += para.text + "\n"
    except Exception as e:
        logger.error(f"Error extracting text: {str(e)}")
        raise HTTPException(status_code=500, detail="Error extracting text from file")
    finally:
        os.remove(tmp_file_path)  # Clean up temporary file

    if not text.strip():
        return {"text": "No text could be extracted from the file."}

    return {"text": text}
@app.get("/uploads/{filename}")
async def get_file(filename: str):
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting server...")
    uvicorn.run(app, host="0.0.0.0", port=8000)