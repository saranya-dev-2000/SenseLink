import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Chip, Text } from 'react-native-paper';
import { colors } from '../constants/colors';
import { theme } from '../constants/theme';
import { BluetoothDeviceInfo } from '../services/interfaces/IBluetoothService';

type DeviceCardProps = {
  device: BluetoothDeviceInfo;
  isConnected: boolean;
  isConnecting: boolean;
  onConnect: (deviceId: string) => void;
  onDisconnect: () => void;
};

function getSignalLabel(rssi: number | null) {
  if (rssi === null) {
    return 'Signal unknown';
  }

  if (rssi >= -60) {
    return `Strong (${rssi} dBm)`;
  }

  if (rssi >= -80) {
    return `Medium (${rssi} dBm)`;
  }

  return `Weak (${rssi} dBm)`;
}

export function DeviceCard({
  device,
  isConnected,
  isConnecting,
  onConnect,
  onDisconnect,
}: DeviceCardProps) {
  return (
    <Card mode="contained" style={styles.card}>
      <Card.Content>
        <View style={styles.header}>
          <View style={styles.deviceInfo}>
            <Text variant="titleMedium" style={styles.deviceName}>
              {device.name}
            </Text>
            <Text variant="bodySmall" style={styles.deviceId}>
              {device.id}
            </Text>
          </View>

          <Chip
            compact
            style={[styles.statusChip, isConnected && styles.connectedChip]}
            textStyle={styles.statusText}>
            {isConnected ? 'Connected' : 'Available'}
          </Chip>
        </View>

        <Text variant="bodyMedium" style={styles.signal}>
          RSSI: {getSignalLabel(device.rssi)}
        </Text>

        <Button
          mode={isConnected ? 'outlined' : 'contained'}
          loading={isConnecting}
          disabled={isConnecting}
          buttonColor={isConnected ? undefined : colors.primary}
          textColor={isConnected ? colors.error : colors.text}
          style={styles.button}
          onPress={() =>
            isConnected ? onDisconnect() : onConnect(device.id)
          }>
          {isConnected ? 'Disconnect' : 'Connect'}
        </Button>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: '#30363D',
    borderWidth: 1,
    marginBottom: theme.spacing.md,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: theme.spacing.md,
    justifyContent: 'space-between',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    color: colors.text,
    fontWeight: '700',
  },
  deviceId: {
    color: colors.textGrey,
    marginTop: theme.spacing.xs,
  },
  statusChip: {
    backgroundColor: '#21262D',
  },
  connectedChip: {
    backgroundColor: colors.success,
  },
  statusText: {
    color: colors.text,
    fontSize: 12,
  },
  signal: {
    color: colors.textGrey,
    marginTop: theme.spacing.md,
  },
  button: {
    borderColor: colors.error,
    marginTop: theme.spacing.md,
  },
});
