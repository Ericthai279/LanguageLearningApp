import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import Feather from '@expo/vector-icons/Feather';
import { NavigationBar } from '../components/NavigationBar';
import ScreenWrapper from '../components/screenwraper';
// API URL - update this to match your backend
const API_URL = 'http://192.168.204.119:8000';

// Define colors for consistent theming
const colors = {
  primary: '#007AFF',
  success: '#34C759',
  danger: '#FF3B30',
  background: '#F2F2F7',
  surface: '#FFFFFF',
  text: '#1C1C1E',
  textSecondary: '#8E8E93',
  border: '#C6C6C8',
};

const AddPost = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [token, setToken] = useState(null);
  const [userLoading, setUserLoading] = useState(true);

  const navigation = useNavigation();
  const API_BASE_URL = 'http://192.168.204.119:8000';

  // Get user data when component mounts
  useEffect(() => {
    const getUserData = async () => {
      try {
        const userJson = await AsyncStorage.getItem('user');
        if (userJson) {
          const userData = JSON.parse(userJson);
          console.log('Retrieved user data for add post:', userData);
          
          setUserId(userData.id);
          setToken(userData.token);
        } else {
          // If no user data, redirect to login
          Alert.alert(
            'Authentication Required',
            'Please login to create posts',
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

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: false,
      });

      console.log('Document picker result:', result);

      if (result.canceled) {
        console.log('File selection cancelled');
        return;
      }

      if (!result.assets || result.assets.length === 0) {
        Alert.alert('Error', 'No file selected.');
        return;
      }

      const file = result.assets[0];
      
      // Check file size (limit to 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size && file.size > maxSize) {
        Alert.alert('File Too Large', 'Please select a file smaller than 10MB.');
        return;
      }

      setSelectedFile(file);
      console.log('Selected file:', file);
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to select file. Please try again.');
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
  };

  const handleSubmit = async () => {
    // Validation
    if (!userId || !token) {
      Alert.alert('Error', 'You must be logged in to create posts.');
      return;
    }

    if (!title.trim() && !description.trim() && !selectedFile) {
      Alert.alert('Error', 'Please provide at least a title, description, or file.');
      return;
    }

    setLoading(true);

    try {
      // Create FormData for multipart/form-data request
      const formData = new FormData();
      
      // Add user_id (required by backend)
      formData.append('user_id', userId.toString());
      
      // Add title and description
      formData.append('title', title.trim() || '');
      formData.append('description', description.trim() || '');

      // Add file if selected
      if (selectedFile) {
        const fileToUpload = {
          uri: selectedFile.uri,
          type: selectedFile.mimeType || 'application/octet-stream',
          name: selectedFile.name || `file-${Date.now()}`,
        };
        formData.append('document', fileToUpload);
      }

      console.log('Submitting post with data:', {
        user_id: userId,
        title: title.trim(),
        description: description.trim(),
        hasFile: !!selectedFile,
      });

      // Use fetch API with proper headers
      const response = await fetch(`${API_BASE_URL}/posts`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type - let fetch handle it for FormData
        },
      });

      const result = await response.json();
      console.log('Post created successfully:', result);

      if (response.ok) {
        Alert.alert(
          'Success',
          'Post created successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                // Reset form
                setTitle('');
                setDescription('');
                setSelectedFile(null);
                
                // Navigate back to posts or home
                navigation.navigate('Posts');
              },
            },
          ]
        );
      } else {
        throw new Error(result.detail || 'Failed to create post');
      }
    } catch (error) {
      console.error('Error creating post:', error);

      let errorMessage = 'Failed to create post. Please try again.';

      if (error.message?.includes('401')) {
        errorMessage = 'Authentication failed. Please login again.';
        navigation.navigate('Login');
      } else if (error.message?.includes('404') && error.message?.includes('User not found')) {
        errorMessage = 'User not found. Please login again.';
        navigation.navigate('Login');
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Show loading while getting user data
  if (userLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Show error if no user data
  if (!userId) {
    return (
      <View style={styles.errorContainer}>
        <Feather name="alert-circle" size={48} color={colors.danger} />
        <Text style={styles.errorText}>Authentication Required</Text>
        <Text style={styles.errorSubtext}>Please login to create posts</Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginButtonText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
      <ScreenWrapper>
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* User Info Section */}
        <View style={styles.userSection}>
          <Feather name="user" size={20} color={colors.primary} />
          <Text style={styles.userText}>Creating post as User ID: {userId}</Text>
        </View>

        {/* Title Input */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Enter post title..."
            placeholderTextColor={colors.textSecondary}
            multiline={false}
          />
        </View>

        {/* Description Input */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="What's on your mind?..."
            placeholderTextColor={colors.textSecondary}
            multiline={true}
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* File Upload Section */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Attachment (Optional)</Text>
          
          {!selectedFile ? (
            <TouchableOpacity style={styles.uploadButton} onPress={pickDocument}>
              <Feather name="upload" size={24} color={colors.primary} />
              <Text style={styles.uploadButtonText}>Choose File</Text>
              <Text style={styles.uploadSubtext}>Any file type supported</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.filePreview}>
              <View style={styles.fileInfo}>
                <Feather 
                  name={selectedFile.mimeType?.startsWith('image/') ? 'image' : 'file'} 
                  size={24} 
                  color={colors.success} 
                />
                <View style={styles.fileDetails}>
                  <Text style={styles.fileName}>{selectedFile.name}</Text>
                  <Text style={styles.fileSize}>
                    {selectedFile.size ? (selectedFile.size / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown size'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.removeButton} onPress={removeFile}>
                <Feather name="x" size={20} color={colors.danger} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Submit Button */}
        <View style={styles.buttonSection}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              loading && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Feather name="send" size={20} color="white" />
            )}
            <Text style={styles.submitButtonText}>
              {loading ? 'Creating Post...' : 'Create Post'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
      
    </ScrollView>
    <NavigationBar/>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
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
    backgroundColor: colors.background,
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
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    padding: 20,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  userText: {
    marginLeft: 12,
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  inputSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
  },
  textArea: {
    minHeight: 100,
    maxHeight: 200,
  },
  uploadButton: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 8,
  },
  uploadSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  filePreview: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fileDetails: {
    marginLeft: 12,
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  fileSize: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  removeButton: {
    padding: 8,
  },
  buttonSection: {
    marginTop: 20,
  },
  submitButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  submitButtonDisabled: {
    backgroundColor: colors.textSecondary,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: colors.surface,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default AddPost;