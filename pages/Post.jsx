import axios from "axios";
import React, { useEffect, useState } from "react";
import { View, Text, Image, ScrollView, StyleSheet, Alert, TouchableOpacity, SafeAreaView, StatusBar, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import ScreenWrapper from "../components/screenwraper";
import { NavigationBar } from "../components/NavigationBar";
import Feather from '@expo/vector-icons/Feather';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import { Audio } from 'expo-av';

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
  const [sound, setSound] = useState(null);
  const [playingPostId, setPlayingPostId] = useState(null);
  const navigation = useNavigation();
  const API_BASE_URL = "https://3aac7e2c3fce.ngrok-free.app";
  const userId = 8; // Replace with actual user ID from auth context

  useEffect(() => {
    console.log('FileSystem:', FileSystem);
    console.log('downloadAsync:', FileSystem.downloadAsync);
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

    // Cleanup sound on unmount
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const requestMediaLibraryPermission = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      return status === 'granted';
    } catch (err) {
      console.warn('Permission error:', err);
      return false;
    }
  };

  const handleDownload = async (post) => {
    if (!post.media_url) {
      Alert.alert('Error', 'No file available to download.');
      return;
    }

    const hasPermission = await requestMediaLibraryPermission();
    if (!hasPermission) {
      Alert.alert('Error', 'Media library permission denied.');
      return;
    }

    try {
      const fileName = post.media_url.split('/').pop();
      const tempFileUri = `${FileSystem.cacheDirectory}${fileName}`;
      const url = `${API_BASE_URL}${post.media_url}`;

      console.log('Downloading from:', url, 'to:', tempFileUri);
      console.log('downloadAsync args:', { url, tempFileUri });

      let uri;
      try {
        const downloadResult = await FileSystem.downloadAsync(url, tempFileUri);
        uri = downloadResult.uri;
      } catch (err) {
        console.warn('downloadAsync failed, falling back to fetch:', err);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        const blob = await response.text();
        await FileSystem.writeAsync(tempFileUri, blob, { encoding: FileSystem.EncodingType.Binary });
        uri = tempFileUri;
      }

      if (!uri) {
        throw new Error('Download failed: No URI returned');
      }

      const asset = await MediaLibrary.createAssetAsync(uri);
      await MediaLibrary.createAlbumAsync('MyAppDownloads', asset, false);

      if (Platform.OS === 'android') {
        const mimeType = post.media_url.endsWith('.docx')
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : post.media_url.endsWith('.wav')
            ? 'audio/wav'
            : 'image/*';
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: asset.uri,
          type: mimeType,
          flags: 1,
        });
      } else if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      }

      Alert.alert('Success', `File saved to media library: ${asset.filename}`);
    } catch (err) {
      console.error('Download error:', err);
      Alert.alert('Error', `Failed to download file: ${err.message}`);
    }
  };

  const handlePlayAudio = async (post) => {
    if (!post.media_url || !post.media_url.endsWith('.wav')) {
      Alert.alert('Error', 'Only WAV audio files can be played.');
      return;
    }

    try {
      const fileName = post.media_url.split('/').pop();
      const tempFileUri = `${FileSystem.cacheDirectory}${fileName}`;
      const url = `${API_BASE_URL}${post.media_url}`;

      // Download the file if not already cached
      let uri = tempFileUri;
      const fileInfo = await FileSystem.getInfoAsync(tempFileUri);
      if (!fileInfo.exists) {
        console.log('Downloading audio:', url, 'to:', tempFileUri);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        const blob = await response.text();
        await FileSystem.writeAsync(tempFileUri, blob, { encoding: FileSystem.EncodingType.Binary });
      }

      if (sound && playingPostId === post.id) {
        if (sound._loaded) {
          const status = await sound.getStatusAsync();
          if (status.isPlaying) {
            await sound.pauseAsync();
            setPlayingPostId(null);
          } else {
            await sound.playAsync();
            setPlayingPostId(post.id);
          }
        }
        return;
      }

      // Unload previous sound if playing a different post
      if (sound) {
        await sound.unloadAsync();
      }

      console.log('Loading audio:', uri);
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true }
      );
      setSound(newSound);
      setPlayingPostId(post.id);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setPlayingPostId(null);
        }
      });
    } catch (error) {
      console.error('Audio playback error:', error);
      Alert.alert('Error', 'Failed to play audio: ' + error.message);
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
            if (sound && playingPostId === id) {
              await sound.unloadAsync();
              setSound(null);
              setPlayingPostId(null);
            }
            Alert.alert('Success', 'Post deleted successfully.');
          } catch (err) {
            console.error('Error deleting post:', err);
            Alert.alert('Error', 'Failed to delete post. Please try again.');
          }
        },
      },
    ]);
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

      let text = '';
      let formData;

      if (action === 'stt') {
        // Download the file for STT
        const fileName = post.media_url.split('/').pop();
        const tempFileUri = `${FileSystem.cacheDirectory}${fileName}`;
        const url = `${API_BASE_URL}${post.media_url}`;
        const fileInfo = await FileSystem.getInfoAsync(tempFileUri);

        if (!fileInfo.exists) {
          console.log('Downloading for STT:', url, 'to:', tempFileUri);
          const response = await fetch(url);
          if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
          const blob = await response.text();
          await FileSystem.writeAsync(tempFileUri, blob, { encoding: FileSystem.EncodingType.Binary });
        }

        formData = new FormData();
        formData.append('user_id', userId);
        formData.append('audio_file', {
          uri: tempFileUri,
          type: 'audio/wav',
          name: fileName,
        });
      } else {
        text = post.description || post.title || '';
        if (!text) {
          Alert.alert('Error', 'No text content available for this action.');
          return;
        }
      }

      console.log('AI Action:', { postId, action, text: action === 'stt' ? '[Audio file]' : text });

      if (action === 'stt') {
        const response = await axios.post(`${API_BASE_URL}/speech-to-text`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        Alert.alert('Transcription Result', response.data.response);
      } else {
        const response = await axios.post(`${API_BASE_URL}/chat`, {
          user_id: userId,
          text,
          action,
        });

        if (action === 'tts') {
          Alert.alert('Success', 'Audio generated successfully.', [
            {
              text: 'Play Audio',
              onPress: () => {
                Alert.alert('Info', `Audio available at: ${response.data.audio_path}`);
              },
            },
            { text: 'OK' },
          ]);
        } else {
          Alert.alert(`${action.charAt(0).toUpperCase() + action.slice(1)} Result`, response.data.response);
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
          {/* Header Section */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>All Posts</Text>
            <Text style={styles.headerSubtitle}>Browse community content</Text>
          </View>

          {/* Posts List */}
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
                        <TouchableOpacity
                          style={[styles.actionButton, styles.downloadButton]}
                          onPress={() => handleDownload(post)}
                          activeOpacity={0.8}
                        >
                          <Feather name="download" size={16} color={colors.surface} />
                          <Text style={styles.actionButtonText}>Download</Text>
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
                            style={[styles.actionButton, styles.aiFileButton]}
                            onPress={() => handleAIAction(post.id, 'stt')}
                            activeOpacity={0.8}
                          >
                            <Feather name="cpu" size={16} color={colors.surface} />
                            <Text style={styles.actionButtonText}>AI File</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionButton, styles.playButton, playingPostId === post.id && styles.playButtonActive]}
                            onPress={() => handlePlayAudio(post)}
                            activeOpacity={0.8}
                          >
                            <Feather name={playingPostId === post.id && sound?._loaded && (sound._lastStatusUpdate?.isPlaying || false) ? 'pause' : 'play'} size={16} color={colors.surface} />
                            <Text style={styles.actionButtonText}>{playingPostId === post.id && sound?._loaded && (sound._lastStatusUpdate?.isPlaying || false) ? 'Pause' : 'Play'}</Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Add New Post Button */}
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
  aiButton: {
    backgroundColor: colors.secondary,
  },
  aiFileButton: {
    backgroundColor: colors.secondary,
  },
  playButton: {
    backgroundColor: colors.success,
  },
  playButtonActive: {
    backgroundColor: colors.warning,
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