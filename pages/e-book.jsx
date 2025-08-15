import axios from "axios";
import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Alert, TouchableOpacity, SafeAreaView, StatusBar } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import ScreenWrapper from "../components/screenwraper";
import { NavigationBar } from "../components/NavigationBar";
import Feather from '@expo/vector-icons/Feather';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define colors for consistent theming (matching Posts.jsx)
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

const Ebook = () => {
  const [extractedText, setExtractedText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [transcription, setTranscription] = useState("");
  const [currentSound, setCurrentSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [fileUri, setFileUri] = useState(null);
  const [userId, setUserId] = useState(null);
  const [token, setToken] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const navigation = useNavigation();
  const route = useRoute();
  const postId = route.params?.postId; // Safely access postId with optional chaining
  const API_URL = "http://192.168.31.228:8000";

  useEffect(() => {
    const getUserData = async () => {
      try {
        const userJson = await AsyncStorage.getItem('user');
        if (userJson) {
          const userData = JSON.parse(userJson);
          console.log('Retrieved user data for ebook:', userData);
          setUserId(userData.id);
          setToken(userData.token);
        } else {
          Alert.alert(
            'Authentication Required',
            'Please login to view documents',
            [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
          );
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        Alert.alert('Error', 'Failed to load user data. Please login again.');
        navigation.navigate('Login');
      } finally {
        setUserLoading(false);
      }
    };

    getUserData();
  }, [navigation]);

  useEffect(() => {
    if (!postId || !userId || !token) {
      if (!postId) {
        Alert.alert('Error', 'No post selected. Please select a document from the Posts screen.', [
          { text: 'OK', onPress: () => navigation.navigate('Posts') },
        ]);
      }
      return;
    }

    const fetchPostAndExtractText = async () => {
      try {
        // Fetch the specific post
        const res = await axios.get(`${API_URL}/posts/${postId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const post = res.data;

        // Check if post has a supported document file
        if (!post.media_url || !['.pdf', '.docx'].some(ext => post.media_url.endsWith(ext))) {
          Alert.alert('Error', 'Post does not contain a supported document file (PDF or DOCX).', [
            { text: 'OK', onPress: () => navigation.navigate('Posts') },
          ]);
          return;
        }

        // Download the file
        const fileName = post.media_url.split('/').pop();
        const url = `${API_URL}${post.media_url}`;
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;

        const downloadResumable = FileSystem.createDownloadResumable(
          url,
          fileUri,
          { headers: { Authorization: `Bearer ${token}` } },
          (downloadProgress) => {
            const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
            console.log(`Download progress: ${progress * 100}%`);
          }
        );

        const { uri } = await downloadResumable.downloadAsync();
        console.log('Finished downloading to ', uri);
        setFileUri(uri);

        // Extract text from the document
        const formData = new FormData();
        formData.append('file', {
          uri: uri,
          name: fileName,
          type: post.media_url.endsWith('.pdf') ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });

        const response = await axios.post(`${API_URL}/document/extract`, formData, {
          headers: { 
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
          },
        });

        setExtractedText(response.data.text);
      } catch (err) {
        console.error('Error:', err);
        Alert.alert('Error', `Failed to process document: ${err.message}`, [
          { text: 'OK', onPress: () => navigation.navigate('Posts') },
        ]);
      }
    };

    if (userId && token) {
      fetchPostAndExtractText();
    }

    return () => {
      if (currentSound) {
        currentSound.unloadAsync().catch(console.error);
      }
    };
  }, [postId, userId, token, navigation]);

  const stopAudio = async () => {
    if (currentSound) {
      try {
        await currentSound.stopAsync();
        await currentSound.unloadAsync();
        setCurrentSound(null);
        setIsPlaying(false);
        setIsPaused(false);
      } catch (error) {
        console.error('Error stopping audio:', error);
      }
    }
  };

  const handlePlayAudio = async (audioUrl) => {
    try {
      if (currentSound && isPaused) {
        // Resume paused audio
        await currentSound.playAsync();
        setIsPlaying(true);
        setIsPaused(false);
        return;
      }

      if (currentSound) {
        // Stop and unload current audio if playing
        await stopAudio();
      }

      const fullUrl = `${API_URL}${audioUrl}`;
      console.log('Playing audio from:', fullUrl);
      setIsPlaying(true);
      setIsPaused(false);
      const { sound } = await Audio.Sound.createAsync(
        { uri: fullUrl },
        { shouldPlay: true },
        (status) => {
          if (status.didJustFinish) {
            setIsPlaying(false);
            setIsPaused(false);
            setCurrentSound(null);
          }
        }
      );
      setCurrentSound(sound);
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
      setIsPaused(false);
      Alert.alert('Error', 'Failed to play audio.');
    }
  };

  const handlePauseAudio = async () => {
    if (currentSound && isPlaying) {
      try {
        await currentSound.pauseAsync();
        setIsPlaying(false);
        setIsPaused(true);
      } catch (error) {
        console.error('Error pausing audio:', error);
        Alert.alert('Error', 'Failed to pause audio.');
      }
    }
  };

  const handleAIAction = async (action) => {
    try {
      if (!extractedText) {
        Alert.alert('Error', 'No text available for this action.');
        return;
      }

      if (!userId || !token) {
        Alert.alert('Error', 'You must be logged in to perform this action.');
        return;
      }

      if (action === 'stt') {
        Alert.alert('Error', 'STT is not applicable for document text. Please use an audio file.');
        return;
      }

      const response = await axios.post(`${API_URL}/chat`, {
        user_id: userId,
        text: extractedText,
        action,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (action === 'tts') {
        const audioUrl = response.data.audio_path;
        handlePlayAudio(audioUrl);
        Alert.alert('Success', 'Audio is playing.');
      } else if (action === 'translate') {
        setTranslatedText(response.data.response);
      } else if (action === 'grammar') {
        Alert.alert('Grammar Check Result', response.data.response);
      }
    } catch (err) {
      console.error(`Error processing ${action}:`, err);
      Alert.alert('Error', `Failed to process ${action}: ${err.response?.data?.detail || err.message}`);
    }
  };

  if (userLoading) {
    return (
      <ScreenWrapper bg={colors.background}>
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
          <View style={styles.emptyState}>
            <Feather name="loader" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyStateText}>Loading user data...</Text>
          </View>
        </SafeAreaView>
        <NavigationBar />
      </ScreenWrapper>
    );
  }

  if (!userId || !postId) {
    return (
      <ScreenWrapper bg={colors.background}>
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
          <View style={styles.emptyState}>
            <Feather name="alert-circle" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyStateText}>No Post Selected or Not Logged In</Text>
            <Text style={styles.emptyStateSubText}>
              {!userId ? 'Please login to view documents.' : 'Please select a document from the Posts screen.'}
            </Text>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.navigate(userId ? 'Posts' : 'Login')}
              activeOpacity={0.8}
            >
              <Feather name="arrow-left" size={20} color={colors.surface} />
              <Text style={styles.backButtonText}>{userId ? 'Go to Posts' : 'Go to Login'}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
        <NavigationBar />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper bg={colors.background}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>E-Book Viewer</Text>
            <Text style={styles.headerSubtitle}>Extracted Document Content</Text>
          </View>

          <View style={styles.contentContainer}>
            {extractedText ? (
              <View style={styles.textContainer}>
                <Text style={styles.sectionTitle}>Extracted Text:</Text>
                <Text style={styles.extractedText}>{extractedText}</Text>
                {translatedText && (
                  <View style={styles.translatedContainer}>
                    <Text style={styles.sectionTitle}>Translated Text:</Text>
                    <Text style={styles.translatedText}>{translatedText}</Text>
                  </View>
                )}
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.aiButton]}
                    onPress={() => handleAIAction('translate')}
                    activeOpacity={0.8}
                  >
                    <Feather name="globe" size={16} color={colors.surface} />
                    <Text style={styles.actionButtonText}>Translate</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.aiButton]}
                    onPress={() => isPaused ? handlePlayAudio(null) : handleAIAction('tts')}
                    activeOpacity={0.8}
                  >
                    <Feather name={isPaused ? "play-circle" : "volume-2"} size={16} color={colors.surface} />
                    <Text style={styles.actionButtonText}>{isPaused ? "Resume" : "TTS"}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.aiButton]}
                    onPress={() => handleAIAction('grammar')}
                    activeOpacity={0.8}
                  >
                    <Feather name="check-circle" size={16} color={colors.surface} />
                    <Text style={styles.actionButtonText}>Grammar</Text>
                  </TouchableOpacity>
                  {isPlaying && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.playingButton]}
                      onPress={handlePauseAudio}
                      activeOpacity={0.8}
                    >
                      <Feather name="pause" size={16} color={colors.surface} />
                      <Text style={styles.actionButtonText}>Pause Audio</Text>
                    </TouchableOpacity>
                  )}
                  {(isPlaying || isPaused) && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.stopButton]}
                      onPress={stopAudio}
                      activeOpacity={0.8}
                    >
                      <Feather name="stop-circle" size={16} color={colors.surface} />
                      <Text style={styles.actionButtonText}>Stop Audio</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Feather name="file-text" size={48} color={colors.textSecondary} />
                <Text style={styles.emptyStateText}>Loading document...</Text>
                <Text style={styles.emptyStateSubText}>Please wait while we extract the text.</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
      <NavigationBar />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    backgroundColor: colors.surface,
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  textContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  extractedText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 12,
  },
  translatedContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
  },
  translatedText: {
    fontSize: 14,
    color: colors.text,
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    minWidth: '30%',
  },
  aiButton: {
    backgroundColor: colors.secondary,
  },
  playingButton: {
    backgroundColor: colors.danger,
  },
  stopButton: {
    backgroundColor: colors.danger,
  },
  actionButtonText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  backButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 8,
  },
  backButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default Ebook;