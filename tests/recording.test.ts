import { describe, expect, it } from 'vitest';
import { extensionFor, fileStamp, formatElapsed, pickRecordingType } from '../src/recording';

describe('pickRecordingType', () => {
  it('picks the first supported type in order', () => {
    expect(pickRecordingType((type) => type === 'audio/mp4')).toBe('audio/mp4');
    expect(pickRecordingType((type) => type === 'audio/ogg;codecs=opus')).toBe(
      'audio/ogg;codecs=opus',
    );
  });

  it('returns null when nothing is supported', () => {
    expect(pickRecordingType(() => false)).toBeNull();
  });
});

describe('extensionFor', () => {
  it('maps each container to its file extension', () => {
    expect(extensionFor('audio/mp4')).toBe('m4a');
    expect(extensionFor('audio/ogg;codecs=opus')).toBe('ogg');
    expect(extensionFor('audio/webm;codecs=opus')).toBe('webm');
  });
});

describe('fileStamp', () => {
  it('formats the date and time into a file name', () => {
    expect(fileStamp(new Date(2026, 10, 2, 14, 5))).toBe('drumline-2026-11-02-1405');
  });
});

describe('formatElapsed', () => {
  it('formats seconds as minutes and seconds', () => {
    expect(formatElapsed(0)).toBe('0:00');
    expect(formatElapsed(65.9)).toBe('1:05');
    expect(formatElapsed(-3)).toBe('0:00');
  });
});
