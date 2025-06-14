import requests
import json
import time
import os

# Base URL of the FastAPI application
BASE_URL = "http://localhost:8000"

# Test user ID - make sure this user exists in your database
USER_ID = 2  # Change this to a valid user ID in your system

def test_translation():
    """Test the translation functionality"""
    print("\n===== Testing Translation =====")
    
    # English to Vietnamese
    eng_text = "Hello, how are you today?"
    print(f"Translating English to Vietnamese: '{eng_text}'")
    response = requests.post(
        f"{BASE_URL}/chat",
        json={
            "user_id": USER_ID,
            "text": eng_text,
            "action": "translate"
        }
    )
    
    if response.status_code == 200:
        result = response.json()
        print(f"Success! Translated text: {result['response']}")
    else:
        print(f"Error: {response.status_code}, {response.text}")

    # Vietnamese to English
    vi_text = "Xin chào, bạn khỏe không?"
    print(f"\nTranslating Vietnamese to English: '{vi_text}'")
    response = requests.post(
        f"{BASE_URL}/chat",
        json={
            "user_id": USER_ID,
            "text": vi_text,
            "action": "translate"
        }
    )
    
    if response.status_code == 200:
        result = response.json()
        print(f"Success! Translated text: {result['response']}")
    else:
        print(f"Error: {response.status_code}, {response.text}")

def test_text_to_speech():
    """Test the text-to-speech functionality"""
    print("\n===== Testing Text-to-Speech =====")
    
    # English TTS
    eng_text = "This is a test of the text to speech system."
    print(f"Converting English text to speech: '{eng_text}'")
    response = requests.post(
        f"{BASE_URL}/chat",
        json={
            "user_id": USER_ID,
            "text": eng_text,
            "action": "tts"
        }
    )
    
    if response.status_code == 200:
        result = response.json()
        print(f"Success! Audio path: {result['audio_path']}")
        
        # Download the audio file
        if result['audio_path']:
            audio_url = f"{BASE_URL}{result['audio_path']}"
            download_audio(audio_url, "english_tts.wav")
    else:
        print(f"Error: {response.status_code}, {response.text}")
    
    # Vietnamese TTS
    vi_text = "Đây là bài kiểm tra hệ thống chuyển văn bản thành giọng nói."
    print(f"\nConverting Vietnamese text to speech: '{vi_text}'")
    response = requests.post(
        f"{BASE_URL}/chat",
        json={
            "user_id": USER_ID,
            "text": vi_text,
            "action": "tts"
        }
    )
    
    if response.status_code == 200:
        result = response.json()
        print(f"Success! Audio path: {result['audio_path']}")
        
        # Download the audio file
        if result['audio_path']:
            audio_url = f"{BASE_URL}{result['audio_path']}"
            download_audio(audio_url, "vietnamese_tts.wav")
    else:
        print(f"Error: {response.status_code}, {response.text}")

def test_grammar_check():
    """Test the grammar checking functionality"""
    print("\n===== Testing Grammar Checking =====")
    
    # English with grammar errors
    eng_text_with_errors = "I have eat three apple yesterday."
    print(f"Checking English grammar: '{eng_text_with_errors}'")
    response = requests.post(
        f"{BASE_URL}/chat",
        json={
            "user_id": USER_ID,
            "text": eng_text_with_errors,
            "action": "grammar"
        }
    )
    
    if response.status_code == 200:
        result = response.json()
        print(f"Success! Grammar check results:\n{result['response']}")
    else:
        print(f"Error: {response.status_code}, {response.text}")
    
    # English without grammar errors
    eng_text_correct = "I have eaten three apples yesterday."
    print(f"\nChecking correct English grammar: '{eng_text_correct}'")
    response = requests.post(
        f"{BASE_URL}/chat",
        json={
            "user_id": USER_ID,
            "text": eng_text_correct,
            "action": "grammar"
        }
    )
    
    if response.status_code == 200:
        result = response.json()
        print(f"Success! Grammar check results:\n{result['response']}")
    else:
        print(f"Error: {response.status_code}, {response.text}")
    
    # Vietnamese (not supported)
    vi_text = "Tôi đã ăn ba quả táo hôm qua."
    print(f"\nChecking Vietnamese grammar (not supported): '{vi_text}'")
    response = requests.post(
        f"{BASE_URL}/chat",
        json={
            "user_id": USER_ID,
            "text": vi_text,
            "action": "grammar"
        }
    )
    
    if response.status_code == 200:
        result = response.json()
        print(f"Success! Grammar check results:\n{result['response']}")
    else:
        print(f"Error: {response.status_code}, {response.text}")

def test_chat_history():
    """Test retrieving chat history"""
    print("\n===== Testing Chat History =====")
    
    response = requests.get(f"{BASE_URL}/chat/history")
    
    if response.status_code == 200:
        results = response.json()
        print(f"Success! Retrieved {len(results)} chat messages.")
        if results:
            print("\nMost recent messages:")
            for i, message in enumerate(results[:3]):  # Show the 3 most recent messages
                print(f"{i+1}. User ID: {message['user_id']}")
                print(f"   Input: {message['user_input']}")
                print(f"   Action: {message['action']}")
                print(f"   Response: {message['response'][:50]}..." if len(message['response']) > 50 else f"   Response: {message['response']}")
                print(f"   Timestamp: {message['created_at']}")
                print()
    else:
        print(f"Error: {response.status_code}, {response.text}")

def test_error_cases():
    """Test error handling"""
    print("\n===== Testing Error Cases =====")
    
    # Missing user_id
    print("Testing missing user_id:")
    response = requests.post(
        f"{BASE_URL}/chat",
        json={
            "text": "Test text",
            "action": "translate"
        }
    )
    print(f"Status: {response.status_code}, Response: {response.text}")
    
    # Invalid user_id
    print("\nTesting invalid user_id:")
    response = requests.post(
        f"{BASE_URL}/chat",
        json={
            "user_id": 9999,  # Assuming this user doesn't exist
            "text": "Test text",
            "action": "translate"
        }
    )
    print(f"Status: {response.status_code}, Response: {response.text}")
    
    # Empty text
    print("\nTesting empty text:")
    response = requests.post(
        f"{BASE_URL}/chat",
        json={
            "user_id": USER_ID,
            "text": "",
            "action": "translate"
        }
    )
    print(f"Status: {response.status_code}, Response: {response.text}")
    
    # Invalid action
    print("\nTesting invalid action:")
    response = requests.post(
        f"{BASE_URL}/chat",
        json={
            "user_id": USER_ID,
            "text": "Test text",
            "action": "invalid_action"
        }
    )
    print(f"Status: {response.status_code}, Response: {response.text}")
    
    # Invalid audio file
    print("\nTesting invalid audio file:")
    response = requests.get(f"{BASE_URL}/uploads/nonexistent_file.wav")
    print(f"Status: {response.status_code}, Response: {response.text}")

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

def run_all_tests():
    """Run all tests"""
    try:
        # Check if server is running
        requests.get(BASE_URL)
    except requests.exceptions.ConnectionError:
        print(f"ERROR: Cannot connect to {BASE_URL}. Make sure the server is running.")
        return

    print("===============================================")
    print("Starting backend tests for Language App")
    print("===============================================")
    
    # Run all test functions
    test_translation()
    test_text_to_speech()
    test_grammar_check()
    test_chat_history()
    test_error_cases()
    
    print("\n===============================================")
    print("All tests completed!")
    print("===============================================")

if __name__ == "__main__":
    run_all_tests()