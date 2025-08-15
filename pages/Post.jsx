import axios from "axios";
import React, { useEffect, useState } from "react";
import { View, Text, Image, ScrollView, StyleSheet, Alert, TouchableOpacity, SafeAreaView, StatusBar, RefreshControl } from "react-native";
import { useNavigation } from "@react-navigation/native";
import ScreenWrapper from "../components/screenwraper";
import { NavigationBar } from "../components/NavigationBar";
import Feather from '@expo/vector-icons/Feather';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

// Local asset references
const PDF_ICON = require('../assets/icons/pdf-icon.png');
const DOCX_ICON = require('../assets/icons/docx-icon.png');

const Posts = () => {
  const [posts, setPosts] = useState([]);
  const [translatedTexts, setTranslatedTexts] = useState({});
  const [transcriptions, setTranscriptions] = useState({});
  const [fileUris, setFileUris] = useState({});
  const [currentSound, setCurrentSound] = useState(null);
  const [playingPostId, setPlayingPostId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [token, setToken] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();
  const API_URL = "http://192.168.31.228:8000";

  useEffect(() => {
    const getUserData = async () => {
      try {
        const userJson = await AsyncStorage.getItem('user');
        if (userJson) {
          const userData = JSON.parse(userJson);
          console.log('Retrieved user data for posts:', userData);
          setUserId(userData.id);
          setToken(userData.token);
          axios.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
        } else {
          Alert.alert(
            'Authentication Required',
            'Please login to view posts',
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

  const fetchAllPosts = async () => {
    if (!userId || !token) return;
    try {
      setRefreshing(true);
      const res = await axios.get(`${API_URL}/posts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPosts(res.data);
    } catch (err) {
      console.error('Error fetching posts:', err);
      Alert.alert('Error', 'Failed to load posts. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (userId && token) {
      fetchAllPosts();
    }

    return () => {
      if (currentSound) {
        currentSound.unloadAsync().catch(console.error);
      }
    };
  }, [userId, token]);

  const onRefresh = async () => {
    await fetchAllPosts();
  };

  const handleDownload = async (post) => {
    if (!post.media_url) {
      Alert.alert('Error', 'No file available to download.');
      return;
    }

    if (!userId || !token) {
      Alert.alert('Error', 'You must be logged in to download files.');
      return;
    }

    try {
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
    if (!userId || !token) {
      Alert.alert('Error', 'You must be logged in to delete posts.');
      return;
    }

    Alert.alert("Confirm Delete", "Are you sure you want to delete this post?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await axios.delete(`${API_URL}/posts/${id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
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

  const stopAudio = async () => {
    if (currentSound) {
      try {
        await currentSound.stopAsync();
        await currentSound.unloadAsync();
        setCurrentSound(null);
        setPlayingPostId(null);
      } catch (error) {
        console.error('Error stopping audio:', error);
      }
    }
  };

  const handlePlayAudio = async (audioUrl, postId) => {
    if (!userId || !token) {
      Alert.alert('Error', 'You must be logged in to play audio.');
      return;
    }

    try {
      if (currentSound) {
        await currentSound.stopAsync();
        await currentSound.unloadAsync();
        setCurrentSound(null);
        setPlayingPostId(null);
      }
      if (playingPostId === postId) return;
      const fullUrl = `${API_URL}${audioUrl}`;
      console.log('Playing audio from:', fullUrl);
      setPlayingPostId(postId);
      const { sound } = await Audio.Sound.createAsync(
        { uri: fullUrl },
        { shouldPlay: true },
        (status) => {
          if (status.didJustFinish) {
            setPlayingPostId(null);
            setCurrentSound(null);
          }
        }
      );
      setCurrentSound(sound);
    } catch (error) {
      console.error('Error playing audio:', error);
      setPlayingPostId(null);
      Alert.alert('Error', 'Failed to play audio.');
    }
  };

  const handleAIAction = async (postId, action) => {
    if (!userId || !token) {
      Alert.alert('Error', 'You must be logged in to perform this action.');
      return;
    }

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
        const fileUri = fileUris[postId];
        if (!fileUri) {
          Alert.alert('Error', 'Please download the audio file first.');
          return;
        }
        const formData = new FormData();
        formData.append('audio_file', {
          uri: fileUri,
          name: post.media_url.split('/').pop(),
          type: 'audio/wav',
        });
        formData.append('user_id', userId.toString());
        const response = await axios.post(`${API_URL}/speech-to-text`, formData, {
          headers: { 
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
          },
        });
        const transcription = response.data.response;
        setTranscriptions(prev => ({ ...prev, [postId]: transcription }));
        Alert.alert('Transcription Result', transcription);
      } else {
        const response = await axios.post(`${API_URL}/chat`, {
          user_id: userId,
          text,
          action,
        }, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (action === 'tts') {
          const audioUrl = response.data.audio_path;
          handlePlayAudio(audioUrl, postId);
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

  const getImageSource = (mediaUrl) => {
    if (!mediaUrl) return null;
    if (mediaUrl.endsWith('.pdf')) return PDF_ICON;
    if (mediaUrl.endsWith('.docx')) return DOCX_ICON;
    return { uri: `${API_URL}${mediaUrl}` };
  };

  const handleViewEbook = (postId) => {
    const post = posts.find(p => p.id === postId);
    console.log('Navigating to Ebook with postId:', postId); // Debug log
    if (!post || !post.media_url || !['.pdf', '.docx'].some(ext => post.media_url.endsWith(ext))) {
      Alert.alert('Error', 'This post does not contain a readable document (PDF or DOCX).');
      return;
    }
    navigation.navigate('Ebook', { postId });
  };

  const handleViewComments = (postId) => {
    console.log('Navigating to Comment with postId:', postId);
    navigation.navigate('Comment', { postId });
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

  if (!userId) {
    return (
      <ScreenWrapper bg={colors.background}>
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
          <View style={styles.emptyState}>
            <Feather name="alert-circle" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyStateText}>Authentication Required</Text>
            <Text style={styles.emptyStateSubText}>Please login to view posts.</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.8}
            >
              <Feather name="log-in" size={20} color={colors.surface} />
              <Text style={styles.addButtonText}>Go to Login</Text>
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
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary, colors.secondary]}
            />
          }
        >
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
              posts.map((post) => {
                const isPlaying = playingPostId === post.id;
                return (
                  <View key={post.id} style={styles.postCard}>
                    {post.media_url && (
                      <TouchableOpacity onPress={() => handleDownload(post)} activeOpacity={0.8}>
                        <Image
                          source={getImageSource(post.media_url)}
                          style={styles.postImage}
                          defaultSource={PDF_ICON}
                        />
                      </TouchableOpacity>
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
                        <TouchableOpacity
                          style={[styles.actionButton, styles.commentButton]}
                          onPress={() => handleViewComments(post.id)}
                          activeOpacity={0.8}
                        >
                          <Feather name="message-circle" size={16} color={colors.surface} />
                          <Text style={styles.actionButtonText}>Comment</Text>
                        </TouchableOpacity>
                        {post.media_url && (
                          <TouchableOpacity
                            style={[styles.actionButton, styles.shareButton]}
                            onPress={() => handleShare(post.id)}
                            activeOpacity={0.8}
                          >
                            <Feather name="share-2" size={16} color={colors.surface} />
                            <Text style={styles.actionButtonText}>Share</Text>
                          </TouchableOpacity>
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
                              onPress={() => handleAIAction(post.id, 'stt')}
                              activeOpacity={0.8}
                            >
                              <Feather name="mic" size={16} color={colors.surface} />
                              <Text style={styles.actionButtonText}>STT</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.actionButton, styles.playButton, isPlaying && styles.playingButton]}
                              onPress={() => isPlaying ? stopAudio() : handlePlayAudio(post.media_url, post.id)}
                              activeOpacity={0.8}
                            >
                              <Feather name={isPlaying ? "pause" : "play-circle"} size={16} color={colors.surface} />
                              <Text style={styles.actionButtonText}>{isPlaying ? "Stop Audio" : "Play Audio"}</Text>
                            </TouchableOpacity>
                          </>
                        )}
                        {post.media_url && ['.pdf', '.docx'].some(ext => post.media_url.endsWith(ext)) && (
                          <TouchableOpacity
                            style={[styles.actionButton, styles.ebookButton]}
                            onPress={() => handleViewEbook(post.id)}
                            activeOpacity={0.8}
                          >
                            <Feather name="book-open" size={16} color={colors.surface} />
                            <Text style={styles.actionButtonText}>View E-Book</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })
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
    resizeMode: 'contain',
    backgroundColor: '#F5F5F5',
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
  commentButton: {
    backgroundColor: colors.secondary,
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
  playingButton: {
    backgroundColor: colors.danger,
  },
  ebookButton: {
    backgroundColor: colors.success,
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