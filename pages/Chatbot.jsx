import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import ScreenWrapper from '../components/screenwraper';
import Button from '../components/Button';
import Feather from '@expo/vector-icons/Feather';
import { NavigationBar } from '../components/NavigationBar';

const API_URL = 'https://3aac7e2c3fce.ngrok-free.app';

const colors = {
  primary: '#007AFF',
  secondary: '#5856D6',
  success: '#34C759',
  warning: '#FF9500',
  danger: '#FF3B30',
  background: '#F2F2F7',
  surface: '#FFFFFF',
  text: '#1C1C1E',
  textSecondary: '#8E8E93',
  border: '#C6C6C8',
};

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
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingPermission, setRecordingPermission] = useState(false);
  const [sttLoading, setSttLoading] = useState(false);
  const [showSTTOptions, setShowSTTOptions] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const AudioModule = await import('expo-av');
        if (AudioModule && AudioModule.Audio) {
          setAudio(AudioModule.Audio);
          setAudioAvailable(true);
          await AudioModule.Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false,
            allowsRecordingIOS: true,
          });
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

      try {
        const userJson = await AsyncStorage.getItem('user');
        if (userJson) {
          const userData = JSON.parse(userJson);
          console.log('Retrieved user data for chatbot:', userData);
          setUserId(userData.id);
          setToken(userData.token);
          axios.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
          fetchHistory(userData.token);
        } else {
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
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      console.log('Chat history response:', response.data);
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const handlePlayAudio = async (audioPath, messageId) => {
    if (!audioAvailable || !Audio) {
      Alert.alert('Audio Unavailable', 'Audio playback is not available on this device.');
      return;
    }
    try {
      if (currentSound) {
        await currentSound.stopAsync();
        await currentSound.unloadAsync();
        setCurrentSound(null);
        setPlayingAudioId(null);
      }
      if (playingAudioId === messageId) return;
      const audioUrl = `${API_URL}${audioPath}`;
      console.log('Playing audio from:', audioUrl);
      setPlayingAudioId(messageId);
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true },
        (status) => {
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
      if (currentSound) await stopAudio();
      console.log('Starting recording...');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });
      const recordingOptions = {
        android: {
          extension: '.wav',
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_PCM_16BIT,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_PCM_16BIT,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_LINEARPCM,
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
          sampleRate: 16000,
          numberOfChannels: 1,
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
      if (error.message?.includes('permission')) errorMessage += 'Please check microphone permissions.';
      else if (error.message?.includes('busy')) errorMessage += 'Microphone is busy. Please try again.';
      else errorMessage += 'Please try again.';
      Alert.alert('Recording Error', errorMessage);
    }
  };

  const stopRecording = async () => {
    if (!recording) {
      console.log('No recording to stop');
      return;
    }
    try {
      console.log('Stopping recording...');
      setIsRecording(false);
      setSttLoading(true);
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });
      const uri = recording.getURI();
      console.log('Recording stopped and stored at', uri);
      if (!uri) throw new Error('No recording URI available');
      const status = await recording.getStatusAsync();
      console.log('Recording status:', status);
      if (status.durationMillis && status.durationMillis < 1000) {
        Alert.alert('Recording Too Short', 'Please record for at least 1 second.');
        return;
      }
      await processSTT(uri);
    } catch (error) {
      console.error('Error stopping recording:', error);
      let errorMessage = 'Failed to process recording. ';
      if (error.message?.includes('No recording URI')) errorMessage += 'Recording file not found.';
      else if (error.message?.includes('duration')) errorMessage += 'Recording is too short or empty.';
      else errorMessage += 'Please try recording again.';
      Alert.alert('Recording Error', errorMessage);
    } finally {
      setRecording(null);
      setSttLoading(false);
    }
  };

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
      if (!selectedFile.mimeType || !selectedFile.mimeType.startsWith('audio/')) {
        Alert.alert('Invalid File', 'Please select a valid audio file.');
        return;
      }
      const maxSize = 10 * 1024 * 1024;
      if (selectedFile.size && selectedFile.size > maxSize) {
        Alert.alert('File Too Large', 'Please select an audio file smaller than 10MB.');
        return;
      }
      console.log('Selected audio file:', selectedFile);
      Alert.alert(
        'Process Audio File',
        `File: ${selectedFile.name}\nSize: ${selectedFile.size ? (selectedFile.size / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown'}\n\nProceed with speech-to-text?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Process', onPress: () => processSTTFromFile(selectedFile) }
        ]
      );
    } catch (error) {
      console.error('Error selecting audio file:', error);
      Alert.alert('Selection Error', 'Failed to select audio file. Please try again.');
    }
  };

  const processSTTFromFile = async (fileInfo) => {
    if (!userId || !token) {
      Alert.alert('Error', 'You must be logged in to use speech-to-text.');
      return;
    }
    setSttLoading(true);
    try {
      console.log('Processing STT for selected file:', fileInfo);
      const formData = new FormData();
      formData.append('user_id', userId.toString());
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
        timeout: 60000,
      });
      console.log('STT file response:', response.data);
      setMessages([response.data, ...messages]);
      if (response.data.response) setText(response.data.response);
      Alert.alert(
        'Speech Transcribed from File',
        `File: ${selectedFile.name}\nDetected language: ${response.data.detected_language || 'Unknown'}\nText has been added to input field.`
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

  const processSTT = async (audioUri) => {
    if (!userId || !token) {
      Alert.alert('Error', 'You must be logged in to use speech-to-text.');
      return;
    }
    try {
      console.log('Processing STT for audio:', audioUri);
      const fileInfo = await fetch(audioUri);
      if (!fileInfo.ok) throw new Error('Recording file not accessible');
      console.log('Audio file size:', fileInfo.headers.get('content-length'));
      const formData = new FormData();
      formData.append('user_id', userId.toString());
      const audioFile = { uri: audioUri, type: 'audio/wav', name: 'recording.wav' };
      formData.append('audio_file', audioFile);
      console.log('Sending STT request...');
      console.log('FormData contents:', { user_id: userId, audio_file: audioFile });
      const response = await axios.post(`${API_URL}/speech-to-text`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000,
      });
      console.log('STT response:', response.data);
      setMessages([response.data, ...messages]);
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

  const handleSubmit = async () => {
    if (!userId || !token) {
      Alert.alert('Error', 'You must be logged in to use the chatbot.');
      return;
    }
    if (!text.trim()) {
      Alert.alert('Error', 'Please enter a message.');
      return;
    }
    const payload = {
      user_id: parseInt(userId),
      text: text.trim(),
      action: action.toLowerCase()
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
      setMessages([response.data, ...messages]);
      setText('');
      if (action === 'tts' && response.data.audio_path) {
        if (audioAvailable) {
          setTimeout(() => {
            handlePlayAudio(response.data.audio_path, response.data.id);
          }, 500);
        } else {
          Alert.alert('Audio Generated',
            'Audio was generated successfully but playback is not available on this device.');
        }
      }
    } catch (error) {
      console.error('Error processing chat:', error);
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

  const renderMessage = ({ item }) => {
    const isPlaying = playingAudioId === item.id;

    return (
      <View style={styles.messageContainer}>
        <View style={[styles.message, styles.userMessage]}>
          <Text style={styles.userText}>
            {item.user_input} ({item.action})
            {item.detected_language && (
              <Text style={styles.languageTag}> [{item.detected_language}]</Text>
            )}
          </Text>
        </View>
        <View style={[styles.message, styles.botMessage]}>
          <Text style={styles.botText}>{item.response}</Text>
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
                  color={colors.surface}
                />
                <Text style={styles.audioButtonText}>
                  {isPlaying ? 'Stop Audio' : 'Play Audio'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <ScreenWrapper bg={colors.background}>
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
          contentContainerStyle={styles.chatListContent}
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
              placeholderTextColor={colors.textSecondary}
              multiline
            />
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
                    <Feather name="loader" size={20} color={colors.surface} />
                  ) : (
                    <Feather
                      name={isRecording ? "mic-off" : "mic"}
                      size={20}
                      color={colors.surface}
                    />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.sttButton,
                    styles.fileButton,
                    sttLoading && styles.loadingButton,
                  ]}
                  onPress={selectAudioFile}
                  disabled={sttLoading || isRecording}
                >
                  <Feather name="upload" size={20} color={colors.surface} />
                </TouchableOpacity>
              </View>
            )}
            {(!audioAvailable || !recordingPermission) && (
              <TouchableOpacity
                style={[
                  styles.sttButton,
                  styles.fileButton,
                  sttLoading && styles.loadingButton,
                ]}
                onPress={selectAudioFile}
                disabled={sttLoading}
              >
                <Feather name="upload" size={20} color={colors.surface} />
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
      <NavigationBar />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: colors.surface,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  heading: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  audioStatus: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  chatList: {
    flex: 1,
    backgroundColor: colors.background,
  },
  chatListContent: {
    paddingBottom: 100, // Adjusted for NavigationBar height (~76px + safe area)
  },
  messageContainer: {
    marginVertical: 8,
  },
  message: {
    maxWidth: '70%',
    padding: 12,
    borderRadius: 12,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  botMessage: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: colors.secondary,
  },
  userText: {
    fontSize: 16,
    color: colors.surface,
    fontWeight: '500',
  },
  languageTag: {
    fontSize: 12,
    color: colors.surface,
    opacity: 0.7,
    fontWeight: '400',
  },
  botText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '400',
  },
  audioContainer: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  audioButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  playingAudioButton: {
    backgroundColor: colors.danger,
  },
  audioButtonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  inputContainer: {
    backgroundColor: colors.surface,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 16, // Additional margin to clear NavigationBar
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    borderRadius: 10,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
    minHeight: 48,
    maxHeight: 120,
    marginRight: 12,
  },
  sttButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  sttButton: {
    backgroundColor: colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileButton: {
    backgroundColor: colors.success,
  },
  recordingButton: {
    backgroundColor: colors.danger,
  },
  loadingButton: {
    backgroundColor: colors.textSecondary,
  },
  recordingIndicator: {
    backgroundColor: colors.danger + '10',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  recordingText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: colors.border,
    borderRadius: 10,
    alignItems: 'center',
  },
  activeButton: {
    backgroundColor: colors.primary,
  },
  disabledButton: {
    backgroundColor: colors.textSecondary,
    opacity: 0.6,
  },
  actionButtonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  userIdText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default Chatbot;