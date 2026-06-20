import { PermissionsAndroid, Platform } from 'react-native';
import {
  BleError,
  BleManager,
  Characteristic,
  Device,
  State,
  Subscription,
} from 'react-native-ble-plx';

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

      if (!device) {
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

  async writeCommand(
    serviceUUID: string,
    characteristicUUID: string,
    base64Value: string,
  ): Promise<Characteristic> {
    if (!this.connectedDevice) {
      throw new Error('No Bluetooth device is connected.');
    }

    return this.manager.writeCharacteristicWithResponseForDevice(
      this.connectedDevice.id,
      serviceUUID,
      characteristicUUID,
      base64Value,
    );
  }

  monitorCharacteristic(
    serviceUUID: string,
    characteristicUUID: string,
    listener: (error: BleError | null, characteristic: Characteristic | null) => void,
  ): Subscription {
    if (!this.connectedDevice) {
      throw new Error('No Bluetooth device is connected.');
    }

    return this.manager.monitorCharacteristicForDevice(
      this.connectedDevice.id,
      serviceUUID,
      characteristicUUID,
      listener,
    );
  }

  destroy(): void {
    this.stopScan();
    this.disconnectionSubscription?.remove();
    this.manager.destroy();
  }

  private mapDevice(device: Device): BluetoothDeviceInfo {
    return {
      id: device.id,
      name: device.name ?? device.localName ?? 'Unknown Device',
      rssi: device.rssi ?? null,
      rawDevice: device,
    };
  }
}

export default new BluetoothService();
