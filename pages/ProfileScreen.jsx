import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TextInput, TouchableOpacity, ActivityIndicator, FlatList, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import Feather from '@expo/vector-icons/Feather';
import ScreenWrapper from '../components/screenwraper';
import { NavigationBar } from '../components/NavigationBar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';

// API base URL
const API_URL = 'http://192.168.31.228:8000';

// Local asset references
const PDF_ICON = require('../assets/icons/pdf-icon.png');
const DOCX_ICON = require('../assets/icons/docx-icon.png');

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

const isTokenExpired = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiry = payload.exp * 1000; // Convert to milliseconds
    return Date.now() >= expiry;
  } catch (error) {
    console.error('Error decoding token:', error);
    return true; // Assume expired if decoding fails
  }
};

const ProfileScreen = () => {
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState('');
  const [profilePicture, setProfilePicture] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchUserData();
    fetchUserPosts();
  }, []);

  const fetchUserData = async () => {
    try {
      const userDataString = await AsyncStorage.getItem('user');
      if (!userDataString) {
        Alert.alert('Error', 'Please log in again', [
          { text: 'OK', onPress: () => navigation.navigate('Login') },
        ]);
        setLoading(false);
        return;
      }

      let userData;
      try {
        userData = JSON.parse(userDataString);
      } catch (parseError) {
        console.error('Error parsing user data:', parseError);
        Alert.alert('Error', 'Invalid user data. Please log in again.', [
          { text: 'OK', onPress: () => navigation.navigate('Login') },
        ]);
        setLoading(false);
        return;
      }

      const { token, id: userId } = userData;
      if (!token || !userId) {
        Alert.alert('Error', 'Invalid user data. Please log in again.', [
          { text: 'OK', onPress: () => navigation.navigate('Login') },
        ]);
        setLoading(false);
        return;
      }

      console.log('Fetching user data for userId:', userId);
      const response = await axios.get(`${API_URL}/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUser(response.data);
      setBio(response.data.bio || '');
      setProfilePicture(response.data.profile_picture);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching user data:', error);
      let errorMsg = 'Failed to load profile data';
      if (error.response?.status === 401) {
        errorMsg = 'Session expired. Please log in again.';
      } else if (error.response?.data?.detail) {
        errorMsg = error.response.data.detail;
      }
      Alert.alert('Error', errorMsg, [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
      setLoading(false);
    }
  };

  const fetchUserPosts = async () => {
    try {
      const userDataString = await AsyncStorage.getItem('user');
      if (!userDataString) {
        Alert.alert('Error', 'Please log in again', [
          { text: 'OK', onPress: () => navigation.navigate('Login') },
        ]);
        return;
      }

      let userData;
      try {
        userData = JSON.parse(userDataString);
      } catch (parseError) {
        console.error('Error parsing user data:', parseError);
        Alert.alert('Error', 'Invalid user data. Please log in again.', [
          { text: 'OK', onPress: () => navigation.navigate('Login') },
        ]);
        return;
      }

      const { token, id: userId } = userData;
      if (!token || !userId) {
        Alert.alert('Error', 'Invalid user data. Please log in again.', [
          { text: 'OK', onPress: () => navigation.navigate('Login') },
        ]);
        return;
      }

      console.log('Fetching posts for userId:', userId);
      const response = await axios.get(`${API_URL}/posts`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const userPosts = response.data.filter(post => post.user_id === parseInt(userId));
      setPosts(userPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
      let errorMsg = 'Failed to load posts';
      if (error.response?.status === 401) {
        errorMsg = 'Session expired. Please log in again.';
      } else if (error.response?.data?.detail) {
        errorMsg = error.response.data.detail;
      }
      Alert.alert('Error', errorMsg, [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    }
  };

  const handleImagePick = async () => {
    console.log('Requesting media library permissions...');
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    console.log('Permissions status:', status);

    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera roll permissions are required to upload an image.');
      return;
    }

    console.log('Available MediaType properties:', Object.keys(ImagePicker.MediaType || {}));
    console.log('Launching image library...');

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });
      console.log('Image picker result:', result);

      if (!result.canceled) {
        setProfilePicture(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error launching image picker:', error);
      Alert.alert('Error', 'Failed to open image picker. Please try again or reinstall the app.');
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setUploading(true);
      const userDataString = await AsyncStorage.getItem('user');
      if (!userDataString) {
        Alert.alert('Error', 'Please log in again', [
          { text: 'OK', onPress: () => navigation.navigate('Login') },
        ]);
        setUploading(false);
        return;
      }

      let userData;
      try {
        userData = JSON.parse(userDataString);
      } catch (parseError) {
        console.error('Error parsing user data:', parseError);
        Alert.alert('Error', 'Invalid user data. Please log in again.', [
          { text: 'OK', onPress: () => navigation.navigate('Login') },
        ]);
        setUploading(false);
        return;
      }

      let { token, id: userId } = userData;
      if (!token || !userId) {
        Alert.alert('Error', 'Invalid user data. Please log in again.', [
          { text: 'OK', onPress: () => navigation.navigate('Login') },
        ]);
        setUploading(false);
        return;
      }

      if (isTokenExpired(token)) {
        try {
          console.log('Attempting to refresh token at:', `${API_URL}/auth/refresh`);
          const refreshResponse = await axios.post(
            `${API_URL}/auth/refresh`,
            {},
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          token = refreshResponse.data.access_token;
          userData.token = token;
          await AsyncStorage.setItem('user', JSON.stringify(userData));
        } catch (refreshError) {
          console.error('Error refreshing token:', refreshError);
          let errorMsg = 'Session expired. Please log in again.';
          if (refreshError.response?.status === 404) {
            errorMsg = 'Token refresh endpoint not found. Please contact support.';
          } else if (refreshError.response?.data?.detail) {
            errorMsg = refreshError.response.data.detail;
          }
          Alert.alert('Error', errorMsg, [
            { text: 'OK', onPress: () => navigation.navigate('Login') },
          ]);
          setUploading(false);
          return;
        }
      }

      const tryUpdateProfile = async (authToken) => {
        const formData = new FormData();
        formData.append('bio', bio || '');

        if (profilePicture && profilePicture.startsWith('file://')) {
          const fileExtension = profilePicture.split('.').pop().toLowerCase();
          const validExtensions = ['jpg', 'jpeg', 'png'];
          if (!validExtensions.includes(fileExtension)) {
            Alert.alert('Error', 'Only JPG and PNG images are supported');
            setUploading(false);
            return null;
          }

          const fileInfo = await FileSystem.getInfoAsync(profilePicture);
          if (!fileInfo.exists) {
            Alert.alert('Error', 'Selected image file is not accessible');
            setUploading(false);
            return null;
          }
          if (fileInfo.size > 5 * 1024 * 1024) {
            Alert.alert('Error', 'Image file is too large (max 5MB)');
            setUploading(false);
            return null;
          }

          formData.append('document', {
            uri: profilePicture,
            name: `profile_${userId}.${fileExtension}`,
            type: fileExtension === 'jpg' || fileExtension === 'jpeg' ? 'image/jpeg' : 'image/png',
          });
        }

        const url = `${API_URL}/users/${userId}`;
        console.log('Updating profile at:', url);
        console.log('Request Headers:', {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'multipart/form-data',
          Accept: 'application/json',
        });
        console.log('FormData entries:');
        for (let [key, value] of formData._parts) {
          console.log(`${key}:`, value);
        }

        return await axios.put(url, formData, {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'multipart/form-data',
            Accept: 'application/json',
          },
        });
      };

      try {
        const response = await tryUpdateProfile(token);
        console.log('Response data:', response.data);

        setUser(response.data);
        setBio(response.data.bio || '');
        setProfilePicture(response.data.profile_picture);
        setEditing(false);
        Alert.alert('Success', 'Profile updated successfully');

        const updatedUserData = { ...userData, ...response.data };
        await AsyncStorage.setItem('user', JSON.stringify(updatedUserData));
      } catch (error) {
        if (error.response?.status === 401) {
          try {
            console.log('Attempting to refresh token at:', `${API_URL}/auth/refresh`);
            const refreshResponse = await axios.post(
              `${API_URL}/auth/refresh`,
              {},
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );
            token = refreshResponse.data.access_token;
            userData.token = token;
            await AsyncStorage.setItem('user', JSON.stringify(userData));

            const retryResponse = await tryUpdateProfile(token);
            console.log('Retry Response data:', retryResponse.data);

            setUser(retryResponse.data);
            setBio(retryResponse.data.bio || '');
            setProfilePicture(retryResponse.data.profile_picture);
            setEditing(false);
            Alert.alert('Success', 'Profile updated successfully');

            const updatedUserData = { ...userData, ...retryResponse.data };
            await AsyncStorage.setItem('user', JSON.stringify(updatedUserData));
          } catch (refreshError) {
            console.error('Error refreshing token:', refreshError);
            let errorMsg = 'Session expired. Please log in again.';
            if (refreshError.response?.status === 404) {
              errorMsg = 'Token refresh endpoint not found. Please contact support.';
            } else if (refreshError.response?.data?.detail) {
              errorMsg = refreshError.response.data.detail;
            }
            Alert.alert('Error', errorMsg, [
              { text: 'OK', onPress: () => navigation.navigate('Login') },
            ]);
          }
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: JSON.stringify(error.response?.data, null, 2),
        headers: error.response?.headers,
      });
      let errorMsg = 'Failed to update profile';
      if (error.response?.status === 401) {
        errorMsg = 'Session expired. Please log in again.';
      } else if (error.response?.data?.detail) {
        errorMsg = error.response.data.detail;
      }
      Alert.alert('Error', errorMsg, [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    } finally {
      setUploading(false);
    }
  };

  const getPostImageSource = (mediaUrl) => {
    if (!mediaUrl) return null;
    if (mediaUrl.endsWith('.pdf')) return PDF_ICON;
    if (mediaUrl.endsWith('.docx')) return DOCX_ICON;
    return { uri: `${API_URL}${mediaUrl}` };
  };

  const renderPost = ({ item }) => (
    <View style={styles.postContainer}>
      <Text style={styles.postTitle}>{item.title || 'Untitled Post'}</Text>
      <Text style={styles.postDescription}>{item.description}</Text>
      {item.media_url && (
        <Image
          source={getPostImageSource(item.media_url)}
          style={styles.postImage}
          resizeMode={item.media_url.endsWith('.pdf') || item.media_url.endsWith('.docx') ? 'contain' : 'cover'}
          defaultSource={PDF_ICON}
        />
      )}
      <Text style={styles.postDate}>
        {new Date(item.created_at).toLocaleDateString()}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <ScreenWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <View style={styles.profileHeader}>
          {editing && (
            <Text style={styles.profilePictureLabel}>Profile Picture</Text>
          )}
          <TouchableOpacity onPress={handleImagePick} disabled={!editing}>
            {profilePicture ? (
              <Image
                source={{ uri: profilePicture.startsWith('file://') ? profilePicture : `${API_URL}${profilePicture}` }}
                style={styles.profileImage}
              />
            ) : (
              <View style={[styles.profileImage, styles.placeholderImage]}>
                <Feather name="user" size={60} color={colors.textSecondary} />
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.username}>{user?.username}</Text>
          <Text style={styles.email}>{user?.email}</Text>

          {editing ? (
            <TextInput
              style={styles.bioInput}
              value={bio}
              onChangeText={setBio}
              placeholder="Enter your bio"
              placeholderTextColor={colors.textSecondary}
              multiline
            />
          ) : (
            <Text style={styles.bio}>{user?.bio || 'No bio available'}</Text>
          )}

          <View style={styles.buttonContainer}>
            {editing ? (
              <>
                <TouchableOpacity
                  style={[styles.button, styles.addImageButton, uploading && styles.buttonDisabled]}
                  onPress={handleImagePick}
                  disabled={uploading}
                >
                  <Feather name="image" size={20} color={colors.surface} style={styles.buttonIcon} />
                  <Text style={styles.buttonText}>Add Image</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.saveButton, uploading && styles.buttonDisabled]}
                  onPress={handleUpdateProfile}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color={colors.surface} />
                  ) : (
                    <Text style={styles.buttonText}>Save</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => {
                    setEditing(false);
                    setBio(user?.bio || '');
                    setProfilePicture(user?.profile_picture);
                  }}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.button, styles.editButton]}
                onPress={() => setEditing(true)}
              >
                <Text style={styles.buttonText}>Edit Profile</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.postsSection}>
          <Text style={styles.sectionTitle}>Your Posts</Text>
          {posts.length > 0 ? (
            <FlatList
              data={posts}
              renderItem={renderPost}
              keyExtractor={item => item.id.toString()}
              contentContainerStyle={styles.postsList}
            />
          ) : (
            <Text style={styles.noPosts}>No posts yet</Text>
          )}
        </View>
      </View>
      <NavigationBar />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  profilePictureLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 10,
    backgroundColor: colors.background,
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  bio: {
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  bioInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
    minHeight: 80,
    textAlignVertical: 'top',
    backgroundColor: colors.surface,
    color: colors.text,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  button: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageButton: {
    backgroundColor: colors.secondary,
  },
  editButton: {
    backgroundColor: colors.primary,
  },
  saveButton: {
    backgroundColor: colors.success,
  },
  cancelButton: {
    backgroundColor: colors.danger,
  },
  buttonDisabled: {
    backgroundColor: colors.textSecondary,
  },
  buttonText: {
    color: colors.surface,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 5,
  },
  postsSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
  },
  postsList: {
    paddingBottom: 20,
  },
  postContainer: {
    backgroundColor: colors.surface,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  postTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 5,
  },
  postDescription: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 10,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 5,
    marginBottom: 10,
    backgroundColor: colors.background,
  },
  postDate: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  noPosts: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 20,
  },
});

export default ProfileScreen;