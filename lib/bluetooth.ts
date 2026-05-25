import { BleManager, type Device, type Subscription } from "react-native-ble-plx";

// Standard GATT Battery Service.
export const BATTERY_SERVICE = "0000180f-0000-1000-8000-00805f9b34fb";
export const BATTERY_LEVEL_CHAR = "00002a19-0000-1000-8000-00805f9b34fb";

// IMPORTANT iOS caveat: classic Bluetooth headsets (most Cardo/Sena units pair
// over HFP/A2DP, not BLE/GATT) are NOT visible to react-native-ble-plx and do
// not expose the GATT Battery Service. Battery for those requires the MFi/iAP2
// External Accessory framework, which isn't reachable from ble-plx. This module
// supports BLE-capable headsets; audio routing for classic devices is handled
// by iOS/AVAudioSession automatically once paired.

let manager: BleManager | null = null;

export function getBleManager(): BleManager {
  if (!manager) manager = new BleManager();
  return manager;
}

/** Resolve once the adapter is powered on (or reject on hard-off states). */
export function waitForPoweredOn(timeoutMs = 8000): Promise<void> {
  const m = getBleManager();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      sub.remove();
      reject(new Error("Bluetooth did not power on in time"));
    }, timeoutMs);
    const sub = m.onStateChange((state) => {
      if (state === "PoweredOn") {
        clearTimeout(timer);
        sub.remove();
        resolve();
      } else if (state === "Unsupported" || state === "Unauthorized") {
        clearTimeout(timer);
        sub.remove();
        reject(new Error(`Bluetooth unavailable: ${state}`));
      }
    }, true);
  });
}

function base64FirstByte(b64: string): number | null {
  // Battery Level is a single uint8 (0-100). Decode just the first byte.
  // atob is available in the Expo/Hermes runtime.
  try {
    const decode = (globalThis as { atob?: (s: string) => string }).atob;
    if (!decode) return null;
    const binary = decode(b64);
    return binary.length ? binary.charCodeAt(0) : null;
  } catch {
    return null;
  }
}

export function scanForDevices(
  onDevice: (device: Device) => void,
  onError?: (error: Error) => void
): void {
  const m = getBleManager();
  m.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
    if (error) {
      onError?.(error);
      return;
    }
    // Only surface named peripherals — unnamed beacons aren't useful here.
    if (device?.name) onDevice(device);
  });
}

export function stopScan(): void {
  getBleManager().stopDeviceScan();
}

export async function connectToDevice(deviceId: string): Promise<Device> {
  const m = getBleManager();
  const device = await m.connectToDevice(deviceId, { timeout: 10000 });
  await device.discoverAllServicesAndCharacteristics();
  return device;
}

export async function readBattery(device: Device): Promise<number | null> {
  try {
    const char = await device.readCharacteristicForService(
      BATTERY_SERVICE,
      BATTERY_LEVEL_CHAR
    );
    return char.value ? base64FirstByte(char.value) : null;
  } catch {
    return null; // device doesn't expose the Battery Service
  }
}

export function monitorBattery(
  device: Device,
  onLevel: (pct: number | null) => void
): Subscription | null {
  try {
    return device.monitorCharacteristicForService(
      BATTERY_SERVICE,
      BATTERY_LEVEL_CHAR,
      (_error, char) => {
        if (char?.value) onLevel(base64FirstByte(char.value));
      }
    );
  } catch {
    return null;
  }
}
