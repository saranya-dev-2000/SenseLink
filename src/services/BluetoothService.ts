export type BluetoothDevice = {
  id: string;
  name: string;
};

class BluetoothService {
  async scanForDevices(): Promise<BluetoothDevice[]> {
    // Bluetooth implementation will be wired to the native BLE library here.
    return [];
  }

  async connectToDevice(_deviceId: string): Promise<void> {
    // Connect to a sensor device by id.
  }

  async disconnectDevice(_deviceId: string): Promise<void> {
    // Disconnect from a sensor device by id.
  }
}

export default new BluetoothService();
