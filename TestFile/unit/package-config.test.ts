import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface PackageJsonShape {
  description?: string;
  author?: string;
  main: string;
  scripts: Record<string, string>;
  devDependencies?: Record<string, string>;
  build?: {
    icon?: string;
    win?: {
      icon?: string;
    };
    nsis?: {
      installerIcon?: string;
      uninstallerIcon?: string;
      allowToChangeInstallationDirectory?: boolean;
    };
  };
}

function readPackageJson(): PackageJsonShape {
  const packageJsonPath = resolve(process.cwd(), 'package.json');
  return JSON.parse(readFileSync(packageJsonPath, 'utf8')) as PackageJsonShape;
}

describe('package configuration', () => {
  it('points electron main to the generated dist-electron entry file', () => {
    const packageJson = readPackageJson();

    expect(packageJson.main).toBe('dist-electron/electron/main.cjs');
    expect(packageJson.scripts['build:electron']).toContain("dist-electron/electron/main.js");
    expect(packageJson.scripts['build:electron']).toContain("dist-electron/electron/main.cjs");
    expect(packageJson.scripts['build:electron']).toContain("dist-electron/package.json");
    expect(packageJson.scripts['build:electron']).toContain('commonjs');
    expect(packageJson.scripts['build:electron']).toContain('-Encoding Ascii');
  });

  it('defines electron-builder packaging scripts and lets NSIS change the install directory', () => {
    const packageJson = readPackageJson();

    expect(packageJson.scripts['pack']).toContain('electron-builder --dir');
    expect(packageJson.scripts['dist:win']).toContain('electron-builder --win nsis');
    expect(packageJson.scripts['dist:win']).toContain('--config.directories.output=release-dist');
    expect(packageJson.devDependencies?.['electron-builder']).toBeTruthy();
    expect(packageJson.build?.nsis?.allowToChangeInstallationDirectory).toBe(true);
  });

  it('points app and installer icons to the generated brush icon assets', () => {
    const packageJson = readPackageJson();

    expect(packageJson.build?.icon).toContain('assets/icons/brush-app-icon');
    expect(packageJson.build?.win?.icon).toContain('assets/icons/brush-app-icon');
    expect(packageJson.build?.nsis?.installerIcon).toContain('assets/icons/brush-app-icon');
    expect(packageJson.build?.nsis?.uninstallerIcon).toContain('assets/icons/brush-app-icon');
  });

  it('includes basic app metadata for electron-builder', () => {
    const packageJson = readPackageJson();

    expect(packageJson.description).toBeTruthy();
    expect(packageJson.author).toBeTruthy();
  });
});
