/**
 * Haptic feedback utilities for mobile devices
 */

export function hapticLight() {
  if (typeof window !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(10);
  }
}

export function hapticMedium() {
  if (typeof window !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(25);
  }
}

export function hapticSuccess() {
  if (typeof window !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate([10, 50, 10]);
  }
}
