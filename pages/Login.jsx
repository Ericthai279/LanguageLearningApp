import { StyleSheet, Text, View, TextInput, Alert, Pressable } from 'react-native';
import React, { useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ScreenWrapper from '../components/screenwraper';
import { theme } from '../constrants/theme';
import Input from '../components/Input';
import Feather from '@expo/vector-icons/Feather';
import Button from '../components/Button';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NavigationBar } from '../components/NavigationBar';

const Login = () => {
  const API_URL = 'https://71ec2670fcfe.ngrok-free.app'; // FastAPI backend URL
  const emailRef = useRef('');
  const passwordRef = useRef('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const onSubmit = async () => {
    if (!emailRef.current || !passwordRef.current) {
      Alert.alert('Login', 'Please fill all the fields!');
      return;
    }

    const email = emailRef.current.trim();
    const password = passwordRef.current.trim();
    
    console.log('Attempting login with:', { email, passwordLength: password.length });
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password,
      });
      
      console.log('Login response:', response.data);
      
      // Extract data from FastAPI response
      const { access_token, token_type, user_id, username } = response.data;

      // Create user object to store in AsyncStorage (consistent with other components)
      const userData = {
        id: user_id,
        username: username,
        token: access_token,
        email: email // Store email for reference
      };

      // Store user data in AsyncStorage
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      
      // Set default authorization header for future requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

      console.log('Login successful, stored user data:', userData);
      
      Alert.alert('Login Successful', `Welcome back, ${username}!`, [
        { text: 'OK', onPress: () => navigation.navigate('Home') }
      ]);
      
    } catch (error) {
      console.error('Login error:', error);
      
      // Enhanced error handling
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.response) {
        // Server responded with error status
        console.error('Error response:', error.response.data);
        console.error('Error status:', error.response.status);
        
        if (error.response.status === 401) {
          errorMessage = 'Invalid email or password. Please check your credentials.';
        } else if (error.response.data?.detail) {
          errorMessage = error.response.data.detail;
        }
      } else if (error.request) {
        // Request was made but no response received
        console.error('No response received:', error.request);
        errorMessage = 'Unable to connect to server. Please check your internet connection.';
      } else {
        // Something else happened
        console.error('Error message:', error.message);
        errorMessage = error.message;
      }
      
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ScreenWrapper bg="white">
        <StatusBar style="dark" />
        <View style={styles.container}>
          <View>
            <Text style={styles.welcomeText}>Hey,</Text>
            <Text style={styles.welcomeText}>Welcome Back</Text>
          </View>
          <View style={styles.form}>
            <Text style={{ fontSize: 15, color: theme.colors.text }}>
              Please login to continue
            </Text>
            <Input
              leftIcon={<Feather name="mail" size={24} color="black" />}
              placeholder="Enter your email"
              onChangeText={(value) => (emailRef.current = value)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Input
              leftIcon={<Feather name="lock" size={24} color="black" />}
              placeholder="Enter your password"
              secureTextEntry
              onChangeText={(value) => (passwordRef.current = value)}
            />
            <Text style={styles.forgotPassword}>Forgot Password?</Text>
            <Button title={'Login'} loading={loading} onPress={onSubmit} />
          </View>
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account?</Text>
            <Pressable onPress={() => navigation.navigate('SignUp')}>
              <Text
                style={[
                  styles.footerText,
                  { color: theme.colors.primaryDark, fontWeight: theme.fonts.semibold },
                ]}
              >
                Sign Up
              </Text>
            </Pressable>
          </View>
        </View>
        <NavigationBar/>
    </ScreenWrapper>
    </GestureHandlerRootView>
  );
};

export default Login;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 45,
    paddingHorizontal: 20,
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: theme.fonts.bold,
    color: theme.colors.text,
  },
  form: {
    gap: 25,
  },
  forgotPassword: {
    textAlign: 'right',
    fontWeight: theme.fonts.semibold,
    color: theme.colors.text,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
  },
  footerText: {
    textAlign: 'center',
    color: theme.colors.text,
    fontSize: 12,
  },
});