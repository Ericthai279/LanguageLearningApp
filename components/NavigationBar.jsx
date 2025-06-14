import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NavigationBar = ({ style, position = 'bottom' }) => {
  const navigation = useNavigation();
  const route = useRoute();
  const { bottom } = useSafeAreaInsets();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userJson = await AsyncStorage.getItem('user');
        setIsAuthenticated(!!userJson);
      } catch (error) {
        console.error('Error checking auth:', error);
      }
    };
    checkAuth();
  }, []);

  const navigationItems = [
    {
      name: 'Home',
      icon: 'home',
      label: 'Home',
      screen: 'Home'
    },
    {
      name: 'Posts',
      icon: 'book',
      label: 'Posts',
      screen: 'Posts'
    },
    {
      name: 'AddPost',
      icon: 'plus-circle',
      label: 'Add Post',
      screen: 'AddPost'
    },
    {
      name: 'ChatBot',
      icon: 'message-circle',
      label: 'AI Chat',
      screen: 'ChatBot'
    },
    {
      name: 'Profile',
      icon: 'user',
      label: 'Profile',
      screen: isAuthenticated ? 'ProfileScreen' : 'Login'
    }
  ];

  const isActive = (screenName) => {
    return route.name === screenName || 
           (route.name === 'PostsList' && screenName === 'Posts') ||
           (route.name === 'ChatBot' && screenName === 'ChatBot') ||
           (route.name === 'ProfileScreen' && screenName === 'ProfileScreen' && isAuthenticated) ||
           (route.name === 'Login' && screenName === 'Login' && !isAuthenticated);
  };

  const handleNavigation = (screenName) => {
    try {
      navigation.navigate(screenName);
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const containerStyle = position === 'top' 
    ? styles.topContainer 
    : [styles.bottomContainer, { paddingBottom: bottom > 0 ? bottom : 10 }];

  return (
    <View style={[containerStyle, style]}>
      {navigationItems.map((item) => (
        <TouchableOpacity
          key={item.name}
          style={[
            styles.navItem,
            isActive(item.screen) && styles.activeNavItem
          ]}
          onPress={() => handleNavigation(item.screen)}
          activeOpacity={0.7}
        >
          <Feather
            name={item.icon}
            size={24}
            color={isActive(item.screen) ? '#007bff' : '#666'}
          />
          <Text
            style={[
              styles.navLabel,
              isActive(item.screen) && styles.activeNavLabel
            ]}
          >
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// Horizontal Navigation Bar (for top placement)
const HorizontalNavigationBar = ({ style }) => {
  const navigation = useNavigation();
  const route = useRoute();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userJson = await AsyncStorage.getItem('user');
        setIsAuthenticated(!!userJson);
      } catch (error) {
        console.error('Error checking auth:', error);
      }
    };
    checkAuth();
  }, []);

  const navigationItems = [
    { name: 'Home', icon: 'home', screen: 'Home' },
    { name: 'Posts', icon: 'book', screen: 'Posts' },
    { name: 'Add', icon: 'plus', screen: 'AddPost' },
    { name: 'Chat', icon: 'message-circle', screen: 'ChatBot' },
    { name: 'Profile', icon: 'user', screen: isAuthenticated ? 'ProfileScreen' : 'Login' }
  ];

  const isActive = (screenName) => {
    return route.name === screenName || 
           (route.name === 'PostsList' && screenName === 'Posts') ||
           (route.name === 'ChatBot' && screenName === 'ChatBot') ||
           (route.name === 'ProfileScreen' && screenName === 'ProfileScreen' && isAuthenticated) ||
           (route.name === 'Login' && screenName === 'Login' && !isAuthenticated);
  };

  const handleNavigation = (screenName) => {
    try {
      navigation.navigate(screenName);
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  return (
    <View style={[styles.horizontalContainer, style]}>
      {navigationItems.map((item) => (
        <TouchableOpacity
          key={item.name}
          style={[
            styles.horizontalNavItem,
            isActive(item.screen) && styles.activeHorizontalNavItem
          ]}
          onPress={() => handleNavigation(item.screen)}
          activeOpacity={0.7}
        >
          <Feather
            name={item.icon}
            size={20}
            color={isActive(item.screen) ? '#007bff' : '#666'}
          />
          <Text
            style={[
              styles.horizontalNavLabel,
              isActive(item.screen) && styles.activeHorizontalNavLabel
            ]}
          >
            {item.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// Floating Action Button Navigation
const FloatingNavigationBar = ({ style }) => {
  const navigation = useNavigation();
  const { bottom } = useSafeAreaInsets();
  
  const quickActions = [
    { icon: 'home', screen: 'Home', color: '#6c757d' },
    { icon: 'book', screen: 'Posts', color: '#6c757d' },
    { icon: 'plus', screen: 'AddPost', color: '#28a745' },
    { icon: 'message-circle', screen: 'ChatBot', color: '#007bff' }
  ];

  return (
    <View style={[
      styles.floatingContainer, 
      { bottom: bottom > 0 ? bottom + 20 : 20 },
      style
    ]}>
      {quickActions.map((action, index) => (
        <TouchableOpacity
          key={index}
          style={[styles.floatingButton, { backgroundColor: action.color }]}
          onPress={() => navigation.navigate(action.screen)}
          activeOpacity={0.8}
        >
          <Feather name={action.icon} size={24} color="white" />
        </TouchableOpacity>
      ))}
    </View>
  );
};

// Updated PageWrapper that works with your ScreenWrapper
const PageWrapper = ({ 
  children, 
  showNavigation = true, 
  navigationStyle = 'bottom',
  backgroundColor = 'white',
  style 
}) => {
  const renderNavigation = () => {
    if (!showNavigation) return null;

    switch (navigationStyle) {
      case 'top':
        return <HorizontalNavigationBar style={styles.topNav} />;
      case 'floating':
        return <FloatingNavigationBar />;
      case 'both':
        return (
          <>
            <HorizontalNavigationBar style={styles.topNav} />
            <NavigationBar />
          </>
        );
      case 'bottom':
      default:
        return <NavigationBar />;
    }
  };

  return (
    <ScreenWrapper bg={backgroundColor}>
      <View style={[styles.pageContainer, style]}>
        {navigationStyle === 'top' || navigationStyle === 'both' ? (
          <HorizontalNavigationBar style={styles.topNav} />
        ) : null}
        
        <View style={[
          styles.content,
          { 
            paddingBottom: (navigationStyle === 'bottom' || navigationStyle === 'both') ? 90 : 20,
            flex: 1
          }
        ]}>
          {children}
        </View>
        
        {(navigationStyle === 'bottom' || navigationStyle === 'both') && <NavigationBar />}
        {navigationStyle === 'floating' && <FloatingNavigationBar />}
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  pageContainer: {
    flex: 1,
  },
  
  // Bottom Navigation Styles
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingVertical: 10,
    paddingHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  
  // Top Navigation Styles
  topContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 10,
    paddingHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  
  activeNavItem: {
    backgroundColor: '#f0f8ff',
  },
  
  navLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    fontWeight: '500',
  },
  
  activeNavLabel: {
    color: '#007bff',
    fontWeight: '600',
  },

  // Horizontal Navigation Styles
  horizontalContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 25,
    marginHorizontal: 20,
    marginVertical: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 5,
  },
  
  horizontalNavItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  
  activeHorizontalNavItem: {
    backgroundColor: '#f0f8ff',
  },
  
  horizontalNavLabel: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
    fontWeight: '500',
  },
  
  activeHorizontalNavLabel: {
    color: '#007bff',
    fontWeight: '600',
  },

  // Floating Navigation Styles
  floatingContainer: {
    position: 'absolute',
    right: 20,
    alignItems: 'center',
  },
  
  floatingButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },

  // PageWrapper styles
  topNav: {
    marginTop: 0,
  },
  
  content: {
    flex: 1,
  },
});

export { NavigationBar, HorizontalNavigationBar, FloatingNavigationBar, PageWrapper };