import axios from "axios";
import React, { useEffect, useState } from "react";
import { View, Text, Image, ScrollView, StyleSheet, Alert, TouchableOpacity, SafeAreaView, StatusBar } from "react-native";
import { useNavigation } from "@react-navigation/native";
import ScreenWrapper from "../components/screenwraper";
import { NavigationBar } from "../components/NavigationBar";
import Feather from '@expo/vector-icons/Feather';

// Define colors for consistent theming (same as App.jsx)
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
  const navigation = useNavigation();
  const API_BASE_URL = "http://192.168.204.119:8000";

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
                    <Image source={{ uri: post.media_url }} style={styles.postImage} />
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
    paddingBottom: 100, // Ensure content clears NavigationBar
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
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  deleteButton: {
    backgroundColor: colors.danger,
  },
  updateButton: {
    backgroundColor: colors.warning,
  },
  actionButtonText: {
    color: colors.surface,
    fontSize: 14,
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