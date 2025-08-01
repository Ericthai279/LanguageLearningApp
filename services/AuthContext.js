// // AuthContext.js
// import React, { createContext, useContext, useState, useEffect } from 'react';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import axios from 'axios';

// const AuthContext = createContext();

// export const AuthProvider = ({ children }) => {
//   const [user, setUser] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const API_BASE_URL = "https://404854cfd8c3.ngrok-free.app";

//   useEffect(() => {
//     const loadUser = async () => {
//       try {
//         const storedUser = await AsyncStorage.getItem('user');
//         if (storedUser) {
//           const userData = JSON.parse(storedUser);
//           setUser(userData);
//           axios.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
//         }
//       } catch (error) {
//         console.error('Error loading user from storage:', error);
//       } finally {
//         setIsLoading(false);
//       }
//     };
//     loadUser();
//   }, []);

//   const login = async (email, password) => {
//     try {
//       const response = await axios.post(`${API_BASE_URL}/auth/login`, {
//         email,
//         password,
//       });
//       const userData = {
//         id: response.data.user_id,
//         username: response.data.username,
//         token: response.data.access_token,
//         email: email,
//         bio: response.data.bio || '',
//         profile_picture: response.data.profile_picture || null,
//       };
//       setUser(userData);
//       await AsyncStorage.setItem('user', JSON.stringify(userData));
//       axios.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
//       return userData;
//     } catch (error) {
//       console.error('Login error:', error);
//       throw error;
//     }
//   };

//   const register = async (username, email, password, bio = "", profile_picture = null) => {
//     try {
//       const response = await axios.post(`${API_BASE_URL}/auth/register`, {
//         username,
//         email,
//         password,
//         bio,
//         profile_picture,
//       });
//       const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
//         email,
//         password,
//       });
//       const userData = {
//         id: loginResponse.data.user_id,
//         username: loginResponse.data.username,
//         token: loginResponse.data.access_token,
//         email: email,
//         bio: response.data.bio || '',
//         profile_picture: response.data.profile_picture || null,
//       };
//       setUser(userData);
//       await AsyncStorage.setItem('user', JSON.stringify(userData));
//       axios.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
//       return userData;
//     } catch (error) {
//       console.error('Registration error:', error);
//       throw error;
//     }
//   };

//   const logout = async () => {
//     try {
//       setUser(null);
//       await AsyncStorage.removeItem('user');
//       delete axios.defaults.headers.common['Authorization'];
//     } catch (error) {
//       console.error('Logout error:', error);
//     }
//   };

//   return (
//     <AuthContext.Provider value={{ user, setUser, login, register, logout, isLoading }}>
//       {children}
//     </AuthContext.Provider>
//   );
// };

// export const useAuth = () => {
//   const context = useContext(AuthContext);
//   if (!context) {
//     throw new Error('useAuth must be used within an AuthProvider');
//   }
//   return context;
// };