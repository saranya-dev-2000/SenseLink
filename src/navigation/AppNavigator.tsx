import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Icon } from 'react-native-paper';
import { colors } from '../constants/colors';
import { ControlScreen } from '../screens/Control/ControlScreen';
import { LogsScreen } from '../screens/Logs/LogsScreen';
import { ScanScreen } from '../screens/Scan/ScanScreen';

export type RootTabParamList = {
  Scan: undefined;
  Control: undefined;
  Logs: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.card,
    text: colors.text,
    border: '#30363D',
    notification: colors.primary,
  },
};

const tabScreenOptions = ({ route }: { route: { name: keyof RootTabParamList } }) => ({
  headerShown: false,
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.textGrey,
  tabBarLabelStyle: {
    fontSize: 12,
    fontWeight: '700' as const,
    paddingBottom: 4,
  },
  tabBarStyle: {
    backgroundColor: colors.card,
    borderTopColor: '#30363D',
    height: 68,
    paddingTop: 8,
  },
  tabBarIcon: ({ color, size }: { color: string; size: number }) => {
    const iconName =
      route.name === 'Scan'
        ? 'bluetooth'
        : route.name === 'Control'
          ? 'tune-variant'
          : 'clipboard-text-clock-outline';

    return <Icon source={iconName} color={color} size={size} />;
  },
});

export function AppNavigator() {
  return (
    <NavigationContainer theme={navigationTheme}>
      <Tab.Navigator screenOptions={tabScreenOptions}>
        <Tab.Screen name="Scan" component={ScanScreen} />
        <Tab.Screen name="Control" component={ControlScreen} />
        <Tab.Screen name="Logs" component={LogsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
