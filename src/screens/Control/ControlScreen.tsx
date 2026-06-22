import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Button, Card, Chip, Icon, Text, TextInput } from 'react-native-paper';
import { colors } from '../../constants/colors';
import { theme } from '../../constants/theme';
import { useBluetooth } from '../../context/BluetoothContext';

const QUICK_COMMANDS = [
  { label: 'LED ON', icon: 'lightbulb-on-outline' },
  { label: 'LED OFF', icon: 'lightbulb-off-outline' },
  { label: 'READ SENSOR', icon: 'chart-line' },
  { label: 'RESET', icon: 'restart' },
] as const;

function formatLastUpdated(timestamp: Date | null) {
  if (!timestamp) {
    return 'Not updated yet';
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(timestamp);
}

function getTemperatureStatus(value: number | null) {
  if (value === null) {
    return 'Waiting';
  }

  if (value >= 32 && value < 35) {
    return 'Warning';
  }

  if (value >= 35 || value < 20) {
    return 'Critical';
  }

  return 'Normal';
}

function getHumidityStatus(value: number | null) {
  if (value === null) {
    return 'Waiting';
  }

  if (value < 50) {
    return 'Low';
  }

  if (value > 80) {
    return 'High';
  }

  return 'Good';
}

function getBatteryStatus(value: number | null) {
  if (value === null) {
    return 'Waiting';
  }

  return value >= 70 ? 'Healthy' : 'Low';
}

type SensorMetricProps = {
  icon: string;
  label: string;
  value: string;
  status: string;
};

function SensorMetric({ icon, label, value, status }: SensorMetricProps) {
  const isWarning = status === 'Warning' || status === 'Low' || status === 'High';
  const isCritical = status === 'Critical';

  return (
    <View style={styles.metricTile}>
      <View style={styles.metricHeader}>
        <Icon source={icon} color={colors.primary} size={20} />
        <Text variant="labelMedium" style={styles.metricLabel}>
          {label}
        </Text>
      </View>
      <Text variant="titleLarge" style={styles.metricValue}>
        {value}
      </Text>
      <Text
        variant="bodySmall"
        style={[
          styles.metricStatus,
          isWarning && styles.metricWarning,
          isCritical && styles.metricCritical,
        ]}>
        {status}
      </Text>
    </View>
  );
}

export function ControlScreen() {
  const {
    connectedDevice,
    connectionStatus,
    communicationStatus,
    latestSensorData,
    latestData,
    writeCommand,
  } = useBluetooth();
  const [command, setCommand] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const sensorOpacity = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.45)).current;

  const isConnected = connectionStatus === 'connected' && Boolean(connectedDevice);
  const isSending = communicationStatus === 'sending';
  const hasFormattedSensorData = Boolean(
    latestSensorData &&
      (latestSensorData.temperature !== null ||
        latestSensorData.humidity !== null ||
        latestSensorData.battery !== null),
  );
  const sensorAnimatedStyle = {
    opacity: sensorOpacity,
    transform: [
      {
        scale: sensorOpacity.interpolate({
          inputRange: [0.96, 1],
          outputRange: [0.99, 1],
        }),
      },
    ],
  };

  useEffect(() => {
    if (!latestSensorData) {
      return;
    }

    setLastUpdated(new Date());
    sensorOpacity.setValue(0.96);
    Animated.timing(sensorOpacity, {
      duration: 220,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [latestSensorData, sensorOpacity]);

  useEffect(() => {
    if (!isConnected) {
      pulseOpacity.setValue(0);
      return;
    }

    pulseOpacity.setValue(0.45);
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseOpacity, {
          duration: 900,
          toValue: 0.9,
          useNativeDriver: true,
        }),
        Animated.timing(pulseOpacity, {
          duration: 900,
          toValue: 0.45,
          useNativeDriver: true,
        }),
      ]),
    );

    pulse.start();

    return () => {
      pulse.stop();
    };
  }, [isConnected, pulseOpacity]);

  const handleSendCommand = useCallback(
    async (commandValue: string) => {
      const trimmedCommand = commandValue.trim();

      if (!trimmedCommand || !isConnected) {
        return;
      }

      try {
        await writeCommand(trimmedCommand);
        setCommand('');
      } catch {
        // BluetoothContext owns user-facing error state.
      }
    },
    [isConnected, writeCommand],
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Control Dashboard
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Send commands and monitor live sensor telemetry.
        </Text>
      </View>

      <Card mode="contained" style={styles.card}>
        <Card.Content>
          <View style={styles.statusHeader}>
            <View style={styles.statusInfo}>
              <Text variant="labelLarge" style={styles.sectionLabel}>
                Device Status
              </Text>
              <Text variant="titleLarge" style={styles.deviceName}>
                {connectedDevice?.name ?? 'No device connected'}
              </Text>
              <Text variant="bodySmall" style={styles.deviceId}>
                {connectedDevice?.id ?? 'Connect from Scan to enable controls'}
              </Text>
            </View>
            <View style={styles.onlineBadgeWrap}>
              {isConnected ? (
                <Animated.View
                  style={[styles.onlineGlow, { opacity: pulseOpacity }]}
                />
              ) : null}
              <View
                style={[
                  styles.onlineBadge,
                  isConnected ? styles.onlineBadgeActive : styles.onlineBadgeOff,
                ]}>
                <View
                  style={[
                    styles.onlineDot,
                    isConnected ? styles.onlineDotActive : styles.onlineDotOff,
                  ]}
                />
                <Text style={styles.onlineBadgeText}>
                  {isConnected ? 'ONLINE' : 'OFFLINE'}
                </Text>
              </View>
            </View>
          </View>

          <Chip
            compact
            style={[styles.statusChip, isConnected && styles.connectedChip]}
            textStyle={styles.statusChipText}>
            {connectionStatus.toUpperCase()}
          </Chip>
        </Card.Content>
      </Card>

      <Animated.View style={sensorAnimatedStyle}>
        <Card mode="contained" style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Text variant="titleMedium" style={styles.cardTitle}>
                Live Sensor Data
              </Text>
              <Text variant="bodySmall" style={styles.lastUpdated}>
                Last updated: {formatLastUpdated(lastUpdated)}
              </Text>
            </View>
            {hasFormattedSensorData ? (
              <View style={styles.metricGrid}>
                <SensorMetric
                  icon="thermometer"
                  label="Temp"
                  value={`${latestSensorData?.temperature ?? '--'}°C`}
                  status={getTemperatureStatus(latestSensorData?.temperature ?? null)}
                />
                <SensorMetric
                  icon="water-percent"
                  label="Humidity"
                  value={`${latestSensorData?.humidity ?? '--'}%`}
                  status={getHumidityStatus(latestSensorData?.humidity ?? null)}
                />
                <SensorMetric
                  icon="battery-high"
                  label="Battery"
                  value={`${latestSensorData?.battery ?? '--'}%`}
                  status={getBatteryStatus(latestSensorData?.battery ?? null)}
                />
              </View>
            ) : (
              <Text variant="bodyLarge" style={styles.liveData}>
                {latestData ?? 'Waiting for live sensor data...'}
              </Text>
            )}
          </Card.Content>
        </Card>
      </Animated.View>

      {!isConnected ? (
        <Card mode="contained" style={styles.warningCard}>
          <Card.Content>
            <Text variant="bodyMedium" style={styles.warningText}>
              Connect to the mock ESP32 device from the Scan screen to enable
              command controls.
            </Text>
          </Card.Content>
        </Card>
      ) : null}

      <Card mode="contained" style={styles.card}>
        <Card.Content>
          <View style={styles.commandHeader}>
            <Icon source="console-line" color={colors.primary} size={22} />
            <Text variant="titleMedium" style={styles.cardTitle}>
              Custom Command
            </Text>
          </View>
          <TextInput
            mode="outlined"
            label="Enter command"
            value={command}
            disabled={!isConnected}
            outlineColor="#30363D"
            activeOutlineColor={colors.primary}
            textColor={colors.text}
            style={styles.input}
            onChangeText={setCommand}
          />
          <Button
            mode="contained"
            loading={isSending}
            disabled={!isConnected || !command.trim() || isSending}
            buttonColor={colors.primary}
            textColor={colors.text}
            style={styles.sendButton}
            onPress={() => {
              handleSendCommand(command).catch(() => undefined);
            }}>
            Send Command
          </Button>
        </Card.Content>
      </Card>

      <Card mode="contained" style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.cardTitle}>
            Quick Commands
          </Text>
          <View style={styles.quickGrid}>
            {QUICK_COMMANDS.map(quickCommand => (
              <Button
                key={quickCommand.label}
                icon={quickCommand.icon}
                mode="contained-tonal"
                disabled={!isConnected || isSending}
                textColor={colors.text}
                style={styles.quickButton}
                contentStyle={styles.quickButtonContent}
                onPress={() => {
                  handleSendCommand(quickCommand.label).catch(() => undefined);
                }}>
                {quickCommand.label}
              </Button>
            ))}
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
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
  statusHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
    justifyContent: 'space-between',
  },
  statusInfo: {
    flex: 1,
  },
  sectionLabel: {
    color: colors.textGrey,
  },
  deviceName: {
    color: colors.text,
    fontWeight: '800',
    marginTop: theme.spacing.xs,
  },
  deviceId: {
    color: '#C9D1D9',
    fontWeight: '600',
    marginTop: theme.spacing.xs,
  },
  onlineBadgeWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
  },
  onlineGlow: {
    backgroundColor: colors.success,
    borderRadius: theme.radius.lg,
    bottom: -4,
    left: -6,
    position: 'absolute',
    right: -6,
    top: -4,
  },
  onlineBadge: {
    alignItems: 'center',
    borderRadius: theme.radius.lg,
    flexDirection: 'row',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  onlineBadgeActive: {
    backgroundColor: '#063D22',
    borderColor: colors.success,
    borderWidth: 1,
  },
  onlineBadgeOff: {
    backgroundColor: '#30363D',
    borderColor: '#484F58',
    borderWidth: 1,
  },
  onlineDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  onlineDotActive: {
    backgroundColor: colors.success,
  },
  onlineDotOff: {
    backgroundColor: colors.textGrey,
  },
  onlineBadgeText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#21262D',
    marginTop: theme.spacing.md,
  },
  connectedChip: {
    backgroundColor: colors.success,
  },
  statusChipText: {
    color: colors.text,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.card,
    borderColor: '#30363D',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    elevation: 3,
    marginBottom: theme.spacing.md,
  },
  warningCard: {
    backgroundColor: '#2D2513',
    borderColor: '#7C5D12',
    borderWidth: 1,
    marginBottom: theme.spacing.md,
  },
  warningText: {
    color: colors.text,
  },
  cardTitle: {
    color: colors.text,
    fontWeight: '700',
  },
  sectionHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: theme.spacing.md,
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  lastUpdated: {
    color: colors.textGrey,
    fontSize: 11,
    flexShrink: 0,
    marginTop: 2,
  },
  commandHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  input: {
    backgroundColor: colors.background,
  },
  sendButton: {
    borderRadius: theme.radius.md,
    marginTop: theme.spacing.md,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  quickButton: {
    backgroundColor: '#1F6FEB',
    borderRadius: theme.radius.md,
    flexGrow: 1,
    minWidth: '46%',
  },
  quickButtonContent: {
    minHeight: 48,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  metricTile: {
    backgroundColor: colors.background,
    borderColor: '#30363D',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    elevation: 1,
    flexBasis: '31%',
    flexGrow: 1,
    minWidth: 98,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
  },
  metricHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  metricLabel: {
    color: colors.textGrey,
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  metricValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
    marginTop: theme.spacing.xs,
  },
  metricStatus: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '700',
    marginTop: theme.spacing.xs,
  },
  metricWarning: {
    color: '#F59E0B',
  },
  metricCritical: {
    color: colors.error,
  },
  liveData: {
    color: colors.text,
    lineHeight: 26,
  },
});
