import {
  BluetoothConnectionStatus,
  BluetoothDeviceInfo,
  BluetoothErrorHandler,
  BluetoothNotificationHandler,
  BluetoothScanHandler,
  IBluetoothService,
} from './interfaces/IBluetoothService';

const MOCK_DEVICE: BluetoothDeviceInfo = {
  id: 'MOCK_ESP32_001',
  name: 'SenseLink ESP32 Simulator',
  rssi: -45,
};

const CONNECTION_DELAY_MS = 2000;
const SCAN_DELAY_MS = 500;
const STREAM_INTERVAL_MS = 5000;

export class MockBluetoothService implements IBluetoothService {
  private connectionStatus: BluetoothConnectionStatus = 'disconnected';
  private connectedDevice: BluetoothDeviceInfo | null = null;
  private scanTimer: ReturnType<typeof setTimeout> | null = null;
  private connectionTimer: ReturnType<typeof setTimeout> | null = null;
  private streamTimer: ReturnType<typeof setInterval> | null = null;
  private notificationHandler: BluetoothNotificationHandler | null = null;

  startScan(
    onDevicesUpdated: BluetoothScanHandler,
    onError?: BluetoothErrorHandler,
  ): void {
    this.stopScan();

    try {
      this.scanTimer = setTimeout(() => {
        onDevicesUpdated([MOCK_DEVICE]);
      }, SCAN_DELAY_MS);
    } catch (error) {
      onError?.(this.toError(error));
    }
  }

  stopScan(): void {
    if (this.scanTimer) {
      clearTimeout(this.scanTimer);
      this.scanTimer = null;
    }
  }

  async connect(deviceId: string): Promise<BluetoothDeviceInfo> {
    if (deviceId !== MOCK_DEVICE.id) {
      throw new Error('Mock device not found.');
    }

    this.stopScan();
    this.connectionStatus = 'connecting';

    await new Promise<void>(resolve => {
      this.connectionTimer = setTimeout(() => {
        this.connectionTimer = null;
        resolve();
      }, CONNECTION_DELAY_MS);
    });

    this.connectedDevice = MOCK_DEVICE;
    this.connectionStatus = 'connected';

    return MOCK_DEVICE;
  }

  async disconnect(): Promise<void> {
    this.stopScan();
    this.stopNotification();
    this.clearConnectionTimer();
    this.connectedDevice = null;
    this.connectionStatus = 'disconnected';
  }

  async sendCommand(command: string): Promise<string | null> {
    if (this.connectionStatus !== 'connected') {
      throw new Error('No mock Bluetooth device is connected.');
    }

    const normalizedCommand = command.trim().toUpperCase();

    switch (normalizedCommand) {
      case 'LED ON':
        return 'LED STATUS: ON';
      case 'LED OFF':
        return 'LED STATUS: OFF';
      case 'READ SENSOR':
        return 'TEMP: 29\nHUM: 65\nBAT: 90';
      case 'RESET':
        return 'DEVICE RESTARTED';
      default:
        return 'UNKNOWN COMMAND';
    }
  }

  startNotification(
    onDataReceived: BluetoothNotificationHandler,
    onError?: BluetoothErrorHandler,
  ): void {
    if (this.connectionStatus !== 'connected') {
      onError?.(new Error('No mock Bluetooth device is connected.'));
      return;
    }

    this.stopNotification();
    this.notificationHandler = onDataReceived;
    this.streamTimer = setInterval(() => {
      this.notificationHandler?.(this.generateSensorMessage());
    }, STREAM_INTERVAL_MS);
  }

  stopNotification(): void {
    if (this.streamTimer) {
      clearInterval(this.streamTimer);
      this.streamTimer = null;
    }

    this.notificationHandler = null;
  }

  getConnectionStatus(): BluetoothConnectionStatus {
    return this.connectionStatus;
  }

  getConnectedDevice(): BluetoothDeviceInfo | null {
    return this.connectedDevice;
  }

  destroy(): void {
    this.stopScan();
    this.stopNotification();
    this.clearConnectionTimer();
    this.connectedDevice = null;
    this.connectionStatus = 'disconnected';
  }

  private generateSensorMessage(): string {
    const temperature = this.randomInt(25, 35);
    const humidity = this.randomInt(50, 80);
    const battery = this.randomInt(70, 100);

    return `TEMP: ${temperature}\nHUM: ${humidity}\nBAT: ${battery}`;
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private clearConnectionTimer(): void {
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }
  }

  private toError(error: unknown): Error {
    if (error instanceof Error) {
      return error;
    }

    return new Error('Unknown mock Bluetooth error.');
  }
}
