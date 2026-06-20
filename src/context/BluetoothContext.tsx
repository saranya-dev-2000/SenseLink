import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { State } from 'react-native-ble-plx';
import BluetoothService, {
  BluetoothDeviceInfo,
} from '../services/BluetoothService';

export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'disconnecting';

type BluetoothContextValue = {
  bluetoothEnabled: boolean;
  loading: boolean;
  scanning: boolean;
  devices: BluetoothDeviceInfo[];
  connectedDevice: BluetoothDeviceInfo | null;
  connectionStatus: ConnectionStatus;
  error: string | null;
  requestPermissions: () => Promise<boolean>;
  startScan: () => Promise<void>;
  stopScan: () => void;
  connectDevice: (deviceId: string) => Promise<void>;
  disconnectDevice: () => Promise<void>;
};

const BluetoothContext = createContext<BluetoothContextValue | undefined>(
  undefined,
);

export function BluetoothProvider({ children }: PropsWithChildren) {
  const [bluetoothEnabled, setBluetoothEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<BluetoothDeviceInfo[]>([]);
  const [connectedDevice, setConnectedDevice] =
    useState<BluetoothDeviceInfo | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const subscription = BluetoothService.onStateChange(state => {
      setBluetoothEnabled(state === State.PoweredOn);
    });

    return () => {
      subscription.remove();
      BluetoothService.destroy();
    };
  }, []);

  const requestPermissions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const granted = await BluetoothService.requestPermissions();

      if (!granted) {
        setError('Bluetooth permissions are required to scan for sensors.');
      }

      return granted;
    } catch (permissionError) {
      console.warn('Bluetooth permission request failed:', permissionError);
      setError('Unable to request Bluetooth permissions.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const stopScan = useCallback(() => {
    BluetoothService.stopScan();
    setScanning(false);
  }, []);

  const startScan = useCallback(async () => {
    setError(null);
    setDevices([]);

    const hasPermissions = await requestPermissions();
    if (!hasPermissions) {
      return;
    }

    const enabled = await BluetoothService.isBluetoothPoweredOn();
    setBluetoothEnabled(enabled);

    if (!enabled) {
      setError('Bluetooth is turned off. Enable Bluetooth to scan for sensors.');
      return;
    }

    try {
      setScanning(true);
      BluetoothService.startScan(
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
        const device = await BluetoothService.connectToDevice(
          deviceId,
          disconnectedDevice => {
            console.log('Bluetooth device disconnected:', disconnectedDevice?.id);
            setConnectedDevice(null);
            setConnectionStatus('disconnected');
          },
        );

        setConnectedDevice(device);
        setConnectionStatus('connected');
      } catch (connectionError) {
        console.warn('Bluetooth connection failed:', connectionError);
        setError('Unable to connect to the selected device.');
        setConnectedDevice(null);
        setConnectionStatus('disconnected');
      }
    },
    [stopScan],
  );

  const disconnectDevice = useCallback(async () => {
    setError(null);
    setConnectionStatus('disconnecting');

    try {
      await BluetoothService.disconnectDevice();
      setConnectedDevice(null);
      setConnectionStatus('disconnected');
    } catch (disconnectError) {
      console.warn('Bluetooth disconnect failed:', disconnectError);
      setError('Unable to disconnect from the selected device.');
      setConnectionStatus(connectedDevice ? 'connected' : 'disconnected');
    }
  }, [connectedDevice]);

  const value = useMemo(
    () => ({
      bluetoothEnabled,
      loading,
      scanning,
      devices,
      connectedDevice,
      connectionStatus,
      error,
      requestPermissions,
      startScan,
      stopScan,
      connectDevice,
      disconnectDevice,
    }),
    [
      bluetoothEnabled,
      loading,
      scanning,
      devices,
      connectedDevice,
      connectionStatus,
      error,
      requestPermissions,
      startScan,
      stopScan,
      connectDevice,
      disconnectDevice,
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
