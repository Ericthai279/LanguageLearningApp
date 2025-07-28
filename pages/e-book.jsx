import axios from "axios";
import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Alert, TouchableOpacity, SafeAreaView, StatusBar } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import ScreenWrapper from "../components/screenwraper";
import { NavigationBar } from "../components/NavigationBar";
import Feather from '@expo/vector-icons/Feather';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';

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
  const [fileUri, setFileUri] = useState(null);
  const navigation = useNavigation();
  const route = useRoute();
  const postId = route.params?.postId; // Safely access postId with optional chaining
  const API_BASE_URL = "https://404854cfd8c3.ngrok-free.app";
  const userId = 8; // Replace with actual user ID from auth context

  useEffect(() => {
    if (!postId) {
      Alert.alert('Error', 'No post selected. Please select a document from the Posts screen.', [
        { text: 'OK', onPress: () => navigation.navigate('Posts') },
      ]);
      return;
    }

    const fetchPostAndExtractText = async () => {
      try {
        // Fetch the specific post
        const res = await axios.get(`${API_BASE_URL}/posts/${postId}`);
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
        const url = `${API_BASE_URL}${post.media_url}`;
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;

        const downloadResumable = FileSystem.createDownloadResumable(
          url,
          fileUri,
          {},
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

        const response = await axios.post(`${API_BASE_URL}/document/extract`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        setExtractedText(response.data.text);
      } catch (err) {
        console.error('Error:', err);
        Alert.alert('Error', `Failed to process document: ${err.message}`, [
          { text: 'OK', onPress: () => navigation.navigate('Posts') },
        ]);
      }
    };

    fetchPostAndExtractText();

    return () => {
      if (currentSound) {
        currentSound.unloadAsync().catch(console.error);
      }
    };
  }, [postId, navigation]);

  const stopAudio = async () => {
    if (currentSound) {
      try {
        await currentSound.stopAsync();
        await currentSound.unloadAsync();
        setCurrentSound(null);
        setIsPlaying(false);
      } catch (error) {
        console.error('Error stopping audio:', error);
      }
    }
  };

  const handlePlayAudio = async (audioUrl) => {
    try {
      if (currentSound) {
        await stopAudio();
      }

      const fullUrl = `${API_BASE_URL}${audioUrl}`;
      console.log('Playing audio from:', fullUrl);
      setIsPlaying(true);
      const { sound } = await Audio.Sound.createAsync(
        { uri: fullUrl },
        { shouldPlay: true },
        (status) => {
          if (status.didJustFinish) {
            setIsPlaying(false);
            setCurrentSound(null);
          }
        }
      );
      setCurrentSound(sound);
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
      Alert.alert('Error', 'Failed to play audio.');
    }
  };

  const handleAIAction = async (action) => {
    try {
      if (!extractedText) {
        Alert.alert('Error', 'No text available for this action.');
        return;
      }

      if (action === 'stt') {
        Alert.alert('Error', 'STT is not applicable for document text. Please use an audio file.');
        return;
      }

      const response = await axios.post(`${API_BASE_URL}/chat`, {
        user_id: userId,
        text: extractedText,
        action,
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

  if (!postId) {
    return (
      <ScreenWrapper bg={colors.background}>
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
          <View style={styles.emptyState}>
            <Feather name="alert-circle" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyStateText}>No Post Selected</Text>
            <Text style={styles.emptyStateSubText}>Please select a document from the Posts screen.</Text>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.navigate('Posts')}
              activeOpacity={0.8}
            >
              <Feather name="arrow-left" size={20} color={colors.surface} />
              <Text style={styles.backButtonText}>Go to Posts</Text>
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
                    onPress={() => handleAIAction('tts')}
                    activeOpacity={0.8}
                  >
                    <Feather name="volume-2" size={16} color={colors.surface} />
                    <Text style={styles.actionButtonText}>TTS</Text>
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
                      onPress={stopAudio}
                      activeOpacity={0.8}
                    >
                      <Feather name="pause" size={16} color={colors.surface} />
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