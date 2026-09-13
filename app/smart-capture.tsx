import React from "react";
import ScanningDisabled from "../components/ScanningDisabled";
import { useAppConfig } from "../context/AppConfigContext";
import SmartCaptureScreen from "../screens/SmartCaptureScreen";

export default function SmartCaptureRoute() {
  const { settings } = useAppConfig();
  if (settings.featureFlags.captureScanning === false) return <ScanningDisabled title="Smart Capture is currently disabled" />;
  return <SmartCaptureScreen />;
}
