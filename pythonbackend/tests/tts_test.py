import requests
import json
import os
import time

# Base URL of the FastAPI application
BASE_URL = "http://localhost:8000"
USER_ID = 2  # Change this to a valid user ID in your system

def test_tts_basic():
    """Test basic TTS functionality for both languages"""
    
    test_cases = [
        {
            "language": "English",
            "text": "This is a test of the text to speech system."
        },
        {
            "language": "Vietnamese",
            "text": "Đây là bài kiểm tra hệ thống chuyển văn bản thành giọng nói."
        }
    ]
    
    print("===== Basic TTS Test =====")
    
    for i, case in enumerate(test_cases, 1):
        print(f"\nTest case {i}: {case['language']}")
        print(f"Text: {case['text']}")
        
        start_time = time.time()
        response = requests.post(
            f"{BASE_URL}/chat",
            json={
                "user_id": USER_ID,
                "text": case['text'],
                "action": "tts"
            }
        )
        elapsed_time = time.time() - start_time
        
        if response.status_code == 200:
            result = response.json()
            print(f"Success! Audio path: {result['audio_path']}")
            print(f"Processing time: {elapsed_time:.2f} seconds")
            
            # Download the audio file
            if result['audio_path']:
                audio_url = f"{BASE_URL}{result['audio_path']}"
                filename = f"test_{case['language'].lower()}.wav"
                download_audio(audio_url, filename)
        else:
            print(f"Error: {response.status_code}, {response.text}")

def test_tts_various_lengths():
    """Test TTS with texts of various lengths"""
    
    test_cases = [
        # Very short
        "Hello.",
        # Short
        "This is a short sentence for testing.",
        # Medium
        "This is a medium length text that contains multiple sentences. " +
        "It should test how the system handles longer content. " +
        "The audio should sound natural with proper intonation.",
        # Long
        "This is a longer paragraph that will test how the text-to-speech system " +
        "handles extended content. When processing longer texts, we need to ensure " +
        "that the system maintains proper pacing, intonation, and pronunciation " +
        "throughout the entire audio. Additionally, we want to measure the processing " +
        "time to understand how the system scales with input length. " +
        "Performance metrics are important for optimizing user experience.",
        # Very long (300+ words)
        "This is a very long text. " * 30
    ]
    
    print("\n===== TTS Length Test =====")
    print("Testing texts of various lengths")
    
    results = []
    
    for i, text in enumerate(test_cases, 1):
        print(f"\nTest case {i}: Length: {len(text)} characters")
        print(f"Text preview: {text[:50]}..." if len(text) > 50 else f"Text: {text}")
        
        start_time = time.time()
        response = requests.post(
            f"{BASE_URL}/chat",
            json={
                "user_id": USER_ID,
                "text": text,
                "action": "tts"
            }
        )
        elapsed_time = time.time() - start_time
        
        if response.status_code == 200:
            result = response.json()
            print(f"Success! Audio path: {result['audio_path']}")
            print(f"Processing time: {elapsed_time:.2f} seconds")
            
            results.append({
                "text_length": len(text),
                "time": elapsed_time,
                "success": True
            })
            
            # Download only the first few for space reasons
            if i <= 3 and result['audio_path']:
                audio_url = f"{BASE_URL}{result['audio_path']}"
                filename = f"length_test_{i}.wav"
                download_audio(audio_url, filename)
        else:
            print(f"Error: {response.status_code}, {response.text}")
            results.append({
                "text_length": len(text),
                "time": elapsed_time,
                "success": False
            })
    
    # Calculate statistics
    successful = [r for r in results if r["success"]]
    if successful:
        print("\nStatistics:")
        # Calculate average time per character
        total_chars = sum(r["text_length"] for r in successful)
        total_time = sum(r["time"] for r in successful)
        avg_time_per_char = total_time / total_chars if total_chars > 0 else 0
        
        print(f"Average processing time: {sum(r['time'] for r in successful) / len(successful):.2f} seconds")
        print(f"Average time per character: {avg_time_per_char:.4f} seconds")
        
        # Check if processing time scales linearly with text length
        print(f"Time for shortest text ({successful[0]['text_length']} chars): {successful[0]['time']:.2f} seconds")
        print(f"Time for longest text ({successful[-1]['text_length']} chars): {successful[-1]['time']:.2f} seconds")
        ratio = successful[-1]['time'] / successful[0]['time'] if successful[0]['time'] > 0 else 0
        length_ratio = successful[-1]['text_length'] / successful[0]['text_length']
        print(f"Time ratio: {ratio:.2f}, Length ratio: {length_ratio:.2f}")
        
        if abs(ratio - length_ratio) / length_ratio < 0.3:  # Within 30% difference
            print("Processing time appears to scale roughly linearly with text length")
        else:
            print("Processing time does not scale linearly with text length")

def test_tts_special_content():
    """Test TTS with special content like numbers, dates, and special characters"""
    
    test_cases = [
        # Numbers
        "The result is 1234.56 and the product costs $99.99.",
        # Dates
        "Today is May 12, 2025, and the meeting is scheduled for 3:30 PM.",
        # Abbreviations and acronyms
        "NASA and the FBI are U.S. government organizations. Dr. Smith works at the U.N.",
        # Special characters
        "The email address is test@example.com and the website is https://www.example.com!",
        # Mixed case and punctuation
        "HELLO! How ARE you Today? This is a TEST; with Various! Punctuation."
    ]
    
    print("\n===== TTS Special Content Test =====")
    
    for i, text in enumerate(test_cases, 1):
        print(f"\nTest case {i}:")
        print(f"Text: {text}")
        
        response = requests.post(
            f"{BASE_URL}/chat",
            json={
                "user_id": USER_ID,
                "text": text,
                "action": "tts"
            }
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"Success! Audio path: {result['audio_path']}")
            
            # Download the audio file
            if result['audio_path']:
                audio_url = f"{BASE_URL}{result['audio_path']}"
                filename = f"special_test_{i}.wav"
                download_audio(audio_url, filename)
        else:
            print(f"Error: {response.status_code}, {response.text}")

def download_audio(url, filename):
    """Download audio file from URL"""
    try:
        response = requests.get(url)
        if response.status_code == 200:
            os.makedirs("test_outputs", exist_ok=True)
            filepath = os.path.join("test_outputs", filename)
            with open(filepath, "wb") as f:
                f.write(response.content)
            print(f"Downloaded audio to {filepath}")
        else:
            print(f"Failed to download audio: {response.status_code}")
    except Exception as e:
        print(f"Error downloading audio: {str(e)}")

if __name__ == "__main__":
    print("\n=======================================")
    print("Starting Text-to-Speech Tests")
    print("=======================================")
    
    try:
        # Check if server is running
        requests.get(BASE_URL)
        
        test_tts_basic()
        test_tts_various_lengths()
        test_tts_special_content()
        
        print("\n=======================================")
        print("TTS tests completed!")
        print("=======================================")
    except requests.exceptions.ConnectionError:
        print(f"ERROR: Cannot connect to {BASE_URL}. Make sure the server is running.")