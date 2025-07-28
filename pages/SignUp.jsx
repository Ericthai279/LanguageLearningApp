import { StyleSheet, Text, View, Alert, Pressable } from 'react-native';
import React, { useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ScreenWrapper from '../components/screenwraper';
import { theme } from '../constrants/theme';
import Input from '../components/Input';
import Feather from '@expo/vector-icons/Feather';
import Button from '../components/Button';
import axios from 'axios';
import { NavigationBar } from '../components/NavigationBar';
// Base URL for API calls - updated for FastAPI backend
const API_URL = 'https://404854cfd8c3.ngrok-free.app'; // Updated port to FastAPI backend

const SignUp = ({ navigation }) => {
  const emailRef = useRef("");
  const nameRef = useRef("");
  const passwordRef = useRef("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {  
    if (!emailRef.current || !passwordRef.current || !nameRef.current) {  
      Alert.alert('Sign Up', "Please fill all the fields!");  
      return;  
    }  
  
    const username = nameRef.current.trim();
    const email = emailRef.current.trim();
    const password = passwordRef.current.trim(); // The API expects 'password' in the request

    // Log the data being sent (for debugging)
    console.log('Registration data:', { username, email, passwordLength: password.length });
    console.log('API URL:', `${API_URL}/auth/register`);

    setLoading(true);

    try {
      // Log request before sending
      console.log('Sending registration request...');
      
      const response = await axios.post(`${API_URL}/auth/register`, {
        username,
        email,
        password, // The API expects 'password' in the request, not 'password_hash'
        bio: "",
        profile_picture: null,
      });
      
      // Log success response
      console.log('Registration successful:', response.status);
      
      Alert.alert(
        'Registration Successful', 
        'Your account has been created successfully!',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error) {
      // Enhanced error logging
      console.error('Registration error:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers
      });
      
      // Try to get a detailed error message to show user
      const errorMsg = error.response?.data?.detail || 
                      (error.response?.data && typeof error.response.data === 'string' 
                       ? error.response.data 
                       : 'Unable to create account. Please try again.');
      
      Alert.alert('Registration Failed', errorMsg);
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
            <Text style={styles.welcomeText}> Let's</Text>
            <Text style={styles.welcomeText}> Get Started</Text>
          </View>
          <View style={styles.form}>
            <Text style={{ fontSize: 15, color: theme.colors.text }}>
              Please enter the details to create a new account
            </Text>
            <Input
              leftIcon={<Feather name="user" size={24} color="black" />}
              placeholder="Enter your name"
              onChangeText={value => nameRef.current = value}
            />
            <Input
              leftIcon={<Feather name="mail" size={24} color="black" />}
              placeholder="Enter your email"
              onChangeText={value => emailRef.current = value}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Input
              leftIcon={<Feather name="lock" size={24} color="black" />} 
              placeholder="Enter your password"
              secureTextEntry
              onChangeText={value => passwordRef.current = value} 
            />
            <Button title={'Sign Up'} loading={loading} onPress={onSubmit}/>
          </View>
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Already have an account?
            </Text>
            <Pressable onPress={() => navigation.navigate('Login')}>
              <Text style={[styles.footerText, { color: theme.colors.primaryDark, fontWeight: theme.fonts.semibold }]}>
                Login
              </Text>
            </Pressable>
          </View>
        </View>
        <NavigationBar/>
    </ScreenWrapper>
    </GestureHandlerRootView>
  );
};

export default SignUp;

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