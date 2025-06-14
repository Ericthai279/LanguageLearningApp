import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import ScreenWrapper from '../components/screenwraper';
import { theme } from '../constrants/theme';
import Button from '../components/Button';
import Feather from '@expo/vector-icons/Feather';

// API URL for FastAPI backend - updated to match your backend
const API_URL = 'http://10.25.33.116:8000';

const Chatbot = ({ navigation }) => {
  const [text, setText] = useState('');
  const [action, setAction] = useState('translate');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [token, setToken] = useState(null);
  const [audioAvailable, setAudioAvailable] = useState(false);
  const [currentSound, setCurrentSound] = useState(null);
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const [Audio, setAudio] = useState(null);
  
  // STT related states
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingPermission, setRecordingPermission] = useState(false);
  const [sttLoading, setSttLoading] = useState(false);
  const [showSTTOptions, setShowSTTOptions] = useState(false);
  
  // Initialize and get user data when component mounts
  useEffect(() => {
    const init = async () => {
      // Check if audio is available and initialize it
      try {
        const AudioModule = await import('expo-av');
        if (AudioModule && AudioModule.Audio) {
          setAudio(AudioModule.Audio);
          setAudioAvailable(true);
          
          // Initialize audio mode
          await AudioModule.Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false,
            allowsRecordingIOS: true, // Enable recording for STT
          });
          
          // Request recording permissions
          const { status } = await AudioModule.Audio.requestPermissionsAsync();
          setRecordingPermission(status === 'granted');
          
          console.log('Audio initialized successfully');
          console.log('Recording permission:', status === 'granted');
        }
      } catch (error) {
        console.log('Audio not available:', error);
        setAudioAvailable(false);
        setRecordingPermission(false);
      }
      
      // Get user data from AsyncStorage
      try {
        const userJson = await AsyncStorage.getItem('user');
        if (userJson) {
          const userData = JSON.parse(userJson);
          console.log('Retrieved user data for chatbot:', userData);
          
          setUserId(userData.id);
          setToken(userData.token);
          
          // Set default authorization header
          axios.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
          
          // Fetch chat history
          fetchHistory(userData.token);
        } else {
          // If no user data, redirect to login
          Alert.alert(
            'Authentication Required', 
            'Please login to use the chatbot',
            [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
          );
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        Alert.alert('Error', 'Failed to load user data. Please login again.');
      }
    };
    
    init();
    
    // Cleanup function
    return () => {
      if (currentSound) {
        currentSound.unloadAsync().catch(console.error);
      }
      if (recording) {
        recording.stopAndUnloadAsync().catch(console.error);
      }
    };
  }, [navigation]);
  
  const fetchHistory = async (authToken) => {
    if (!authToken) return;
    
    try {
      console.log('Fetching chat history...');
      const response = await axios.get(`${API_URL}/chat/history`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      console.log('Chat history response:', response.data);
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching history:', error);
      // Don't show alert for history fetch failure, just log it
    }
  };

  // Handle audio playback with actual audio playing
  const handlePlayAudio = async (audioPath, messageId) => {
    if (!audioAvailable || !Audio) {
      Alert.alert('Audio Unavailable', 'Audio playback is not available on this device.');
      return;
    }
    
    try {
      // Stop any currently playing audio
      if (currentSound) {
        await currentSound.stopAsync();
        await currentSound.unloadAsync();
        setCurrentSound(null);
        setPlayingAudioId(null);
      }
      
      // If we're clicking the same audio that was playing, just stop it
      if (playingAudioId === messageId) {
        return;
      }
      
      const audioUrl = `${API_URL}${audioPath}`;
      console.log('Playing audio from:', audioUrl);
      
      // Set playing state immediately for UI feedback
      setPlayingAudioId(messageId);
      
      // Create and load the sound
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true },
        (status) => {
          // Status callback to handle playback events
          if (status.didJustFinish) {
            setPlayingAudioId(null);
            setCurrentSound(null);
          }
        }
      );
      
      setCurrentSound(sound);
      
    } catch (error) {
      console.error('Error playing audio:', error);
      setPlayingAudioId(null);
      Alert.alert('Audio Error', 'Failed to play audio file. Please try again.');
    }
  };

  // Stop audio playback
  const stopAudio = async () => {
    if (currentSound) {
      try {
        await currentSound.stopAsync();
        await currentSound.unloadAsync();
        setCurrentSound(null);
        setPlayingAudioId(null);
      } catch (error) {
        console.error('Error stopping audio:', error);
      }
    }
  };

  // Start recording for STT
  const startRecording = async () => {
    if (!audioAvailable || !Audio) {
      Alert.alert('Audio Unavailable', 'Audio recording is not available on this device.');
      return;
    }

    if (!recordingPermission) {
      Alert.alert('Permission Required', 'Microphone permission is required for speech-to-text.');
      return;
    }

    try {
      // Stop any playing audio first
      if (currentSound) {
        await stopAudio();
      }

      console.log('Starting recording...');
      
      // Set audio mode for recording with valid settings
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

      // Create recording with better settings for speech recognition
      const recordingOptions = {
        android: {
          extension: '.wav',
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_PCM_16BIT,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_PCM_16BIT,
          sampleRate: 16000, // 16kHz is optimal for speech recognition
          numberOfChannels: 1, // Mono
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_LINEARPCM,
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
          sampleRate: 16000, // 16kHz is optimal for speech recognition
          numberOfChannels: 1, // Mono
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/wav',
          bitsPerSecond: 128000,
        },
      };

      console.log('Creating recording with options:', recordingOptions);

      const { recording: newRecording } = await Audio.Recording.createAsync(recordingOptions);

      setRecording(newRecording);
      setIsRecording(true);
      console.log('Recording started successfully');

      // Optional: Add a timer to auto-stop after 60 seconds (backend limit)
      setTimeout(() => {
        if (isRecording) {
          console.log('Auto-stopping recording after 60 seconds');
          stopRecording();
        }
      }, 60000);

    } catch (error) {
      console.error('Failed to start recording:', error);
      setIsRecording(false);
      setRecording(null);
      
      let errorMessage = 'Failed to start recording. ';
      if (error.message?.includes('permission')) {
        errorMessage += 'Please check microphone permissions.';
      } else if (error.message?.includes('busy')) {
        errorMessage += 'Microphone is busy. Please try again.';
      } else {
        errorMessage += 'Please try again.';
      }
      
      Alert.alert('Recording Error', errorMessage);
    }
  };

  // Stop recording and process STT
  const stopRecording = async () => {
    if (!recording) {
      console.log('No recording to stop');
      return;
    }

    try {
      console.log('Stopping recording...');
      setIsRecording(false);
      setSttLoading(true);

      // Stop and get the recording
      await recording.stopAndUnloadAsync();
      
      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

      const uri = recording.getURI();
      console.log('Recording stopped and stored at', uri);

      if (!uri) {
        throw new Error('No recording URI available');
      }

      // Get recording status to check duration and file info
      const status = await recording.getStatusAsync();
      console.log('Recording status:', status);

      if (status.durationMillis && status.durationMillis < 1000) {
        Alert.alert('Recording Too Short', 'Please record for at least 1 second.');
        return;
      }

      // Send the audio file to the backend for STT processing
      await processSTT(uri);

    } catch (error) {
      console.error('Error stopping recording:', error);
      
      let errorMessage = 'Failed to process recording. ';
      if (error.message?.includes('No recording URI')) {
        errorMessage += 'Recording file not found.';
      } else if (error.message?.includes('duration')) {
        errorMessage += 'Recording is too short or empty.';
      } else {
        errorMessage += 'Please try recording again.';
      }
      
      Alert.alert('Recording Error', errorMessage);
    } finally {
      setRecording(null);
      setSttLoading(false);
    }
  };

  // Select audio file for STT
  const selectAudioFile = async () => {
    try {
      setShowSTTOptions(false);
      
      console.log('Opening document picker for audio files...');
      
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      console.log('Document picker result:', result);

      if (result.canceled) {
        console.log('Audio file selection cancelled');
        return;
      }

      if (!result.assets || result.assets.length === 0) {
        Alert.alert('Error', 'No audio file selected.');
        return;
      }

      const selectedFile = result.assets[0];
      
      // Validate file type
      if (!selectedFile.mimeType || !selectedFile.mimeType.startsWith('audio/')) {
        Alert.alert('Invalid File', 'Please select a valid audio file.');
        return;
      }

      // Check file size (limit to 10MB for practical reasons)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (selectedFile.size && selectedFile.size > maxSize) {
        Alert.alert('File Too Large', 'Please select an audio file smaller than 10MB.');
        return;
      }

      console.log('Selected audio file:', selectedFile);
      
      // Show confirmation with file info
      Alert.alert(
        'Process Audio File',
        `File: ${selectedFile.name}\nSize: ${selectedFile.size ? (selectedFile.size / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown'}\n\nProceed with speech-to-text?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Process', 
            onPress: () => processSTTFromFile(selectedFile)
          }
        ]
      );

    } catch (error) {
      console.error('Error selecting audio file:', error);
      Alert.alert('Selection Error', 'Failed to select audio file. Please try again.');
    }
  };

  // Process STT from selected file
  const processSTTFromFile = async (fileInfo) => {
    if (!userId || !token) {
      Alert.alert('Error', 'You must be logged in to use speech-to-text.');
      return;
    }

    setSttLoading(true);

    try {
      console.log('Processing STT for selected file:', fileInfo);

      // Create FormData for multipart/form-data request
      const formData = new FormData();
      formData.append('user_id', userId.toString());
      
      // Add the audio file
      const audioFile = {
        uri: fileInfo.uri,
        type: fileInfo.mimeType || 'audio/wav',
        name: fileInfo.name || 'audio_file.wav',
      };
      
      formData.append('audio_file', audioFile);

      console.log('Sending STT request for file...');

      const response = await axios.post(`${API_URL}/speech-to-text`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60 second timeout for file processing
      });

      console.log('STT file response:', response.data);

      // Add the STT result to messages
      setMessages([response.data, ...messages]);

      // Optionally, set the transcribed text in the input field
      if (response.data.response) {
        setText(response.data.response);
      }

      Alert.alert(
        'Speech Transcribed from File', 
        `File: ${fileInfo.name}\nDetected language: ${response.data.detected_language || 'Unknown'}\nText has been added to input field.`
      );

    } catch (error) {
      console.error('STT file processing error:', error);
      
      let errorMessage = 'Failed to transcribe audio file. Please try again.';
      
      if (error.response) {
        console.error('STT File Error status:', error.response.status);
        console.error('STT File Error data:', error.response.data);
        
        if (error.response.status === 422) {
          errorMessage = 'Invalid audio file format or the file is too long (max 1 minute).';
        } else if (error.response.data?.detail) {
          errorMessage = error.response.data.detail;
        }
      } else if (error.request) {
        errorMessage = 'Unable to connect to server. Please check your internet connection.';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. The audio file might be too large or processing is taking too long.';
      }
      
      Alert.alert('Speech-to-Text Error', errorMessage);
    } finally {
      setSttLoading(false);
    }
  };
  // Process STT with the backend (for recorded audio)
  const processSTT = async (audioUri) => {
    if (!userId || !token) {
      Alert.alert('Error', 'You must be logged in to use speech-to-text.');
      return;
    }

    try {
      console.log('Processing STT for audio:', audioUri);

      // Check if file exists and get file info
      const fileInfo = await fetch(audioUri);
      if (!fileInfo.ok) {
        throw new Error('Recording file not accessible');
      }

      console.log('Audio file size:', fileInfo.headers.get('content-length'));

      // Create FormData for multipart/form-data request
      const formData = new FormData();
      formData.append('user_id', userId.toString());
      
      // Add the audio file with proper metadata
      const audioFile = {
        uri: audioUri,
        type: 'audio/wav',
        name: 'recording.wav',
      };
      
      formData.append('audio_file', audioFile);

      console.log('Sending STT request...');
      console.log('FormData contents:', {
        user_id: userId,
        audio_file: audioFile
      });

      const response = await axios.post(`${API_URL}/speech-to-text`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 second timeout for STT processing
      });

      console.log('STT response:', response.data);

      // Add the STT result to messages
      setMessages([response.data, ...messages]);

      // Optionally, set the transcribed text in the input field
      if (response.data.response && response.data.response.trim()) {
        setText(response.data.response);
        
        Alert.alert(
          'Speech Transcribed', 
          `Detected language: ${response.data.detected_language || 'Unknown'}\nTranscribed: "${response.data.response}"\n\nText has been added to input field.`
        );
      } else {
        Alert.alert(
          'No Speech Detected', 
          'The recording did not contain detectable speech. Please try recording again and speak clearly.'
        );
      }

    } catch (error) {
      console.error('STT processing error:', error);
      
      let errorMessage = 'Failed to transcribe audio. ';
      
      if (error.response) {
        console.error('STT Error status:', error.response.status);
        console.error('STT Error data:', error.response.data);
        
        if (error.response.status === 422) {
          if (error.response.data?.detail?.includes('No speech detected')) {
            errorMessage = 'No speech detected in the recording. Please try speaking more clearly.';
          } else if (error.response.data?.detail?.includes('duration')) {
            errorMessage = 'Recording is too short or too long. Please record between 1-60 seconds.';
          } else {
            errorMessage = 'Invalid audio file. Please ensure you recorded properly.';
          }
        } else if (error.response.status === 500) {
          errorMessage = 'Server error during transcription. Please try again.';
        } else if (error.response.data?.detail) {
          errorMessage = error.response.data.detail;
        }
      } else if (error.request) {
        errorMessage = 'Unable to connect to server. Please check your internet connection.';
      } else if (error.message?.includes('not accessible')) {
        errorMessage = 'Recording file is not accessible. Please try recording again.';
      } else {
        errorMessage += 'Please try again.';
      }
      
      Alert.alert('Speech-to-Text Error', errorMessage);
    }
  };

  // Handle chat submission
  const handleSubmit = async () => {
    // Validation checks
    if (!userId || !token) {
      Alert.alert('Error', 'You must be logged in to use the chatbot.');
      return;
    }
    
    if (!text.trim()) {
      Alert.alert('Error', 'Please enter a message.');
      return;
    }
    
    // Create the exact payload that FastAPI expects
    const payload = {
      user_id: parseInt(userId), // Ensure it's an integer
      text: text.trim(),
      action: action.toLowerCase() // Ensure it's lowercase
    };
    
    console.log('Sending chat request with payload:', payload);
    setLoading(true);
    
    try {
      const response = await axios.post(`${API_URL}/chat`, payload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Chat response:', response.data);
      
      // Add new message to the list (add to beginning since we use inverted list)
      setMessages([response.data, ...messages]);
      setText('');
      
      // Handle audio response - auto-play if TTS
      if (action === 'tts' && response.data.audio_path) {
        if (audioAvailable) {
          // Auto-play the newly generated audio
          setTimeout(() => {
            handlePlayAudio(response.data.audio_path, response.data.id);
          }, 500); // Small delay to ensure UI is updated
        } else {
          Alert.alert('Audio Generated', 
            'Audio was generated successfully but playback is not available on this device.');
        }
      }
      
    } catch (error) {
      console.error('Error processing chat:', error);
      
      // Enhanced error logging for debugging
      if (error.response) {
        console.error('Error status:', error.response.status);
        console.error('Error data:', error.response.data);
        console.error('Error headers:', error.response.headers);
      }
      
      let errorMessage = 'Something went wrong while processing your request.';
      
      if (error.response) {
        if (error.response.status === 422) {
          errorMessage = 'Invalid request data. Please check your input and try again.';
        } else if (error.response.status === 401) {
          errorMessage = 'Authentication failed. Please login again.';
        } else if (error.response.data?.detail) {
          errorMessage = error.response.data.detail;
        }
      } else if (error.request) {
        errorMessage = 'Unable to connect to server. Please check your internet connection.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Render a chat message
  const renderMessage = ({ item }) => {
    const isPlaying = playingAudioId === item.id;
    
    return (
      <View style={styles.message}>
        <Text style={styles.userText}>
          You ({item.action}): {item.user_input}
          {item.detected_language && (
            <Text style={styles.languageTag}> [{item.detected_language}]</Text>
          )}
        </Text>
        <Text style={styles.botText}>Bot: {item.response}</Text>
        
        {item.audio_path && (
          <View style={styles.audioContainer}>
            <TouchableOpacity 
              style={[
                styles.audioButton,
                isPlaying && styles.playingAudioButton
              ]} 
              onPress={() => isPlaying ? stopAudio() : handlePlayAudio(item.audio_path, item.id)}
            >
              <Feather 
                name={isPlaying ? "pause" : "play"} 
                size={16} 
                color="#fff" 
              />
              <Text style={styles.audioButtonText}>
                {isPlaying ? 'Stop Audio' : 'Play Audio'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <ScreenWrapper bg="white">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.heading}>Chatbot</Text>
          <View style={styles.statusContainer}>
            {audioAvailable && (
              <Text style={styles.audioStatus}>🔊 Audio Ready</Text>
            )}
            {!audioAvailable && (
              <Text style={styles.audioStatus}>🔇 Audio Unavailable</Text>
            )}
            {recordingPermission && (
              <Text style={styles.audioStatus}>🎤 Mic Ready</Text>
            )}
          </View>
        </View>
        
        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id.toString()}
          inverted
          style={styles.chatList}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No messages yet. Start a conversation!</Text>
              {userId && (
                <Text style={styles.userIdText}>User ID: {userId}</Text>
              )}
            </View>
          }
        />
        
        <View style={styles.inputContainer}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="Type your message or use speech-to-text..."
              placeholderTextColor={theme.colors.text}
              multiline
            />
            
            {/* STT Buttons - Record or Select File */}
            {audioAvailable && recordingPermission && (
              <View style={styles.sttButtonsContainer}>
                <TouchableOpacity
                  style={[
                    styles.sttButton,
                    isRecording && styles.recordingButton,
                    sttLoading && styles.loadingButton
                  ]}
                  onPress={isRecording ? stopRecording : startRecording}
                  disabled={sttLoading}
                >
                  {sttLoading ? (
                    <Feather name="loader" size={20} color="#fff" />
                  ) : (
                    <Feather 
                      name={isRecording ? "mic-off" : "mic"} 
                      size={20} 
                      color="#fff" 
                    />
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.sttButton,
                    styles.fileButton,
                    sttLoading && styles.loadingButton
                  ]}
                  onPress={selectAudioFile}
                  disabled={sttLoading || isRecording}
                >
                  <Feather name="upload" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
            
            {/* Fallback for devices without recording capability */}
            {(!audioAvailable || !recordingPermission) && (
              <TouchableOpacity
                style={[
                  styles.sttButton,
                  styles.fileButton,
                  sttLoading && styles.loadingButton
                ]}
                onPress={selectAudioFile}
                disabled={sttLoading}
              >
                <Feather name="upload" size={20} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
          
          {isRecording && (
            <View style={styles.recordingIndicator}>
              <Text style={styles.recordingText}>🔴 Recording... Tap mic to stop</Text>
            </View>
          )}
          
          {sttLoading && (
            <View style={styles.recordingIndicator}>
              <Text style={styles.recordingText}>⏳ Processing speech...</Text>
            </View>
          )}
          
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, action === 'translate' && styles.activeButton]}
              onPress={() => setAction('translate')}
            >
              <Text style={styles.actionButtonText}>Translate</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.actionButton, 
                action === 'tts' && styles.activeButton,
                !audioAvailable && styles.disabledButton
              ]}
              onPress={() => {
                if (!audioAvailable) {
                  Alert.alert('Audio Unavailable', 'Audio features are not available on this device.');
                  return;
                }
                setAction('tts');
              }}
            >
              <Text style={styles.actionButtonText}>
                TTS {!audioAvailable && '🚫'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, action === 'grammar' && styles.activeButton]}
              onPress={() => setAction('grammar')}
            >
              <Text style={styles.actionButtonText}>Grammar</Text>
            </TouchableOpacity>
          </View>
          
          <Button
            title={loading ? 'Sending...' : 'Send'}
            onPress={handleSubmit}
            disabled={loading || !text.trim()}
            buttonStyle={styles.sendButton}
          />
        </View>
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  heading: {
    fontSize: 26,
    fontWeight: theme.fonts.bold,
    color: theme.colors.text,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  audioStatus: {
    fontSize: 12,
    color: '#666',
  },
  chatList: {
    flex: 1,
  },
  message: {
    marginVertical: 5,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  userText: {
    fontWeight: theme.fonts.semibold,
    color: theme.colors.text,
  },
  languageTag: {
    fontSize: 12,
    color: '#666',
    fontWeight: 'normal',
  },
  botText: {
    marginTop: 5,
    color: theme.colors.text,
  },
  audioContainer: {
    marginTop: 10,
  },
  audioButton: {
    backgroundColor: theme.colors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    alignSelf: 'flex-start',
  },
  playingAudioButton: {
    backgroundColor: '#e74c3c', // Red color when playing
  },
  audioButtonText: {
    color: '#fff',
    fontWeight: theme.fonts.semibold,
    marginLeft: 5,
  },
  inputContainer: {
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: theme.colors.border,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 10,
    borderRadius: 8,
    fontSize: 16,
    color: theme.colors.text,
    minHeight: 40,
    maxHeight: 100,
    marginRight: 10,
  },
  sttButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  sttButton: {
    backgroundColor: theme.colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileButton: {
    backgroundColor: '#27ae60', // Green color for file upload
  },
  recordingButton: {
    backgroundColor: '#e74c3c', // Red when recording
  },
  loadingButton: {
    backgroundColor: '#95a5a6', // Gray when loading
  },
  recordingIndicator: {
    backgroundColor: '#ffebee',
    padding: 8,
    borderRadius: 5,
    marginBottom: 10,
    alignItems: 'center',
  },
  recordingText: {
    color: '#d32f2f',
    fontSize: 14,
    fontWeight: theme.fonts.semibold,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  actionButton: {
    flex: 1,
    padding: 10,
    backgroundColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  activeButton: {
    backgroundColor: theme.colors.primary,
  },
  disabledButton: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: theme.fonts.semibold,
  },
  sendButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: theme.colors.textLight || '#888',
    textAlign: 'center',
    marginBottom: 10,
  },
  userIdText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});

export default Chatbot;