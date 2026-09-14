import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs, useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import StudyArcLoader from "../../components/StudyArcLoader";
import { useAppConfig } from "../../context/AppConfigContext";
import { useAuth } from "../../context/AuthContext";
import { useMonetization } from "../../context/MonetizationContext";
import { useStudent } from "../../context/StudentContext";

const PAGE_LABELS:Record<string,string>={index:"Home",study:"Study",subjects:"Subjects",timer:"Timer",plan:"Plan",more:"More"};

export default function TabsLayout() {
  const router = useRouter();
  const params = useLocalSearchParams<{ fromHome?: string | string[] }>();
  const fromHome = (Array.isArray(params.fromHome) ? params.fromHome[0] : params.fromHome) === "1";
  const { session, loading: authLoading } = useAuth();
  const { profile, loading: studentLoading } = useStudent();
  const { access, loading: accessLoading } = useMonetization();
  const { isAdmin, refreshing: adminLoading } = useAppConfig();

  if (authLoading || (session && adminLoading)) return <StudyArcLoader compact />;
  if (!session) return <Redirect href="/login" />;
  if (isAdmin) return <Redirect href="/admin" />;
  if (studentLoading || accessLoading) return <StudyArcLoader compact />;
  if (!profile.onboardingComplete) return <Redirect href="/onboarding" />;
  if (!access || ["BLOCKED", "PAYMENT_REQUIRED", "PAYMENT_PENDING"].includes(access.state)) return <Redirect href="/access" />;

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: true,
        headerTitleAlign: "left",
        headerShadowVisible: false,
        headerTintColor: "#F7FBFF",
        headerStyle: { backgroundColor: "#0B1119" },
        headerTitleContainerStyle: { left: fromHome && route.name !== "index" ? 2 : 14 },
        headerLeftContainerStyle: { left: 10 },
        headerRightContainerStyle: { right: 10 },
        headerLeft: fromHome && route.name !== "index" ? () => (
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={({pressed})=>({ width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: pressed?"#21182D":"#151B24", borderWidth: 1, borderColor: "#273241" })}
          >
            <Ionicons name="arrow-back" size={20} color="#F7FBFF" />
          </Pressable>
        ) : undefined,
        headerTitle: () => (
          <View style={{ flexDirection: "row", alignItems: "center", gap:9 }}>
            <Image source={require("../../assets/images/icon.png")} resizeMode="contain" style={{ width: 31, height: 31, borderRadius: 9 }} />
            <View>
              <Text style={{ color: "#8F7EA0", fontSize: 7.5, fontWeight: "900", letterSpacing: 1 }}>STUDYARC</Text>
              <Text style={{ color: "#F7FBFF", fontSize: 15.5, fontWeight: "900", marginTop:1 }}>{PAGE_LABELS[route.name]??"StudyArc"}</Text>
            </View>
          </View>
        ),
        headerRight: () => (
          <View style={{flexDirection:"row",alignItems:"center",gap:7}}>
            <Pressable
              onPress={() => router.push("/search")}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Search StudyArc"
              style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? "#2A2036" : "#151B24", borderWidth: 1, borderColor: "#273241" })}
            >
              <Ionicons name="search" size={20} color="#E5D6F6" />
            </Pressable>
            <Pressable
              onPress={() => router.push("/notifications")}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
              style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? "#2A2036" : "#151B24", borderWidth: 1, borderColor: "#273241" })}
            >
              <Ionicons name="notifications-outline" size={20} color="#E5D6F6" />
            </Pressable>
          </View>
        ),
        sceneStyle: { backgroundColor: "#080D14" },
        tabBarActiveTintColor: "#E0C8FF",
        tabBarInactiveTintColor: "#6E7A8C",
        tabBarActiveBackgroundColor:"#21182D",
        tabBarStyle: {
          backgroundColor: "#0B1119",
          borderTopColor: "#202A37",
          borderTopWidth: 1,
          height: 76,
          paddingBottom: 9,
          paddingTop: 7,
        },
        tabBarItemStyle:{borderRadius:14,marginHorizontal:2,marginVertical:1},
        tabBarLabelStyle: { fontSize: 9.5, fontWeight: "900", marginTop:1 },
        tabBarIconStyle:{marginTop:1},
        tabBarHideOnKeyboard:true,
        tabBarIcon: ({ color, size, focused }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            index: focused?"home":"home-outline",
            study: focused?"library":"library-outline",
            subjects: focused?"book":"book-outline",
            timer: focused?"timer":"timer-outline",
            plan: focused?"calendar":"calendar-outline",
            more: focused?"grid":"grid-outline",
          };
          return <Ionicons name={icons[route.name] ?? "ellipse-outline"} size={focused?size+1:size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="study" options={{ title: "Study" }} />
      <Tabs.Screen name="subjects" options={{ title: "Subjects" }} />
      <Tabs.Screen name="timer" options={{ title: "Timer" }} />
      <Tabs.Screen name="plan" options={{ title: "Plan" }} />
      <Tabs.Screen name="more" options={{ title: "More" }} />
      <Tabs.Screen name="sessions" options={{ href: null }} />
      <Tabs.Screen name="statistics" options={{ href: null }} />
    </Tabs>
  );
}
