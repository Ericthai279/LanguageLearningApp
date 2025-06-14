import { View, Text } from 'react-native';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ScreenWrapper = ({ children, bg }) => {
  const { top } = useSafeAreaInsets();
  const paddingTop = top > 0 ? top + 5 : 30;

  // Wrap any string children in a <Text> component
  const renderChildren = React.Children.map(children, (child) => {
    return typeof child === 'string' ? <Text>{child}</Text> : child;
  });

  return (
    <View style={{ flex: 1, paddingTop, backgroundColor: bg }}>
      {renderChildren}
    </View>
  );
};

export default ScreenWrapper;
