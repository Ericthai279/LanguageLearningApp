import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView,
  StatusBar,
  Alert
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from '@react-native-async-storage/async-storage';
import Feather from '@expo/vector-icons/Feather';
import ScreenWrapper from "./components/screenwraper.jsx";
import { NavigationBar } from "./components/NavigationBar.jsx";
// Import your pages
import WelcomeScreen from "./pages/Welcome.jsx";
import AddPost from "./pages/Add.jsx";
import Posts from "./pages/Post.jsx";
import UpdatePost from "./pages/Update.jsx";
import Login from "./pages/Login.jsx";
import SignUp from "./pages/SignUp.jsx";
import Chatbot from "./pages/Chatbot.jsx";
import ProfileScreen from "./pages/ProfileScreen.jsx";

const Stack = createNativeStackNavigator();

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

const HomeScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUserAuth();
  }, []);

  const checkUserAuth = async () => {
    try {
      const userJson = await AsyncStorage.getItem('user');
      if (userJson) {
        const userData = JSON.parse(userJson);
        setUser(userData);
      }
    } catch (error) {
      console.error('Error checking auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('user');
              setUser(null);
            } catch (error) {
              console.error('Error logging out:', error);
            }
          }
        }
      ]
    );
  };

  const navigateWithAuth = (screenName, requiresAuth = true) => {
    if (requiresAuth && !user) {
      Alert.alert(
        'Authentication Required',
        'Please login to access this feature.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => navigation.navigate('Login') }
        ]
      );
      return;
    }
    navigation.navigate(screenName);
  };

  const mainFeatures = [
    {
      id: 'posts',
      title: 'View Posts',
      subtitle: 'Browse community posts',
      icon: 'home',
      color: colors.primary,
      screen: 'Posts',
      requiresAuth: false
    },
    {
      id: 'add',
      title: 'Create Post',
      subtitle: 'Share your thoughts',
      icon: 'plus-circle',
      color: colors.success,
      screen: 'AddPost',
      requiresAuth: true
    },
    {
      id: 'chatbot',
      title: 'AI Assistant',
      subtitle: 'Chat, translate & more',
      icon: 'message-circle',
      color: colors.secondary,
      screen: 'ChatBot',
      requiresAuth: true
    },
    {
      id: 'update',
      title: 'Edit Posts',
      subtitle: 'Manage your content',
      icon: 'edit-3',
      color: colors.warning,
      screen: 'UpdatePost',
      requiresAuth: true
    },

  ];

  const authActions = [
    {
      id: 'login',
      title: 'Login',
      icon: 'log-in',
      color: colors.primary,
      screen: 'Login'
    },
    {
      id: 'signup',
      title: 'Sign Up',
      icon: 'user-plus',
      color: colors.success,
      screen: 'SignUp'
    }
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <ScreenWrapper>
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.appTitle}>SocialHub</Text>
            <Text style={styles.appSubtitle}>Connect, Share, Discover</Text>
          </View>
          
          {user ? (
            <View style={styles.userSection}>
              <View style={styles.userInfo}>
                <Text style={styles.welcomeText}>Welcome back!</Text>
                <Text style={styles.userName}>{user.username || user.email}</Text>
              </View>
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Feather name="log-out" size={20} color={colors.danger} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.guestSection}>
              <Text style={styles.guestText}>Join our community</Text>
            </View>
          )}
        </View>

        {/* Main Features Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Features</Text>
          <View style={styles.featuresGrid}>
            {mainFeatures.map((feature) => (
              <TouchableOpacity
                key={feature.id}
                style={[styles.featureCard, { borderLeftColor: feature.color }]}
                onPress={() => navigateWithAuth(feature.screen, feature.requiresAuth)}
                activeOpacity={0.7}
              >
                <View style={styles.featureContent}>
                  <View style={[styles.featureIcon, { backgroundColor: feature.color + '20' }]}>
                    <Feather name={feature.icon} size={24} color={feature.color} />
                  </View>
                  <View style={styles.featureText}>
                    <Text style={styles.featureTitle}>{feature.title}</Text>
                    <Text style={styles.featureSubtitle}>{feature.subtitle}</Text>
                  </View>
                  <Feather name="chevron-right" size={20} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        

        {/* Authentication Section (only show if not logged in) */}
        {!user && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Get Started</Text>
            <View style={styles.authContainer}>
              {authActions.map((action) => (
                <TouchableOpacity
                  key={action.id}
                  style={[styles.authButton, { backgroundColor: action.color }]}
                  onPress={() => navigation.navigate(action.screen)}
                  activeOpacity={0.8}
                >
                  <Feather name={action.icon} size={20} color="white" />
                  <Text style={styles.authButtonText}>{action.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Quick Stats or Info Section */}
        <View style={styles.section}>
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Feather name="users" size={24} color={colors.primary} />
              <Text style={styles.statNumber}>1K+</Text>
              <Text style={styles.statLabel}>Active Users</Text>
            </View>
            <View style={styles.statCard}>
              <Feather name="file-text" size={24} color={colors.success} />
              <Text style={styles.statNumber}>5K+</Text>
              <Text style={styles.statLabel}>Posts Shared</Text>
            </View>
            <View style={styles.statCard}>
              <Feather name="message-square" size={24} color={colors.secondary} />
              <Text style={styles.statNumber}>24/7</Text>
              <Text style={styles.statLabel}>AI Support</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={() => navigation.navigate('WelcomeScreen')}>
            <Text style={styles.footerLink}>About SocialHub</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
    <NavigationBar/>
    </ScreenWrapper>
  );
};

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.surface,
          },
          headerTintColor: colors.text,
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      >
        <Stack.Screen 
          name="Home" 
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Posts" 
          component={Posts}
          options={{ headerShown: false }}  
        />
        <Stack.Screen 
          name="AddPost" 
          component={AddPost}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="UpdatePost" 
          component={UpdatePost}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="WelcomeScreen" 
          component={WelcomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Login" 
          component={Login}
          // options={{ title: 'Sign In' }}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="SignUp" 
          component={SignUp}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="ChatBot" 
          component={Chatbot}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="ProfileScreen" 
          component={ProfileScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginBottom: 20,
  },
  headerContent: {
    marginBottom: 16,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  appSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  userSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
    padding: 16,
    borderRadius: 12,
  },
  userInfo: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  logoutButton: {
    padding: 8,
  },
  guestSection: {
    backgroundColor: colors.success + '10',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  guestText: {
    fontSize: 16,
    color: colors.success,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  featuresGrid: {
    gap: 12,
  },
  featureCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  featureContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  featureSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  authContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  authButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  authButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  footer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  footerLink: {
    fontSize: 14,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});