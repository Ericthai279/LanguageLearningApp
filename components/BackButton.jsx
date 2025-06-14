import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import AntDesign from '@expo/vector-icons/AntDesign';

const BackButton = () => {
  return (
    <View>
      <AntDesign name="arrowleft" size={24} color="black" />
    </View>
  )
}

export default BackButton

const styles = StyleSheet.create({})