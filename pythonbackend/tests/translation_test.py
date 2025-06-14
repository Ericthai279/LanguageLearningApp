import requests
import json
from time import time

# Base URL of the FastAPI application
BASE_URL = "http://localhost:8000"
USER_ID = 2  # Change this to a valid user ID in your system

def test_translation_performance():
    """Test translation performance with various texts"""
    
    test_cases = [
        # Short texts
        "Hello, how are you?",
        "I am learning Vietnamese.",
        "The weather is nice today.",
        # Medium texts
        "Vietnam is a beautiful country with a rich culture and history. I hope to visit someday.",
        "Language learning requires practice, patience, and dedication. It's a rewarding journey.",
        # Longer texts
        "The process of language acquisition involves both conscious and unconscious elements. "+
        "When learning a new language, we must pay attention to vocabulary, grammar, "+
        "pronunciation, and cultural context. This multi-faceted approach helps develop fluency over time.",
        # Vietnamese texts
        "Xin chào, bạn khỏe không?",
        "Tôi đang học tiếng Anh.",
        "Việt Nam có nhiều món ăn ngon và cảnh đẹp. Tôi rất thích văn hóa Việt Nam."
    ]
    
    print("===== Translation Performance Test =====")
    print(f"Testing {len(test_cases)} different texts")
    print("-----------------------------------------")
    
    results = []
    
    for i, text in enumerate(test_cases, 1):
        print(f"Test case {i}: Length: {len(text)} characters")
        print(f"Original: {text[:50]}..." if len(text) > 50 else f"Original: {text}")
        
        start_time = time()
        response = requests.post(
            f"{BASE_URL}/chat",
            json={
                "user_id": USER_ID,
                "text": text,
                "action": "translate"
            }
        )
        elapsed_time = time() - start_time
        
        if response.status_code == 200:
            result = response.json()
            translated = result["response"]
            print(f"Translated: {translated[:50]}..." if len(translated) > 50 else f"Translated: {translated}")
            print(f"Time: {elapsed_time:.2f} seconds")
            
            results.append({
                "text_length": len(text),
                "time": elapsed_time,
                "success": True
            })
        else:
            print(f"Error: {response.status_code}, {response.text}")
            results.append({
                "text_length": len(text),
                "time": elapsed_time,
                "success": False
            })
        
        print("-----------------------------------------")
    
    # Calculate statistics
    successful = [r for r in results if r["success"]]
    if successful:
        avg_time = sum(r["time"] for r in successful) / len(successful)
        print(f"Average translation time: {avg_time:.2f} seconds")
        
        # Group by approximate text length
        short = [r for r in successful if r["text_length"] < 50]
        medium = [r for r in successful if 50 <= r["text_length"] < 200]
        long = [r for r in successful if r["text_length"] >= 200]
        
        if short:
            avg_short = sum(r["time"] for r in short) / len(short)
            print(f"Average time for short texts (<50 chars): {avg_short:.2f} seconds")
        
        if medium:
            avg_medium = sum(r["time"] for r in medium) / len(medium)
            print(f"Average time for medium texts (50-200 chars): {avg_medium:.2f} seconds")
        
        if long:
            avg_long = sum(r["time"] for r in long) / len(long)
            print(f"Average time for long texts (>200 chars): {avg_long:.2f} seconds")
    
    success_rate = len(successful) / len(results) * 100
    print(f"Success rate: {success_rate:.2f}%")

def test_edge_cases():
    """Test translation with edge cases"""
    
    edge_cases = [
        # Very short text
        "Hi",
        # Numbers and special characters
        "123 $#@!",
        # Mixed Vietnamese and English
        "Hello bạn của tôi, how are you today?",
        # Very long text (512+ characters)
        "This is a very long text that exceeds the normal length of a message. " * 10,
        # Text with line breaks
        "Line 1\nLine 2\nLine 3",
        # Text with HTML tags
        "<p>This is a paragraph with <strong>bold text</strong>.</p>",
        # Empty text (should be caught by validation)
        ""
    ]
    
    print("\n===== Translation Edge Cases Test =====")
    
    for i, text in enumerate(edge_cases, 1):
        print(f"\nEdge case {i}: {text[:50]}..." if len(text) > 50 else f"\nEdge case {i}: {text}")
        
        response = requests.post(
            f"{BASE_URL}/chat",
            json={
                "user_id": USER_ID,
                "text": text,
                "action": "translate"
            }
        )
        
        print(f"Status code: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"Response: {result['response'][:100]}..." if len(result['response']) > 100 else f"Response: {result['response']}")
        else:
            print(f"Error: {response.text}")

if __name__ == "__main__":
    print("\n=======================================")
    print("Starting Translation Tests")
    print("=======================================")
    
    try:
        # Check if server is running
        requests.get(BASE_URL)
        
        test_translation_performance()
        test_edge_cases()
        
        print("\n=======================================")
        print("Translation tests completed!")
        print("=======================================")
    except requests.exceptions.ConnectionError:
        print(f"ERROR: Cannot connect to {BASE_URL}. Make sure the server is running.")