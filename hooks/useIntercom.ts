import { useCallback, useEffect, useRef, useState } from "react";
import type { Device, Subscription } from "react-native-ble-plx";
import {
  connectToDevice,
  monitorBattery,
  readBattery,
  scanForDevices,
  stopScan,
  waitForPoweredOn,
} from "@/lib/bluetooth";
import { useIntercomStore } from "@/store/useIntercomStore";

export interface ScannedDevice {
  id: string;
  name: string;
  rssi: number | null;
}

export function useIntercom() {
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<ScannedDevice[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectedId = useIntercomStore((s) => s.connectedDeviceId);
  const deviceName = useIntercomStore((s) => s.deviceName);
  const battery = useIntercomStore((s) => s.batteryPct);

  const deviceRef = useRef<Device | null>(null);
  const batterySubRef = useRef<Subscription | null>(null);

  const scan = useCallback(async () => {
    setError(null);
    setDevices([]);
    try {
      await waitForPoweredOn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bluetooth unavailable");
      return;
    }
    setScanning(true);
    scanForDevices(
      (d) =>
        setDevices((prev) =>
          prev.some((x) => x.id === d.id)
            ? prev
            : [...prev, { id: d.id, name: d.name ?? "Unknown", rssi: d.rssi }]
        ),
      (e) => {
        setError(e.message);
        setScanning(false);
        stopScan();
      }
    );
    // Bound the scan so the radio doesn't run indefinitely.
    setTimeout(() => {
      stopScan();
      setScanning(false);
    }, 12000);
  }, []);

  const connect = useCallback(async (deviceId: string, name: string) => {
    stopScan();
    setScanning(false);
    setConnecting(true);
    setError(null);
    try {
      const device = await connectToDevice(deviceId);
      deviceRef.current = device;
      useIntercomStore.getState().setConnected(device.id, name);

      const level = await readBattery(device);
      useIntercomStore.getState().setBattery(level);
      batterySubRef.current = monitorBattery(device, (pct) =>
        useIntercomStore.getState().setBattery(pct)
      );

      device.onDisconnected(() => {
        batterySubRef.current?.remove();
        batterySubRef.current = null;
        deviceRef.current = null;
        useIntercomStore.getState().reset();
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not connect");
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    batterySubRef.current?.remove();
    batterySubRef.current = null;
    const device = deviceRef.current;
    deviceRef.current = null;
    useIntercomStore.getState().reset();
    if (device) {
      try {
        await device.cancelConnection();
      } catch {
        /* already gone */
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      stopScan();
      batterySubRef.current?.remove();
    };
  }, []);

  return {
    scanning,
    devices,
    connecting,
    error,
    connectedId,
    deviceName,
    battery,
    scan,
    connect,
    disconnect,
  };
}
