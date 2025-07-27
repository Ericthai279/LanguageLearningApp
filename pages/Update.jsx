import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { useNavigation, useRoute } from "@react-navigation/native";
import ScreenWrapper from "../components/screenwraper";
import { NavigationBar } from "../components/NavigationBar";

const UpdatePost = () => {
  const [post, setPost] = useState({
    title: "",
    description: "",
  });
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const navigation = useNavigation();
  const route = useRoute();
  const postId = route.params?.postId;
  const API_BASE_URL = "https://eb7e4ec70a6a.ngrok-free.app";

  // Fetch the current post data when component mounts
  useEffect(() => {
    if (postId) {
      fetchPostData();
    } else {
      setIsLoading(false);
      Alert.alert("Error", "No post ID provided");
    }
  }, [postId]);

  const fetchPostData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/posts/${postId}`);
      const data = await response.json();
      
      if (response.ok) {
        setPost({
          title: data.title || "",
          description: data.description || ""
        });
      } else {
        Alert.alert("Error", "Failed to fetch post data");
      }
    } catch (err) {
      console.error("Error fetching post:", err);
      Alert.alert("Error", "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (name, value) => {
    setPost((prev) => ({ ...prev, [name]: value }));
  };

  const pickDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });
      
      if (res.canceled) {
        console.log("User cancelled the picker");
      } else {
        console.log("Document picked:", res.assets[0]);
        setFile(res.assets[0]);
      }
    } catch (err) {
      console.error("Error picking document:", err);
      Alert.alert("Error", "Failed to pick document");
    }
  };

  const handleUpdate = async () => {
    setIsSubmitting(true);
    
    try {
      const formData = new FormData();
      
      // Add text fields
      formData.append("title", post.title || "");
      formData.append("description", post.description || "");
      
      // Add file if selected
      if (file) {
        formData.append("document", {
          uri: file.uri,
          type: file.mimeType || "application/octet-stream",
          name: file.name || `file-${Date.now()}.${file.mimeType?.split('/')[1] || 'bin'}`
        });
      }
      
      // Use fetch API instead of axios for more control
      const response = await fetch(`${API_BASE_URL}/posts/${postId}`, {
        method: "PUT",
        body: formData,
        headers: {
          "Accept": "application/json",
        },
      });
      
      const result = await response.json();
      
      if (response.ok) {
        Alert.alert("Success", "Post updated successfully!", [
          { text: "OK", onPress: () => navigation.goBack() }
        ]);
      } else {
        throw new Error(result.message || "Failed to update post");
      }
    } catch (error) {
      console.error("Error updating post:", error);
      Alert.alert("Error", error.message || "Something went wrong!");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScreenWrapper>
    <View style={styles.container}>
      <Text style={styles.heading}>Update Post</Text>
      <TextInput
        style={styles.input}
        placeholder="Post Title"
        value={post.title}
        onChangeText={(value) => handleChange("title", value)}
      />
      <TextInput
        style={styles.textarea}
        placeholder="Post Description"
        multiline
        numberOfLines={5}
        value={post.description}
        onChangeText={(value) => handleChange("description", value)}
      />
      <TouchableOpacity onPress={pickDocument} style={styles.pickButton}>
        <Text style={styles.pickButtonText}>
          {file ? `Selected: ${file.name}` : "Pick a Document (optional)"}
        </Text>
      </TouchableOpacity>
      <Button 
        title={isSubmitting ? "Updating..." : "Update Post"} 
        onPress={handleUpdate} 
        disabled={isSubmitting}
      />
    </View>
    <NavigationBar/>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  heading: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginBottom: 10,
  },
  textarea: {
    height: 100,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginBottom: 10,
    textAlignVertical: "top",
  },
  pickButton: {
    backgroundColor: "#007bff",
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    alignItems: "center",
  },
  pickButtonText: {
    color: "#fff",
    fontSize: 16,
  },
});

export default UpdatePost;