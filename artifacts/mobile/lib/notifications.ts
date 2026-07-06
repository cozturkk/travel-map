import { Platform } from "react-native";

// Local notifications only (works in Expo Go; remote push needs a dev build).
// Loaded via optional require so the web bundle never touches the native module.
let Notifications: any = null;
if (Platform.OS !== "web") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Notifications = require("expo-notifications");
  } catch {
    Notifications = null;
  }
}

let handlerConfigured = false;

async function ensurePermission(): Promise<boolean> {
  if (!Notifications) return false;
  try {
    if (!handlerConfigured) {
      handlerConfigured = true;
      // Show banners even while the app is foregrounded (delta scans run
      // right after launch, so the user is usually in the app).
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });
    }
    const perm = await Notifications.getPermissionsAsync();
    if (perm.status === "granted") return true;
    if (perm.canAskAgain === false) return false;
    const req = await Notifications.requestPermissionsAsync();
    return req.status === "granted";
  } catch {
    return false;
  }
}

// Fire-and-forget local notification; silently a no-op without permission.
export async function notify(title: string, body: string): Promise<void> {
  if (!Notifications) return;
  try {
    const ok = await ensurePermission();
    if (!ok) return;
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null,
    });
  } catch {}
}
