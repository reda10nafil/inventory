// Fase 4: expo-battery -> react-native-device-info
let DeviceInfo: any = null;
try { DeviceInfo = require('react-native-device-info'); } catch {}

let ExpoBattery: any = null;
try { ExpoBattery = require('expo-battery'); } catch {}

export async function getBatteryLevelAsync() {
  if (DeviceInfo && DeviceInfo.getBatteryLevel) {
    const lvl = await DeviceInfo.getBatteryLevel();
    return lvl;
  }
  if (ExpoBattery) return ExpoBattery.getBatteryLevelAsync();
  return 1;
}

export async function getBatteryStateAsync() {
  if (DeviceInfo && DeviceInfo.isBatteryCharging) {
    const charging = await DeviceInfo.isBatteryCharging();
    return charging ? BatteryState.CHARGING : BatteryState.UNPLUGGED;
  }
  if (ExpoBattery) return ExpoBattery.getBatteryStateAsync();
  return BatteryState.UNKNOWN;
}

export const BatteryState = ExpoBattery?.BatteryState || { UNKNOWN: 0, UNPLUGGED: 1, CHARGING: 2, FULL: 3 };
