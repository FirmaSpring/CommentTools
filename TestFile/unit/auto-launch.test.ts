import { describe, expect, it } from 'vitest';
import {
  AUTO_LAUNCH_VALUE_NAME,
  RUN_REGISTRY_PATH,
  getAutoLaunchCommandValue,
  getDisableAutoLaunchArgs,
  getEnableAutoLaunchArgs,
} from '../../src/electron/autoLaunch';

describe('autoLaunch', () => {
  it('builds a quoted command value from the installed executable path', () => {
    expect(getAutoLaunchCommandValue('C:\\Program Files\\CommentTools\\CommentTools.exe')).toBe(
      '"C:\\Program Files\\CommentTools\\CommentTools.exe"',
    );
  });

  it('creates registry arguments for enabling auto launch', () => {
    expect(getEnableAutoLaunchArgs('D:\\Apps\\CommentTools\\CommentTools.exe')).toEqual([
      'add',
      RUN_REGISTRY_PATH,
      '/v',
      AUTO_LAUNCH_VALUE_NAME,
      '/t',
      'REG_SZ',
      '/d',
      '"D:\\Apps\\CommentTools\\CommentTools.exe"',
      '/f',
    ]);
  });

  it('creates registry arguments for disabling auto launch', () => {
    expect(getDisableAutoLaunchArgs()).toEqual([
      'delete',
      RUN_REGISTRY_PATH,
      '/v',
      AUTO_LAUNCH_VALUE_NAME,
      '/f',
    ]);
  });
});
