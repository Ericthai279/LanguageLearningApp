import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Feather from '@expo/vector-icons/Feather';
import ScreenWrapper from '../components/screenwraper';
import { NavigationBar } from '../components/NavigationBar';

// API base URL
const API_URL = ' https://a0010dacf68e.ngrok-free.app';

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

const Comment = () => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [userId, setUserId] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const navigation = useNavigation();
  const route = useRoute();
  const postId = route.params?.postId;

  useEffect(() => {
    const getUserData = async () => {
      try {
        const userJson = await AsyncStorage.getItem('user');
        if (userJson) {
          const userData = JSON.parse(userJson);
          console.log('Retrieved user data for comments:', userData);
          setUserId(userData.id);
          setToken(userData.token);
          axios.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
        } else {
          Alert.alert(
            'Authentication Required',
            'Please login to view or add comments',
            [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
          );
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        Alert.alert('Error', 'Failed to load user data. Please login again.');
        navigation.navigate('Login');
      } finally {
        setLoading(false);
      }
    };

    getUserData();
  }, [navigation]);

  useEffect(() => {
    if (userId && token && postId) {
      fetchComments();
    }
  }, [userId, token, postId]);

  const fetchComments = async () => {
    if (!postId) {
      Alert.alert('Error', 'No post selected.', [
        { text: 'OK', onPress: () => navigation.navigate('Posts') },
      ]);
      return;
    }
    try {
      console.log('Fetching comments for postId:', postId);
      console.log('Using token:', token);
      const response = await axios.get(`${API_URL}/comments/${postId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Request URL:', `${API_URL}/comments/${postId}`);
      console.log('Fetched comments:', response.data);
      setComments(response.data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
      console.log('Error details:', error.response?.data);
      if (error.response?.status === 404) {
        setComments([]); // No comments exist
        return;
      }
      let errorMessage = 'Failed to load comments. Please try again.';
      if (error.response?.status === 401) {
        errorMessage = 'Authentication failed. Please login again.';
        navigation.navigate('Login');
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }
      Alert.alert('Error', errorMessage);
    }
  };
  
  const handleAddComment = async () => {
    if (!userId || !token) {
      Alert.alert('Error', 'You must be logged in to add comments.');
      return;
    }
    if (!newComment.trim()) {
      Alert.alert('Error', 'Please enter a comment.');
      return;
    }
    setSubmitting(true);
    try {
      console.log('Adding comment for postId:', postId, 'userId:', userId);
      const response = await axios.post(
        `${API_URL}/comments`,
        {
          post_id: postId,
          user_id: userId,
          comment_text: newComment.trim(),
        },
        {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        }
      );
      console.log('Request URL:', `${API_URL}/comments`);
      console.log('Comment added:', response.data);
      setComments([response.data, ...comments]);
      setNewComment('');
      Alert.alert('Success', 'Comment added successfully!');
    } catch (error) {
      console.error('Error adding comment:', error);
      console.log('Error details:', error.response?.data);
      let errorMessage = 'Failed to add comment. Please try again.';
      if (error.response?.status === 404) {
        errorMessage = 'Post not found. Please select a valid post.';
        navigation.navigate('Posts');
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication failed. Please login again.';
        navigation.navigate('Login');
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }
      Alert.alert('Error', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const renderComment = ({ item }) => (
    <View style={styles.commentContainer}>
      <View style={styles.commentHeader}>
        <Text style={styles.commentUser}>User {item.user_id}</Text>
        <Text style={styles.commentDate}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      <Text style={styles.commentContent}>{item.comment_text}</Text>
    </View>
  );

  if (loading) {
    return (
      <ScreenWrapper bg={colors.background}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
        <NavigationBar />
      </ScreenWrapper>
    );
  }

  if (!userId || !postId) {
    return (
      <ScreenWrapper bg={colors.background}>
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={48} color={colors.danger} />
          <Text style={styles.errorText}>Authentication Required or No Post Selected</Text>
          <Text style={styles.errorSubtext}>
            {!userId ? 'Please login to view comments.' : 'Please select a post from the Posts screen.'}
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => navigation.navigate(userId ? 'Posts' : 'Login')}
          >
            <Text style={styles.loginButtonText}>{userId ? 'Go to Posts' : 'Go to Login'}</Text>
          </TouchableOpacity>
        </View>
        <NavigationBar />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper bg={colors.background}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Comments</Text>
          <Text style={styles.headerSubtitle}>Post ID: {postId}</Text>
        </View>

        <FlatList
          data={comments}
          renderItem={renderComment}
          keyExtractor={(item) => item.id.toString()}
          style={styles.commentList}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="message-square" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyStateText}>No comments yet.</Text>
              <Text style={styles.emptyStateSubText}>Be the first to comment!</Text>
            </View>
          }
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={newComment}
            onChangeText={setNewComment}
            placeholder="Add a comment..."
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleAddComment}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.surface} />
            ) : (
              <Feather name="send" size={20} color={colors.surface} />
            )}
            <Text style={styles.submitButtonText}>{submitting ? 'Submitting...' : 'Comment'}</Text>
          </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  loginButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '600',
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
  commentList: {
    flex: 1,
  },
  commentContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.secondary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  commentUser: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  commentDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  commentContent: {
    fontSize: 14,
    color: colors.text,
  },
  inputContainer: {
    backgroundColor: colors.surface,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
    minHeight: 48,
    maxHeight: 120,
    marginBottom: 12,
  },
  submitButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: colors.textSecondary,
  },
  submitButtonText: {
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

export default Comment;