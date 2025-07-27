import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TextInput, TouchableOpacity, ActivityIndicator, FlatList, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Feather from '@expo/vector-icons/Feather';
import ScreenWrapper from '../components/screenwraper';
import { NavigationBar } from '../components/NavigationBar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// API base URL
const API_URL = 'https://eb7e4ec70a6a.ngrok-free.app';

// Local asset references
const PDF_ICON = require('../assets/icons/pdf-icon.png');
const DOCX_ICON = require('../assets/icons/docx-icon.png');

const ProfileScreen = () => {
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
        Alert.alert('Error', 'Please log in again');
        return;
      }

      const userData = JSON.parse(userDataString);
      const { token, id: userId } = userData;

      const response = await axios.get(`${API_URL}/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUser(response.data);
      setBio(response.data.bio || '');
      setProfilePicture(response.data.profile_picture);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching user data:', error);
      Alert.alert('Error', 'Failed to load profile data');
      setLoading(false);
    }
  };

  const fetchUserPosts = async () => {
    try {
      const userDataString = await AsyncStorage.getItem('user');
      if (!userDataString) return;

      const userData = JSON.parse(userDataString);
      const { token, id: userId } = userData;

      const response = await axios.get(`${API_URL}/posts`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const userPosts = response.data.filter(post => post.user_id === parseInt(userId));
      setPosts(userPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
      Alert.alert('Error', 'Failed to load posts');
    }
  };

  const handleImagePick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Sorry, we need camera roll permissions to upload an image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setProfilePicture(result.assets[0].uri);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setUploading(true);
      const userDataString = await AsyncStorage.getItem('user');
      if (!userDataString) {
        Alert.alert('Error', 'Please log in again');
        return;
      }

      const userData = JSON.parse(userDataString);
      const { token, id: userId } = userData;

      const formData = new FormData();
      formData.append('bio', bio);

      if (profilePicture && profilePicture.startsWith('file://')) {
        const fileExtension = profilePicture.split('.').pop();
        formData.append('document', {
          uri: profilePicture,
          name: `profile_${userId}.${fileExtension}`,
          type: `image/${fileExtension}`,
        });
      }

      const response = await axios.put(`${API_URL}/users/${userId}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      setUser(response.data);
      setEditing(false);
      Alert.alert('Success', 'Profile updated successfully');

      // Update AsyncStorage with new user data
      const updatedUserData = { ...userData, ...response.data };
      await AsyncStorage.setItem('user', JSON.stringify(updatedUserData));
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
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
          <ActivityIndicator size="large" color="#007bff" />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper navigationStyle="bottom">
      <View style={styles.container}>
        <View style={styles.profileHeader}>
          <TouchableOpacity onPress={handleImagePick} disabled={!editing}>
            {profilePicture ? (
              <Image
                source={{ uri: profilePicture.startsWith('file://') ? profilePicture : `${API_URL}${profilePicture}` }}
                style={styles.profileImage}
              />
            ) : (
              <View style={[styles.profileImage, styles.placeholderImage]}>
                <Feather name="user" size={60} color="#666" />
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
              multiline
            />
          ) : (
            <Text style={styles.bio}>{user?.bio || 'No bio available'}</Text>
          )}

          <View style={styles.buttonContainer}>
            {editing ? (
              <>
                <TouchableOpacity
                  style={[styles.button, styles.saveButton]}
                  onPress={handleUpdateProfile}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color="#fff" />
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
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 10,
    backgroundColor: '#e0e0e0',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  bio: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  bioInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
    minHeight: 80,
    textAlignVertical: 'top',
    backgroundColor: '#fff',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    minWidth: 100,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#007bff',
  },
  saveButton: {
    backgroundColor: '#28a745',
  },
  cancelButton: {
    backgroundColor: '#dc3545',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  postsSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  postsList: {
    paddingBottom: 20,
  },
  postContainer: {
    backgroundColor: '#fff',
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
    color: '#333',
    marginBottom: 5,
  },
  postDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 5,
    marginBottom: 10,
    backgroundColor: '#f5f5f5',
  },
  postDate: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },
  noPosts: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default ProfileScreen;