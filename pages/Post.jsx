import axios from "axios";
import React, { useEffect, useState } from "react";
import { View, Text, Image, Button, ScrollView, StyleSheet, Alert, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";

const Posts = () => {
  const [posts, setPosts] = useState([]);
  const navigation = useNavigation();
  const API_BASE_URL = "http://10.25.33.116:8000";

  useEffect(() => {
    const fetchAllPosts = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/posts`);
        setPosts(res.data);
      } catch (err) {
        console.log(err);
      }
    };
    fetchAllPosts();
  }, []);

  const handleDelete = async (id) => {
    Alert.alert("Confirm Delete", "Are you sure you want to delete this post?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        onPress: async () => {
          try {
            await axios.delete(`${API_BASE_URL}/posts/${id}`);
            setPosts(posts.filter((post) => post.id !== id));
          } catch (err) {
            console.log(err);
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>All Posts</Text>
      {posts.map((post) => (
        <View key={post.id} style={styles.post}>
          {post.media_url && <Image source={{ uri: post.media_url }} style={styles.image} />}
          <Text style={styles.title}>{post.title}</Text>
          <Text style={styles.description}>{post.description}</Text>
          <Text style={styles.user}>By User {post.user_id}</Text>
          <View style={styles.buttonContainer}>
            <Button title="Delete" color="red" onPress={() => handleDelete(post.id)} />
            <TouchableOpacity onPress={() => navigation.navigate("UpdatePost", { postId: post.id })} style={styles.updateButton}>
              <Text style={styles.updateText}>Update</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
      <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate("AddPost")}>
        <Text style={styles.addButtonText}>Add New Post</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  heading: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  post: {
    backgroundColor: "#f9f9f9",
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
  },
  image: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 10,
  },
  description: {
    fontSize: 14,
    marginVertical: 5,
  },
  user: {
    fontSize: 12,
    color: "gray",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  updateButton: {
    backgroundColor: "blue",
    padding: 10,
    borderRadius: 5,
  },
  updateText: {
    color: "white",
    fontWeight: "bold",
  },
  addButton: {
    backgroundColor: "green",
    padding: 15,
    alignItems: "center",
    borderRadius: 8,
    marginTop: 20,
  },
  addButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default Posts;
