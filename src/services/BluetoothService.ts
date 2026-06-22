import { PermissionsAndroid, Platform } from 'react-native';
import {
  BleError,
  BleManager,
  Characteristic,
  Device,
  State,
  Subscription,
} from 'react-native-ble-plx';
import { deviceConfig } from '../config/deviceConfig';

export type BluetoothDeviceInfo = {
  id: string;
  name: string;
  rssi: number | null;
  rawDevice: Device;
};

class BluetoothService {
  private manager: BleManager;
  private discoveredDevices = new Map<string, BluetoothDeviceInfo>();
  private connectedDevice: Device | null = null;
  private disconnectionSubscription: Subscription | null = null;
  private notificationSubscription: Subscription | null = null;

  constructor() {
    this.manager = new BleManager();
  }

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }

    if (Platform.Version < 23) {
      return true;
    }

    const androidVersion = Number(Platform.Version);
    const permissions =
      androidVersion >= 31
        ? [
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ]
        : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];

    const results = await PermissionsAndroid.requestMultiple(permissions);

    return permissions.every(
      permission => results[permission] === PermissionsAndroid.RESULTS.GRANTED,
    );
  }

  async getBluetoothState(): Promise<State> {
    return this.manager.state();
  }

  async isBluetoothPoweredOn(): Promise<boolean> {
    const state = await this.getBluetoothState();
    return state === State.PoweredOn;
  }

  onStateChange(listener: (state: State) => void): Subscription {
    return this.manager.onStateChange(listener, true);
  }

  startScan(
    onDevicesUpdated: (devices: BluetoothDeviceInfo[]) => void,
    onError: (error: BleError) => void,
  ): void {
    this.discoveredDevices.clear();

    this.manager.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
      if (error) {
        console.warn('BLE scan error:', error.message);
        onError(error);
        return;
      }

      if (!device || !this.matchesDeviceFilter(device)) {
        return;
      }

      const deviceInfo: BluetoothDeviceInfo = {
        id: device.id,
        name: device.name ?? device.localName ?? 'Unknown Device',
        rssi: device.rssi ?? null,
        rawDevice: device,
      };

      this.discoveredDevices.set(device.id, deviceInfo);
      onDevicesUpdated(this.getDiscoveredDevices());
    });
  }

  stopScan(): void {
    this.manager.stopDeviceScan();
  }

  getDiscoveredDevices(): BluetoothDeviceInfo[] {
    return Array.from(this.discoveredDevices.values());
  }

  async connectToDevice(
    deviceId: string,
    onDisconnected?: (device: BluetoothDeviceInfo | null) => void,
  ): Promise<BluetoothDeviceInfo> {
    this.stopScan();
    this.disconnectionSubscription?.remove();

    const connectedDevice = await this.manager.connectToDevice(deviceId);
    const readyDevice = await connectedDevice.discoverAllServicesAndCharacteristics();

    this.connectedDevice = readyDevice;
    this.disconnectionSubscription = this.manager.onDeviceDisconnected(
      readyDevice.id,
      (error, device) => {
        if (error) {
          console.warn('BLE disconnection error:', error.message);
        }

        this.connectedDevice = null;
        this.stopNotification();
        onDisconnected?.(device ? this.mapDevice(device) : null);
      },
    );

    return this.mapDevice(readyDevice);
  }

  async disconnectDevice(): Promise<void> {
    if (!this.connectedDevice) {
      return;
    }

    const deviceId = this.connectedDevice.id;
    this.stopNotification();
    await this.manager.cancelDeviceConnection(deviceId);
    this.connectedDevice = null;
    this.disconnectionSubscription?.remove();
    this.disconnectionSubscription = null;
  }

  async isDeviceConnected(deviceId: string): Promise<boolean> {
    return this.manager.isDeviceConnected(deviceId);
  }

  getConnectedDevice(): BluetoothDeviceInfo | null {
    return this.connectedDevice ? this.mapDevice(this.connectedDevice) : null;
  }

  async writeCommand(command: string): Promise<Characteristic> {
    if (!this.connectedDevice) {
      throw new Error('No Bluetooth device is connected.');
    }

    try {
      const encodedCommand = this.encodeUtf8ToBase64(command);
      const characteristic =
        await this.manager.writeCharacteristicWithResponseForDevice(
          this.connectedDevice.id,
          deviceConfig.serviceUUID,
          deviceConfig.writeCharacteristicUUID,
          encodedCommand,
        );

      console.log('BLE command written successfully:', command);
      return characteristic;
    } catch (error) {
      console.warn('BLE command write failed:', error);
      throw new Error(
        `Unable to write BLE command: ${this.getErrorMessage(error)}`,
      );
    }
  }

  startNotification(
    onDataReceived: (data: string, characteristic: Characteristic) => void,
    onError?: (error: BleError) => void,
  ): void {
    if (!this.connectedDevice) {
      throw new Error('No Bluetooth device is connected.');
    }

    this.stopNotification();

    this.notificationSubscription = this.manager.monitorCharacteristicForDevice(
      this.connectedDevice.id,
      deviceConfig.serviceUUID,
      deviceConfig.notifyCharacteristicUUID,
      (error, characteristic) => {
        if (error) {
          console.warn('BLE notification error:', error.message);
          onError?.(error);
          return;
        }

        if (!characteristic?.value) {
          return;
        }

        try {
          const decodedValue = this.decodeBase64ToUtf8(characteristic.value);
          onDataReceived(decodedValue, characteristic);
        } catch (decodeError) {
          console.warn('BLE notification decode failed:', decodeError);
        }
      },
    );
  }

  stopNotification(): void {
    this.notificationSubscription?.remove();
    this.notificationSubscription = null;
  }

  destroy(): void {
    this.stopScan();
    this.stopNotification();
    this.disconnectionSubscription?.remove();
    this.manager.destroy();
  }

  private matchesDeviceFilter(device: Device): boolean {
    const filter = deviceConfig.deviceNameFilter.trim().toLowerCase();

    if (!filter) {
      return true;
    }

    const deviceName = device.name ?? device.localName ?? '';
    return deviceName.toLowerCase().includes(filter);
  }

  private mapDevice(device: Device): BluetoothDeviceInfo {
    return {
      id: device.id,
      name: device.name ?? device.localName ?? 'Unknown Device',
      rssi: device.rssi ?? null,
      rawDevice: device,
    };
  }

  private encodeUtf8ToBase64(value: string): string {
    const bytes = this.encodeUtf8(value);
    const base64Characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let output = '';

    for (let index = 0; index < bytes.length; index += 3) {
      const byte1 = bytes[index];
      const byte2 = bytes[index + 1];
      const byte3 = bytes[index + 2];

      output += base64Characters[Math.floor(byte1 / 4)];
      output +=
        base64Characters[(byte1 % 4) * 16 + Math.floor((byte2 ?? 0) / 16)];
      output +=
        byte2 === undefined
          ? '='
          : base64Characters[(byte2 % 16) * 4 + Math.floor((byte3 ?? 0) / 64)];
      output += byte3 === undefined ? '=' : base64Characters[byte3 % 64];
    }

    return output;
  }

  private decodeBase64ToUtf8(value: string): string {
    const base64Characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const cleanValue = value.replace(new RegExp('=+$'), '');
    const bytes: number[] = [];
    let buffer = 0;
    let bits = 0;

    for (const character of cleanValue) {
      const characterValue = base64Characters.indexOf(character);

      if (characterValue < 0) {
        continue;
      }

      buffer = buffer * 64 + characterValue;
      bits += 6;

      if (bits >= 8) {
        bits -= 8;
        bytes.push(Math.floor(buffer / 2 ** bits));
        buffer %= 2 ** bits;
      }
    }

    return this.decodeUtf8(bytes);
  }

  private encodeUtf8(value: string): number[] {
    const bytes: number[] = [];

    for (const character of value) {
      const codePoint = character.codePointAt(0) ?? 0;

      if (codePoint <= 0x7f) {
        bytes.push(codePoint);
      } else if (codePoint <= 0x7ff) {
        bytes.push(0xc0 + Math.floor(codePoint / 64));
        bytes.push(0x80 + (codePoint % 64));
      } else if (codePoint <= 0xffff) {
        bytes.push(0xe0 + Math.floor(codePoint / 4096));
        bytes.push(0x80 + (Math.floor(codePoint / 64) % 64));
        bytes.push(0x80 + (codePoint % 64));
      } else {
        bytes.push(0xf0 + Math.floor(codePoint / 262144));
        bytes.push(0x80 + (Math.floor(codePoint / 4096) % 64));
        bytes.push(0x80 + (Math.floor(codePoint / 64) % 64));
        bytes.push(0x80 + (codePoint % 64));
      }
    }

    return bytes;
  }

  private decodeUtf8(bytes: number[]): string {
    let output = '';
    let index = 0;

    while (index < bytes.length) {
      const byte1 = bytes[index];

      if (byte1 <= 0x7f) {
        output += String.fromCodePoint(byte1);
        index += 1;
      } else if (Math.floor(byte1 / 32) === 6) {
        const byte2 = bytes[index + 1];
        output += String.fromCodePoint((byte1 % 32) * 64 + (byte2 % 64));
        index += 2;
      } else if (Math.floor(byte1 / 16) === 14) {
        const byte2 = bytes[index + 1];
        const byte3 = bytes[index + 2];
        output += String.fromCodePoint(
          (byte1 % 16) * 4096 + (byte2 % 64) * 64 + (byte3 % 64),
        );
        index += 3;
      } else {
        const byte2 = bytes[index + 1];
        const byte3 = bytes[index + 2];
        const byte4 = bytes[index + 3];
        output += String.fromCodePoint(
          (byte1 % 8) * 262144 +
            (byte2 % 64) * 4096 +
            (byte3 % 64) * 64 +
            (byte4 % 64),
        );
        index += 4;
      }
    }

    return output;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown Bluetooth error.';
  }
}

export default new BluetoothService();
