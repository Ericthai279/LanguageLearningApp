import React from "react";
import { Pressable, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { theme } from "../constrants/theme";

const Button = ({
  buttonStyle,
  textStyle,
  title = "",
  onPress = () => {},
  loading = false,
  hasShadow = true,
}) => {
  const shadowStyle = hasShadow
    ? {
        shadowColor: theme.colors.dark,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
      }
    : {};

  if (loading) {
    return (
      <View style={[styles.button, buttonStyle, { backgroundColor: "white" }, shadowStyle]}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <Pressable onPress={onPress} style={[styles.button, buttonStyle, shadowStyle]}>
      <Text style={[styles.text, textStyle]}>{title}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: theme.colors.primary,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: theme.radius.xl,
  },
  text: {
    fontSize: 20,
    color: "white",
    fontWeight: theme.fonts.bold,
  },
});

export default Button;
