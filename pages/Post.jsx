import axios from "axios";
import React, { useEffect, useState } from "react";
import { View, Text, Image, ScrollView, StyleSheet, Alert, TouchableOpacity, SafeAreaView, StatusBar } from "react-native";
import { useNavigation } from "@react-navigation/native";
import ScreenWrapper from "../components/screenwraper";
import { NavigationBar } from "../components/NavigationBar";
import Feather from '@expo/vector-icons/Feather';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import * as Sharing from 'expo-sharing';

// Define colors for consistent theming
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

const Posts = () => {
  const [posts, setPosts] = useState([]);
  const [translatedTexts, setTranslatedTexts] = useState({});
  const [transcriptions, setTranscriptions] = useState({});
  const [fileUris, setFileUris] = useState({}); // Store file URIs for sharing
  const navigation = useNavigation();
  const API_BASE_URL = "https://3aac7e2c3fce.ngrok-free.app";
  const userId = 8; // Replace with actual user ID from auth context

  useEffect(() => {
    const fetchAllPosts = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/posts`);
        setPosts(res.data);
      } catch (err) {
        console.error('Error fetching posts:', err);
        Alert.alert('Error', 'Failed to load posts. Please try again.');
      }
    };
    fetchAllPosts();
  }, []);

  const handleDownload = async (post) => {
    if (!post.media_url) {
      Alert.alert('Error', 'No file available to download.');
      return;
    }

    try {
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

      // Save the file URI for sharing
      setFileUris(prev => ({ ...prev, [post.id]: uri }));

      Alert.alert('Success', `File downloaded to: ${uri}`);
    } catch (err) {
      console.error('Download error:', err);
      Alert.alert('Error', `Failed to download file: ${err.message}`);
    }
  };

  const handleShare = async (postId) => {
    const fileUri = fileUris[postId];
    if (!fileUri) {
      Alert.alert('Error', 'File not downloaded yet. Please download the file first.');
      return;
    }

    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Error', 'Sharing is not available on this device.');
      }
    } catch (err) {
      console.error('Share error:', err);
      Alert.alert('Error', `Failed to share file: ${err.message}`);
    }
  };

  const handleDelete = async (id) => {
    Alert.alert("Confirm Delete", "Are you sure you want to delete this post?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await axios.delete(`${API_BASE_URL}/posts/${id}`);
            setPosts(posts.filter((post) => post.id !== id));
            Alert.alert('Success', 'Post deleted successfully.');
          } catch (err) {
            console.error('Error deleting post:', err);
            Alert.alert('Error', 'Failed to delete post. Please try again.');
          }
        },
      },
    ]);
  };

  const playAudio = async (url) => {
    try {
      const soundObject = new Audio.Sound();
      await soundObject.loadAsync({ uri: `${API_BASE_URL}${url}` });
      await soundObject.playAsync();
    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert('Error', 'Failed to play audio.');
    }
  };

  const handleAIAction = async (postId, action) => {
    try {
      const post = posts.find(p => p.id === postId);
      if (!post) {
        Alert.alert('Error', 'Post not found.');
        return;
      }

      if (action === 'stt' && (!post.media_url || !post.media_url.endsWith('.wav'))) {
        Alert.alert('Error', 'STT requires an uploaded audio file (.wav).');
        return;
      }

      const text = action === 'stt' ? '[Audio file]' : post.description || post.title || '';
      if (!text && action !== 'stt') {
        Alert.alert('Error', 'No text content available for this action.');
        return;
      }

      if (action === 'stt') {
        const response = await axios.post(`${API_BASE_URL}/posts/${postId}/stt`);
        const transcription = response.data.response;
        setTranscriptions(prev => ({ ...prev, [postId]: transcription }));
        Alert.alert('Transcription Result', transcription);
      } else {
        const response = await axios.post(`${API_BASE_URL}/chat`, {
          user_id: userId,
          text,
          action,
        });

        if (action === 'tts') {
          const audioUrl = `${API_BASE_URL}${response.data.audio_path}`;
          playAudio(audioUrl);
          Alert.alert('Success', 'Audio is playing.');
        } else if (action === 'translate') {
          setTranslatedTexts(prev => ({ ...prev, [postId]: response.data.response }));
        } else if (action === 'grammar') {
          Alert.alert('Grammar Check Result', response.data.response);
        }
      }
    } catch (err) {
      console.error(`Error processing ${action}:`, err);
      Alert.alert('Error', `Failed to process ${action}: ${err.response?.data?.detail || err.message}`);
    }
  };

  return (
    <ScreenWrapper bg={colors.background}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>All Posts</Text>
            <Text style={styles.headerSubtitle}>Browse community content</Text>
          </View>

          <View style={styles.postsContainer}>
            {posts.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="file-text" size={48} color={colors.textSecondary} />
                <Text style={styles.emptyStateText}>No posts yet.</Text>
                <Text style={styles.emptyStateSubText}>Be the first to share something!</Text>
              </View>
            ) : (
              posts.map((post) => (
                <View key={post.id} style={styles.postCard}>
                  {post.media_url && (
                    <Image source={{ uri: `${API_BASE_URL}${post.media_url}` }} style={styles.postImage} />
                  )}
                  <View style={styles.postContent}>
                    <Text style={styles.postTitle}>{post.title}</Text>
                    <Text style={styles.postDescription}>{post.description}</Text>
                    {transcriptions[post.id] && (
                      <View style={styles.transcriptionContainer}>
                        <Text style={styles.transcriptionTitle}>Transcription:</Text>
                        <Text style={styles.transcriptionText}>{transcriptions[post.id]}</Text>
                      </View>
                    )}
                    {translatedTexts[post.id] && (
                      <View style={styles.translatedContainer}>
                        <Text style={styles.translatedTitle}>Translated Text:</Text>
                        <Text style={styles.translatedText}>{translatedTexts[post.id]}</Text>
                      </View>
                    )}
                    <Text style={styles.postUser}>By User {post.user_id}</Text>
                    <View style={styles.buttonContainer}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={() => handleDelete(post.id)}
                        activeOpacity={0.8}
                      >
                        <Feather name="trash-2" size={16} color={colors.surface} />
                        <Text style={styles.actionButtonText}>Delete</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.updateButton]}
                        onPress={() => navigation.navigate("UpdatePost", { postId: post.id })}
                        activeOpacity={0.8}
                      >
                        <Feather name="edit-3" size={16} color={colors.surface} />
                        <Text style={styles.actionButtonText}>Update</Text>
                      </TouchableOpacity>
                      {post.media_url && (
                        <>
                          <TouchableOpacity
                            style={[styles.actionButton, styles.downloadButton]}
                            onPress={() => handleDownload(post)}
                            activeOpacity={0.8}
                          >
                            <Feather name="download" size={16} color={colors.surface} />
                            <Text style={styles.actionButtonText}>Download</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionButton, styles.shareButton]}
                            onPress={() => handleShare(post.id)}
                            activeOpacity={0.8}
                          >
                            <Feather name="share-2" size={16} color={colors.surface} />
                            <Text style={styles.actionButtonText}>Share</Text>
                          </TouchableOpacity>
                        </>
                      )}
                      <TouchableOpacity
                        style={[styles.actionButton, styles.aiButton]}
                        onPress={() => handleAIAction(post.id, 'translate')}
                        activeOpacity={0.8}
                      >
                        <Feather name="globe" size={16} color={colors.surface} />
                        <Text style={styles.actionButtonText}>Translate</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.aiButton]}
                        onPress={() => handleAIAction(post.id, 'tts')}
                        activeOpacity={0.8}
                      >
                        <Feather name="volume-2" size={16} color={colors.surface} />
                        <Text style={styles.actionButtonText}>TTS</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.aiButton]}
                        onPress={() => handleAIAction(post.id, 'grammar')}
                        activeOpacity={0.8}
                      >
                        <Feather name="check-circle" size={16} color={colors.surface} />
                        <Text style={styles.actionButtonText}>Grammar</Text>
                      </TouchableOpacity>
                      {post.media_url && post.media_url.endsWith('.wav') && (
                        <>
                          <TouchableOpacity
                            style={[styles.actionButton, styles.aiButton]}
                            onPress={() => handleAIAction(post.id, 'st Subsequentlyt')}
                            activeOpacity={0.8}
                          >
                            <Feather name="mic" size={16} color={colors.surface} />
                            <Text style={styles.actionButtonText}>STT</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionButton, styles.playButton]}
                            onPress={() => playAudio(post.media_url)}
                            activeOpacity={0.8}
                          >
                            <Feather name="play-circle" size={16} color={colors.surface} />
                            <Text style={styles.actionButtonText}>Play Audio</Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate("AddPost")}
            activeOpacity={0.8}
          >
            <Feather name="plus-circle" size={20} color={colors.surface} />
            <Text style={styles.addButtonText}>Add New Post</Text>
          </TouchableOpacity>
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
  postsContainer: {
    gap: 12,
    paddingBottom: 100,
  },
  postCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    overflow: 'hidden',
  },
  postImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  postContent: {
    padding: 16,
  },
  postTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  postDescription: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
  },
  postUser: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  transcriptionContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#e6f7ff',
    borderRadius: 5,
  },
  transcriptionTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  transcriptionText: {
    fontSize: 14,
  },
  translatedContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
  },
  translatedTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  translatedText: {
    fontSize: 14,
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    minWidth: '22%',
  },
  deleteButton: {
    backgroundColor: colors.danger,
  },
  updateButton: {
    backgroundColor: colors.warning,
  },
  downloadButton: {
    backgroundColor: colors.success,
  },
  shareButton: {
    backgroundColor: colors.secondary,
  },
  aiButton: {
    backgroundColor: colors.secondary,
  },
  playButton: {
    backgroundColor: colors.primary,
  },
  actionButtonText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: colors.success,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 5,
    gap: 8,
  },
  addButtonText: {
    color: colors.surface,
    fontSize: 16,
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
});

export default Posts;