import React from "react";
import { View, Image, Text, StyleSheet, Pressable } from "react-native";
import ScreenWrapper from "../components/screenwraper";
import { StatusBar } from "expo-status-bar";
import { theme } from "../constrants/theme";
import Button from "../components/Button";

const WelcomeScreen = () => {
  return (
    <ScreenWrapper bg="white">
      <StatusBar style="dark" />
      <View style={styles.container}>
        <Image
          style={styles.welcomeImage}
          resizeMode="contain"
          source={require("../images/WelcomeImage.jpg")}
        />
        <View style={{ gap: 20 }}>
          <Text style={styles.title}>Social</Text>
          <Text style={styles.punchline}>Where everyone learn and develop.</Text>
        </View>

        <View style={styles.footer}>
          <Button
            title="Dive into the world of knowledge"
            buttonStyle={{ marginHorizontal: 12 }} // Replaced wp(3)
            onPress={() => navigation.navigate("SignUp")} // Fixed onpress to onPress
          />
        </View>
        <View style={styles.bottomTextContainer}>
          <Text style={styles.loginText}>Already have an account!</Text>
          <Pressable>
            <Text
              style={[
                styles.loginText,
                {
                  color: theme.colors.primary,
                  fontWeight: theme.fonts.semibold,
                },
              ]}
            >
              Login
            </Text>
          </Pressable>
        </View>
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: 20, // Replaced wp(5)
  },
  welcomeImage: {
    height: 240, // Replaced hp(30)
    width: "100%", // Replaced wp(100)
    alignSelf: "center",
  },
  title: {
    color: theme.colors.text,
    fontSize: 32, // Replaced hp(4)
    textAlign: "center",
    fontWeight: theme.fonts.extraBold,
  },
  punchline: {
    textAlign: "center",
    paddingHorizontal: 40, // Replaced wp(10)
    fontSize: 14, // Replaced hp(1.7)
    color: theme.colors.text,
  },
  footer: {
    gap: 30,
    width: "100%",
  },
  bottomTextContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  loginText: {
    textAlign: "center",
    color: theme.colors.text,
    fontSize: 14, // Replaced hp(1.6)
  },
});

export default WelcomeScreen;