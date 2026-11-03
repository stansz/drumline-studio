const RECORDING_TYPES = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/webm'];

export function pickRecordingType(isSupported: (type: string) => boolean): string | null {
  return RECORDING_TYPES.find((type) => isSupported(type)) ?? null;
}

export function extensionFor(type: string): string {
  if (type.startsWith('audio/mp4')) return 'm4a';
  if (type.startsWith('audio/ogg')) return 'ogg';
  return 'webm';
}

// e.g. drumline-2026-11-02-1430
export function fileStamp(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `drumline-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}

export function formatElapsed(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}
