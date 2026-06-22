import type { ComponentProps } from 'react';
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';
import { StatusBar, StyleSheet, View } from 'react-native';
import { MD3DarkTheme, PaperProvider } from 'react-native-paper';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { colors } from './src/constants/colors';
import { BluetoothProvider } from './src/context/BluetoothContext';
import { AppNavigator } from './src/navigation/AppNavigator';

const paperTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.primary,
    background: colors.background,
    surface: colors.card,
    error: colors.error,
    onSurface: colors.text,
    onBackground: colors.text,
  },
};

type PaperProviderSettings = ComponentProps<typeof PaperProvider>['settings'];
type MaterialDesignIconName = ComponentProps<typeof MaterialDesignIcons>['name'];

const paperSettings: PaperProviderSettings = {
  icon: ({ name, color, size, testID }) => (
    <MaterialDesignIcons
      name={name as MaterialDesignIconName}
      color={color}
      size={size}
      testID={testID}
    />
  ),
};

function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={paperTheme} settings={paperSettings}>
        <BluetoothProvider>
          <StatusBar
            barStyle="light-content"
            backgroundColor={colors.background}
          />
          <AppContent />
        </BluetoothProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

function AppContent() {
  const safeAreaInsets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: safeAreaInsets.bottom,
          paddingTop: safeAreaInsets.top,
        },
      ]}>
      <AppNavigator />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
});

export default App;
