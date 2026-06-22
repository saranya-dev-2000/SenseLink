export type BluetoothDeviceInfo = {
  id: string;
  name: string;
  rssi: number | null;
};

export type BluetoothConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected';

export type CommunicationLog = {
  id: string;
  type: 'sent' | 'received';
  message: string;
  timestamp: Date;
};

export type SensorData = {
  temperature: number | null;
  humidity: number | null;
  battery: number | null;
  rawMessage: string;
};

export type BluetoothNotificationHandler = (message: string) => void;
export type BluetoothErrorHandler = (error: Error) => void;
export type BluetoothScanHandler = (devices: BluetoothDeviceInfo[]) => void;

export interface IBluetoothService {
  connect(deviceId: string): Promise<BluetoothDeviceInfo>;
  disconnect(): Promise<void>;
  startScan(
    onDevicesUpdated: BluetoothScanHandler,
    onError?: BluetoothErrorHandler,
  ): void;
  stopScan(): void;
  sendCommand(command: string): Promise<string | null>;
  startNotification(
    onDataReceived: BluetoothNotificationHandler,
    onError?: BluetoothErrorHandler,
  ): void;
  stopNotification(): void;
  getConnectionStatus(): BluetoothConnectionStatus;
  getConnectedDevice(): BluetoothDeviceInfo | null;
  destroy(): void;
}
