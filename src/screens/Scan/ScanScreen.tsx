import React, { useCallback } from 'react';
import { FlatList, ListRenderItem, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import { DeviceCard } from '../../components/DeviceCard';
import { colors } from '../../constants/colors';
import { theme } from '../../constants/theme';
import { useBluetooth } from '../../context/BluetoothContext';
import { BluetoothDeviceInfo } from '../../services/BluetoothService';

export function ScanScreen() {
  const {
    bluetoothEnabled,
    loading,
    scanning,
    devices,
    connectedDevice,
    connectionStatus,
    error,
    startScan,
    stopScan,
    connectDevice,
    disconnectDevice,
  } = useBluetooth();

  const isConnecting = connectionStatus === 'connecting';

  const handleScanPress = useCallback(() => {
    if (scanning) {
      stopScan();
      return;
    }

    startScan().catch(scanError => {
      console.warn('Scan action failed:', scanError);
    });
  }, [scanning, startScan, stopScan]);

  const renderDevice: ListRenderItem<BluetoothDeviceInfo> = ({ item }) => (
    <DeviceCard
      device={item}
      isConnected={connectedDevice?.id === item.id}
      isConnecting={isConnecting && connectedDevice?.id !== item.id}
      onConnect={deviceId => {
        connectDevice(deviceId).catch(connectionError => {
          console.warn('Connect action failed:', connectionError);
        });
      }}
      onDisconnect={() => {
        disconnectDevice().catch(disconnectError => {
          console.warn('Disconnect action failed:', disconnectError);
        });
      }}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Scan Sensors
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Find nearby Bluetooth sensor devices and connect for live control.
        </Text>
      </View>

      <View style={styles.statusCard}>
        <Text variant="labelLarge" style={styles.statusLabel}>
          Bluetooth Status
        </Text>
        <Text
          variant="titleMedium"
          style={[
            styles.statusValue,
            bluetoothEnabled ? styles.enabled : styles.disabled,
          ]}>
          {bluetoothEnabled ? 'Enabled' : 'Disabled'}
        </Text>
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Text variant="bodyMedium" style={styles.errorText}>
            {error}
          </Text>
        </View>
      ) : null}

      <Button
        mode="contained"
        loading={loading || scanning}
        buttonColor={scanning ? colors.error : colors.primary}
        textColor={colors.text}
        style={styles.scanButton}
        onPress={handleScanPress}>
        {scanning ? 'Stop Scanning' : 'Start Scanning'}
      </Button>

      {scanning ? (
        <View style={styles.scanningRow}>
          <ActivityIndicator color={colors.primary} />
          <Text variant="bodyMedium" style={styles.scanningText}>
            Searching for nearby sensors...
          </Text>
        </View>
      ) : null}

      <FlatList
        data={devices}
        keyExtractor={item => item.id}
        renderItem={renderDevice}
        contentContainerStyle={[
          styles.listContent,
          devices.length === 0 && styles.emptyListContent,
        ]}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text variant="titleMedium" style={styles.emptyTitle}>
              No devices found
            </Text>
            <Text variant="bodyMedium" style={styles.emptyText}>
              Start scanning to discover nearby Bluetooth sensor devices.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
    padding: theme.spacing.lg,
  },
  header: {
    marginBottom: theme.spacing.lg,
  },
  title: {
    color: colors.text,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textGrey,
    marginTop: theme.spacing.sm,
  },
  statusCard: {
    backgroundColor: colors.card,
    borderColor: '#30363D',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  statusLabel: {
    color: colors.textGrey,
  },
  statusValue: {
    fontWeight: '700',
    marginTop: theme.spacing.xs,
  },
  enabled: {
    color: colors.success,
  },
  disabled: {
    color: colors.error,
  },
  errorCard: {
    backgroundColor: '#2D1517',
    borderColor: colors.error,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  errorText: {
    color: colors.text,
  },
  scanButton: {
    marginBottom: theme.spacing.md,
  },
  scanningRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  scanningText: {
    color: colors.textGrey,
  },
  listContent: {
    paddingBottom: theme.spacing.xl,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: '#30363D',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: theme.spacing.lg,
    padding: theme.spacing.xl,
  },
  emptyTitle: {
    color: colors.text,
    fontWeight: '700',
  },
  emptyText: {
    color: colors.textGrey,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
});
