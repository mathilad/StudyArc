let flags: Record<string, boolean> = { imageScanning: false, aiFeatures: false };

export function setRuntimeFeatureFlags(next: Record<string, boolean>) {
  flags = { imageScanning: false, aiFeatures: false, ...next };
}

export function getRuntimeFeatureFlags() {
  return flags;
}
