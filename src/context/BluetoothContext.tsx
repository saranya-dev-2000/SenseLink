import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { MockBluetoothService } from '../services/MockBluetoothService';
import {
  BluetoothConnectionStatus,
  BluetoothDeviceInfo,
  CommunicationLog,
  IBluetoothService,
  SensorData,
} from '../services/interfaces/IBluetoothService';

export type ConnectionStatus = BluetoothConnectionStatus;

export type CommunicationStatus =
  | 'idle'
  | 'listening'
  | 'sending'
  | 'error';

export type CommunicationMessage = CommunicationLog;

const MAX_COMMUNICATION_LOGS = 100;
const bluetoothService: IBluetoothService = new MockBluetoothService();

type BluetoothContextValue = {
  bluetoothEnabled: boolean;
  loading: boolean;
  scanning: boolean;
  devices: BluetoothDeviceInfo[];
  connectedDevice: BluetoothDeviceInfo | null;
  connectionStatus: ConnectionStatus;
  latestSensorData: SensorData | null;
  communicationLogs: CommunicationLog[];
  receivedMessages: CommunicationMessage[];
  latestData: string | null;
  communicationStatus: CommunicationStatus;
  error: string | null;
  requestPermissions: () => Promise<boolean>;
  startScan: () => Promise<void>;
  stopScan: () => void;
  connectDevice: (deviceId: string) => Promise<void>;
  disconnectDevice: () => Promise<void>;
  writeCommand: (command: string) => Promise<void>;
  startNotification: () => void;
  stopNotification: () => void;
  clearCommunicationLogs: () => void;
};

const BluetoothContext = createContext<BluetoothContextValue | undefined>(
  undefined,
);

export function BluetoothProvider({ children }: PropsWithChildren) {
  const [bluetoothEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<BluetoothDeviceInfo[]>([]);
  const [connectedDevice, setConnectedDevice] =
    useState<BluetoothDeviceInfo | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('disconnected');
  const [communicationLogs, setCommunicationLogs] = useState<
    CommunicationLog[]
  >([]);
  const [latestSensorData, setLatestSensorData] = useState<SensorData | null>(
    null,
  );
  const [communicationStatus, setCommunicationStatus] =
    useState<CommunicationStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      bluetoothService.destroy();
    };
  }, []);

  const requestPermissions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      return true;
    } finally {
      setLoading(false);
    }
  }, []);

  const addCommunicationLog = useCallback(
    (type: CommunicationMessage['type'], message: string) => {
      const log: CommunicationMessage = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type,
        message,
        timestamp: new Date(),
      };

      setCommunicationLogs(previousLogs =>
        [...previousLogs, log].slice(-MAX_COMMUNICATION_LOGS),
      );
    },
    [],
  );

  const clearCommunicationLogs = useCallback(() => {
    setCommunicationLogs([]);
  }, []);

  const parseSensorData = useCallback((message: string): SensorData => {
    const sensorData: SensorData = {
      temperature: null,
      humidity: null,
      battery: null,
      rawMessage: message,
    };

    message.split(/\r?\n/).forEach(line => {
      const [key, rawValue] = line.split(':');
      const numericValue = Number(rawValue?.trim());

      if (!Number.isFinite(numericValue)) {
        return;
      }

      switch (key.trim().toUpperCase()) {
        case 'TEMP':
        case 'TEMPERATURE':
          sensorData.temperature = numericValue;
          break;
        case 'HUM':
        case 'HUMIDITY':
          sensorData.humidity = numericValue;
          break;
        case 'BAT':
        case 'BATTERY':
          sensorData.battery = numericValue;
          break;
      }
    });

    return sensorData;
  }, []);

  const stopScan = useCallback(() => {
    bluetoothService.stopScan();
    setScanning(false);
  }, []);

  const stopNotification = useCallback(() => {
    bluetoothService.stopNotification();
    setCommunicationStatus('idle');
  }, []);

  const startNotification = useCallback(() => {
    setError(null);

    try {
      bluetoothService.startNotification(
        data => {
          setLatestSensorData(parseSensorData(data));
          setCommunicationStatus('listening');
          addCommunicationLog('received', data);
        },
        notificationError => {
          console.warn('Bluetooth notification failed:', notificationError.message);
          setError(notificationError.message);
          setCommunicationStatus('error');
        },
      );

      setCommunicationStatus('listening');
    } catch (notificationError) {
      console.warn('Unable to start Bluetooth notifications:', notificationError);
      setError('Unable to start Bluetooth notifications.');
      setCommunicationStatus('error');
    }
  }, [addCommunicationLog, parseSensorData]);

  const startScan = useCallback(async () => {
    setError(null);
    setDevices([]);

    const hasPermissions = await requestPermissions();
    if (!hasPermissions) {
      return;
    }

    try {
      setScanning(true);
      bluetoothService.startScan(
        updatedDevices => {
          setDevices(updatedDevices);
        },
        scanError => {
          console.warn('Bluetooth scan failed:', scanError.message);
          setError(scanError.message);
          setScanning(false);
        },
      );
    } catch (scanError) {
      console.warn('Unable to start Bluetooth scan:', scanError);
      setError('Unable to start Bluetooth scan.');
      setScanning(false);
    }
  }, [requestPermissions]);

  const connectDevice = useCallback(
    async (deviceId: string) => {
      setError(null);
      setConnectionStatus('connecting');
      stopScan();

      try {
        const device = await bluetoothService.connect(deviceId);

        setConnectedDevice(device);
        setConnectionStatus('connected');
        setLatestSensorData(null);
        startNotification();
      } catch (connectionError) {
        console.warn('Bluetooth connection failed:', connectionError);
        setError('Unable to connect to the selected device.');
        setConnectedDevice(null);
        setConnectionStatus('disconnected');
        setLatestSensorData(null);
        setCommunicationStatus('error');
      }
    },
    [startNotification, stopScan],
  );

  const disconnectDevice = useCallback(async () => {
    setError(null);

    try {
      stopNotification();
      await bluetoothService.disconnect();
      setConnectedDevice(null);
      setConnectionStatus('disconnected');
      setLatestSensorData(null);
    } catch (disconnectError) {
      console.warn('Bluetooth disconnect failed:', disconnectError);
      setError('Unable to disconnect from the selected device.');
      setConnectionStatus(connectedDevice ? 'connected' : 'disconnected');
      setCommunicationStatus('error');
    }
  }, [connectedDevice, stopNotification]);

  const writeCommand = useCallback(
    async (command: string) => {
      setError(null);
      setCommunicationStatus('sending');

      try {
        const response = await bluetoothService.sendCommand(command);
        addCommunicationLog('sent', command);
        if (response) {
          setLatestSensorData(parseSensorData(response));
          addCommunicationLog('received', response);
        }
        setCommunicationStatus('listening');
      } catch (writeError) {
        console.warn('Bluetooth command failed:', writeError);
        setError('Unable to send Bluetooth command.');
        setCommunicationStatus('error');
        throw writeError;
      }
    },
    [addCommunicationLog, parseSensorData],
  );

  const latestData = latestSensorData?.rawMessage ?? null;
  const receivedMessages = communicationLogs;

  const value = useMemo(
    () => ({
      bluetoothEnabled,
      loading,
      scanning,
      devices,
      connectedDevice,
      connectionStatus,
      latestSensorData,
      communicationLogs,
      receivedMessages,
      latestData,
      communicationStatus,
      error,
      requestPermissions,
      startScan,
      stopScan,
      connectDevice,
      disconnectDevice,
      writeCommand,
      startNotification,
      stopNotification,
      clearCommunicationLogs,
    }),
    [
      bluetoothEnabled,
      loading,
      scanning,
      devices,
      connectedDevice,
      connectionStatus,
      latestSensorData,
      communicationLogs,
      receivedMessages,
      latestData,
      communicationStatus,
      error,
      requestPermissions,
      startScan,
      stopScan,
      connectDevice,
      disconnectDevice,
      writeCommand,
      startNotification,
      stopNotification,
      clearCommunicationLogs,
    ],
  );

  return (
    <BluetoothContext.Provider value={value}>
      {children}
    </BluetoothContext.Provider>
  );
}

export function useBluetooth() {
  const context = useContext(BluetoothContext);

  if (!context) {
    throw new Error('useBluetooth must be used within a BluetoothProvider.');
  }

  return context;
}
