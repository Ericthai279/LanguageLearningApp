import { StyleSheet, TextInput, View } from 'react-native';
import React from 'react';
import { theme } from '../constrants/theme';

const Input = ({ leftIcon, containerStyles, inputRef, children, ...rest }) => {
  return (
    <View style={[styles.container, containerStyles]}>
      {leftIcon}
      <TextInput
        style={styles.textInput}
        placeholderTextColor={theme.colors.textLight}
        ref={inputRef}
        {...rest}
      />
    </View>
  );
};

export default Input;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 50, 
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.4,
    borderColor: theme.colors.text,
    borderRadius: theme.radius.xxl,
    borderCurve: 'continuous',
    paddingHorizontal: 18,
    gap: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16, 
  },
});
