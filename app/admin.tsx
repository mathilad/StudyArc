import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useAccess } from "../context/AccessContext";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

type AdminUser = {
  user_id: string;
  email: string;
  full_name: string;
  access_code: string;
  premium_until: string | null;
  blocked: boolean;
  blocked_reason: string | null;
  role: string;
  created_at: string;
};

const premiumActive = (value: string | null) => Boolean(value && new Date(value).getTime() > Date.now());
const dateLabel = (value: string | null) => value ? new Date(value).toLocaleDateString() : "Not active";

export default function AdminScreen() {
  const { session, signOut } = useAuth();
  const access = useAccess();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc("admin_list_users");
    setBusy(false);
    if (error) return Alert.alert("Could not load users", error.message);
    setUsers((data ?? []) as AdminUser[]);
  }, []);

  useEffect(() => { if (access.isAdmin) loadUsers().catch(() => undefined); }, [access.isAdmin, loadUsers]);

  if (!session) return <Redirect href="/login" />;
  if (!access.loading && !access.isAdmin) return <Redirect href="/" />;

  const updateUser = async (user: AdminUser, updates: { premiumUntil?: string | null; blocked?: boolean; reason?: string | null }) => {
    setWorkingId(user.user_id);
    const { error } = await supabase.rpc("admin_set_user_access", {
      p_user_id: user.user_id,
      p_premium_until: updates.premiumUntil === undefined ? user.premium_until : updates.premiumUntil,
      p_blocked: updates.blocked === undefined ? user.blocked : updates.blocked,
      p_blocked_reason: updates.reason === undefined ? user.blocked_reason : updates.reason,
    });
    setWorkingId(null);
    if (error) return Alert.alert("Update failed", error.message);
    await loadUsers();
  };

  const grantMonth = async (user: AdminUser) => {
    const current = user.premium_until ? new Date(user.premium_until).getTime() : 0;
    const start = Math.max(Date.now(), current);
    await updateUser(user, { premiumUntil: new Date(start + 30 * 24 * 60 * 60 * 1000).toISOString() });
  };

  const setPaidMode = async (enabled: boolean) => {
    setBusy(true);
    const { error } = await supabase.rpc("admin_set_paid_mode", { p_enabled: enabled });
    setBusy(false);
    if (error) return Alert.alert("Could not update paid mode", error.message);
    await access.refreshAccess();
  };

  const toggleBlock = (user: AdminUser) => {
    const next = !user.blocked;
    Alert.alert(
      next ? "Block this user?" : "Unblock this user?",
      next ? "They will immediately lose access to Study Arc data and screens." : "Their access will follow the current premium setting.",
      [{ text: "Cancel", style: "cancel" }, { text: next ? "Block" : "Unblock", style: next ? "destructive" : "default", onPress: () => updateUser(user, { blocked: next, reason: next ? "Blocked by a Study Arc administrator." : null }) }],
    );
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? users.filter(user => user.email?.toLowerCase().includes(q) || user.full_name?.toLowerCase().includes(q) || user.access_code?.toLowerCase().includes(q)) : users;
  }, [search, users]);

  return <View style={s.root}>
    <LinearGradient colors={["#211332", "#080D14", "#080D14"]} style={StyleSheet.absoluteFill} />
    <ScrollView contentContainerStyle={s.content}>
      <View style={s.header}>
        <View><Text style={s.eyebrow}>SUPER ADMIN</Text><Text style={s.title}>Study Arc Control</Text><Text style={s.subtitle}>Premium access, account safety and paid mode</Text></View>
        <Pressable style={s.signOut} onPress={() => signOut()}><Ionicons name="log-out-outline" size={18} color="#DCC8F5" /><Text style={s.signOutText}>Sign out</Text></Pressable>
      </View>

      <View style={s.modeCard}>
        <View style={s.modeIcon}><Ionicons name="card-outline" size={24} color="#D8BBFA" /></View>
        <View style={{flex:1}}><Text style={s.modeTitle}>Paid app mode</Text><Text style={s.modeCopy}>{access.paidEnabled ? `Students need active premium · LKR ${access.monthlyPriceLkr.toLocaleString()}/month` : "All unblocked students currently have access"}</Text></View>
        <Switch value={access.paidEnabled} onValueChange={setPaidMode} disabled={busy || access.role !== "super_admin"} trackColor={{false:"#303A48",true:"#7650A8"}} thumbColor="#F1E7FF" />
      </View>

      <View style={s.stats}>
        <View style={s.stat}><Text style={s.statValue}>{users.length}</Text><Text style={s.statLabel}>USERS</Text></View>
        <View style={s.stat}><Text style={s.statValue}>{users.filter(x => premiumActive(x.premium_until)).length}</Text><Text style={s.statLabel}>PREMIUM</Text></View>
        <View style={s.stat}><Text style={s.statValue}>{users.filter(x => x.blocked).length}</Text><Text style={s.statLabel}>BLOCKED</Text></View>
      </View>

      <View style={s.searchWrap}><Ionicons name="search" size={19} color="#718094" /><TextInput value={search} onChangeText={setSearch} placeholder="Search email, name or activation code" placeholderTextColor="#566274" style={s.search} autoCapitalize="none" /></View>

      {busy && !users.length ? <ActivityIndicator color="#B784FF" style={{marginTop:35}} /> : filtered.map(user => {
        const premium = premiumActive(user.premium_until);
        const working = workingId === user.user_id;
        return <View key={user.user_id} style={[s.userCard,user.blocked&&s.userBlocked]}>
          <View style={s.userHead}>
            <View style={{flex:1}}><Text style={s.userName}>{user.full_name || "Study Arc user"}</Text><Text style={s.userEmail}>{user.email}</Text></View>
            <View style={[s.badge,user.blocked?s.badgeBlocked:premium?s.badgePremium:s.badgeFree]}><Text style={s.badgeText}>{user.blocked?"BLOCKED":premium?"PREMIUM":"FREE"}</Text></View>
          </View>
          <View style={s.details}>
            <View><Text style={s.detailLabel}>ACTIVATION CODE</Text><Text selectable style={s.code}>{user.access_code || "—"}</Text></View>
            <View><Text style={s.detailLabel}>PREMIUM UNTIL</Text><Text style={s.detailValue}>{dateLabel(user.premium_until)}</Text></View>
            <View><Text style={s.detailLabel}>ROLE</Text><Text style={s.detailValue}>{user.role}</Text></View>
          </View>
          {working ? <ActivityIndicator color="#B784FF" /> : <View style={s.actions}>
            <Pressable style={s.primaryAction} onPress={() => grantMonth(user)}><Ionicons name="add-circle-outline" size={17} color="#160B20" /><Text style={s.primaryActionText}>GRANT 30 DAYS</Text></Pressable>
            <Pressable style={s.action} onPress={() => updateUser(user, { premiumUntil: null })}><Text style={s.actionText}>REVOKE</Text></Pressable>
            <Pressable style={[s.action,user.blocked&&s.unblock]} onPress={() => toggleBlock(user)}><Text style={[s.actionText,user.blocked&&s.unblockText]}>{user.blocked?"UNBLOCK":"BLOCK"}</Text></Pressable>
          </View>}
        </View>;
      })}
      {!busy && !filtered.length ? <Text style={s.empty}>No users match this search.</Text> : null}
    </ScrollView>
  </View>;
}

const s=StyleSheet.create({
  root:{flex:1,backgroundColor:"#080D14"},content:{width:"100%",maxWidth:1000,alignSelf:"center",padding:22,paddingBottom:50},
  header:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:15,marginBottom:22},eyebrow:{color:"#B784FF",fontSize:10,fontWeight:"900",letterSpacing:1.5},title:{color:"#F5F6F8",fontSize:31,fontWeight:"900",marginTop:5},subtitle:{color:"#7D8999",fontSize:12,marginTop:4},
  signOut:{height:43,borderRadius:14,borderWidth:1,borderColor:"#4B3861",paddingHorizontal:13,flexDirection:"row",alignItems:"center",gap:6},signOutText:{color:"#DCC8F5",fontSize:11,fontWeight:"900"},
  modeCard:{minHeight:90,borderRadius:22,backgroundColor:"#151221",borderWidth:1,borderColor:"#4A3760",padding:16,flexDirection:"row",alignItems:"center",gap:13},modeIcon:{width:48,height:48,borderRadius:15,backgroundColor:"#2B1E3B",alignItems:"center",justifyContent:"center"},modeTitle:{color:"#F0EBF5",fontSize:15,fontWeight:"900"},modeCopy:{color:"#857990",fontSize:10.5,lineHeight:16,marginTop:4},
  stats:{flexDirection:"row",gap:10,marginTop:12},stat:{flex:1,borderRadius:18,backgroundColor:"#101720",borderWidth:1,borderColor:"#263243",padding:15,alignItems:"center"},statValue:{color:"#EEEFF3",fontSize:24,fontWeight:"900"},statLabel:{color:"#687588",fontSize:8,fontWeight:"900",letterSpacing:1,marginTop:3},
  searchWrap:{height:53,borderRadius:17,backgroundColor:"#101720",borderWidth:1,borderColor:"#2A3544",paddingHorizontal:14,flexDirection:"row",alignItems:"center",gap:9,marginTop:18},search:{flex:1,color:"#EEF1F5",fontSize:13},
  userCard:{borderRadius:21,backgroundColor:"#101720",borderWidth:1,borderColor:"#273342",padding:16,marginTop:11},userBlocked:{borderColor:"#58353D"},userHead:{flexDirection:"row",alignItems:"center",gap:10},userName:{color:"#EFF2F6",fontSize:15,fontWeight:"900"},userEmail:{color:"#7F8B9B",fontSize:10.5,marginTop:4},
  badge:{borderRadius:10,paddingHorizontal:9,paddingVertical:6},badgePremium:{backgroundColor:"#342347"},badgeFree:{backgroundColor:"#1D2935"},badgeBlocked:{backgroundColor:"#3A2026"},badgeText:{color:"#E5D8F2",fontSize:8,fontWeight:"900",letterSpacing:.8},
  details:{flexDirection:"row",flexWrap:"wrap",gap:22,borderTopWidth:1,borderTopColor:"#26313E",paddingTop:13,marginTop:13},detailLabel:{color:"#5F6C7D",fontSize:7.5,fontWeight:"900",letterSpacing:.9},detailValue:{color:"#BAC2CD",fontSize:11,fontWeight:"800",marginTop:4},code:{color:"#DCC8F5",fontSize:13,fontWeight:"900",letterSpacing:1,marginTop:4},
  actions:{flexDirection:"row",flexWrap:"wrap",gap:8,marginTop:15},primaryAction:{height:39,borderRadius:12,backgroundColor:"#B784FF",paddingHorizontal:12,flexDirection:"row",alignItems:"center",gap:5},primaryActionText:{color:"#160B20",fontSize:9,fontWeight:"900"},action:{height:39,borderRadius:12,backgroundColor:"#18212D",borderWidth:1,borderColor:"#303D4D",paddingHorizontal:12,alignItems:"center",justifyContent:"center"},actionText:{color:"#B9C2CF",fontSize:9,fontWeight:"900"},unblock:{backgroundColor:"#183027",borderColor:"#2F6650"},unblockText:{color:"#9BE0BD"},empty:{color:"#657386",fontSize:12,textAlign:"center",marginTop:35}
});
