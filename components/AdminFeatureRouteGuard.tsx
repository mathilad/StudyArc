import { useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { useAppConfig } from "../context/AppConfigContext";

export default function AdminFeatureRouteGuard(){
  const router=useRouter();
  const segments=useSegments();
  const {settings,refreshing}=useAppConfig();
  const aiEnabled=settings.featureFlags.aiFeatures!==false;
  useEffect(()=>{
    if(refreshing||aiEnabled)return;
    if((segments as readonly string[]).includes("ai-assistant"))router.replace("/(tabs)/study" as never);
  },[aiEnabled,refreshing,router,segments]);
  return null;
}
