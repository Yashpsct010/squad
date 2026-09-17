import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppProvider, useApp } from './src/context/AppContext';
import AuthSetupScreen from './src/screens/AuthSetupScreen';
import SquadChatScreen from './src/screens/SquadChatScreen';
import LogAchievementScreen from './src/screens/LogAchievementScreen';
import InsightsChartsScreen from './src/screens/InsightsChartsScreen';
import SquadMembersScreen from './src/screens/SquadMembersScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function CustomTabBar({ state, descriptors, navigation }: any) {
  return (
    <View style={styles.tabBarContainer}>
      {state.routes.map((route: any, index: number) => {
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        let iconName: any = 'chatbubbles-outline';
        let label = 'Feed';
        if (route.name === 'Feed') {
          iconName = isFocused ? 'chatbubbles' : 'chatbubbles-outline';
          label = 'Feed';
        } else if (route.name === 'Insights') {
          iconName = isFocused ? 'stats-chart' : 'stats-chart-outline';
          label = 'Insights';
        } else if (route.name === 'Squad') {
          iconName = isFocused ? 'people' : 'people-outline';
          label = 'Squad';
        }

        const iconColor = isFocused ? '#111827' : '#9ca3af';

        return (
          <TouchableOpacity
            key={route.key}
            style={styles.tabItem}
            onPress={onPress}
            activeOpacity={0.7}
          >
            <Ionicons name={iconName} size={22} color={iconColor} style={{ marginBottom: 2 }} />
            <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function BottomTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Feed" component={SquadChatScreen} />
      <Tab.Screen name="Insights" component={InsightsChartsScreen} />
      <Tab.Screen name="Squad" component={SquadMembersScreen} />
    </Tab.Navigator>
  );
}

function MainNavigation() {
  const { currentUser, currentSquad } = useApp();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!currentUser || !currentSquad ? (
        <Stack.Screen name="AuthSetup" component={AuthSetupScreen} />
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={BottomTabs} />
          <Stack.Screen
            name="LogAchievement"
            component={LogAchievementScreen}
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AppProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <MainNavigation />
      </NavigationContainer>
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    height: 72,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    minWidth: 60,
  },
  tabIcon: {
    fontSize: 20,
    color: '#9ca3af',
    marginBottom: 2,
  },
  tabIconActive: {
    color: '#111827',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9ca3af',
  },
  tabLabelActive: {
    color: '#111827',
    fontWeight: '700',
  },
});
