/**
 * Web Browser HTML5 Notification Engine.
 * Handles permission requests and sends OS desktop notifications for
 * urgent/P0 signals even when the user is working in another window or background tab.
 */

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return "denied";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;

  try {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  } catch (err) {
    console.warn("[Notifications] Request permission failed:", err);
    return false;
  }
}

export function sendDesktopNotification(
  title: string,
  options?: {
    body?: string;
    tag?: string;
    icon?: string;
    onClick?: () => void;
  },
): Notification | null {
  if (!isNotificationSupported()) return null;
  if (Notification.permission !== "granted") return null;

  try {
    const notification = new Notification(title, {
      body: options?.body || "High-priority task requires immediate attention in FocusFlow.",
      icon: options?.icon || "/favicon.ico",
      tag: options?.tag || `focusflow-alert-${Date.now()}`,
      silent: true, // We trigger our own Web Audio chime
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
      if (options?.onClick) {
        options.onClick();
      }
    };

    // Auto close desktop notification after 8 seconds
    setTimeout(() => {
      try {
        notification.close();
      } catch {}
    }, 8000);

    return notification;
  } catch (err) {
    console.warn("[Notifications] Could not dispatch desktop notification:", err);
    return null;
  }
}
