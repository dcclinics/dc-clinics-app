import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import HomeScreen from './screens/HomeScreen';
import BookScreen from './screens/BookScreen';
import VideosScreen from './screens/VideosScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#2F6B5E',
          tabBarInactiveTintColor: '#8B938F'
        }}
      >
        <Tab.Screen name="Inicio" component={HomeScreen} />
        <Tab.Screen name="Agendar" component={BookScreen} />
        <Tab.Screen name="Videos" component={VideosScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
