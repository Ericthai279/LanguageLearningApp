// services/AudioService.js
import { Audio } from 'expo-av';

class AudioService {
  constructor() {
    this.sound = null;
    this.isInitialized = false;
  }

  // Initialize the audio service
  async initialize() {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        allowsRecordingIOS: false,
      });
      this.isInitialized = true;
      console.log('Audio service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize audio service:', error);
      this.isInitialized = false;
      return false;
    }
  }

  // ... rest of the AudioService code
}

// Create and export a singleton instance
const audioService = new AudioService();
export default audioService;