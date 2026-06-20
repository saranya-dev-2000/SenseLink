import { StatusBar, StyleSheet, View } from 'react-native';
import { MD3DarkTheme, PaperProvider } from 'react-native-paper';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { colors } from './src/constants/colors';
import { BluetoothProvider } from './src/context/BluetoothContext';
import { ScanScreen } from './src/screens/Scan/ScanScreen';

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

function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={paperTheme}>
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
      <ScanScreen />
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
