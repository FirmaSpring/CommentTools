export const RUN_REGISTRY_PATH = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
export const AUTO_LAUNCH_VALUE_NAME = 'CommentTools';

export function getAutoLaunchCommandValue(executablePath: string): string {
  return `"${executablePath}"`;
}

export function getEnableAutoLaunchArgs(executablePath: string): string[] {
  return [
    'add',
    RUN_REGISTRY_PATH,
    '/v',
    AUTO_LAUNCH_VALUE_NAME,
    '/t',
    'REG_SZ',
    '/d',
    getAutoLaunchCommandValue(executablePath),
    '/f',
  ];
}

export function getDisableAutoLaunchArgs(): string[] {
  return [
    'delete',
    RUN_REGISTRY_PATH,
    '/v',
    AUTO_LAUNCH_VALUE_NAME,
    '/f',
  ];
}
