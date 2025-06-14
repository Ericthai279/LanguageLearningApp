import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { theme } from '../constrants/theme'
const loading = ({size="large", color=theme.colors.primary}) => {

  return (
    <View style ={{justifyContent:'center', alignItems:'center'}}>
      <ActivityIndicator size ={size} color={color}/>
    </View>
  )
}

export default loading

const styles = StyleSheet.create({})