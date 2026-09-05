import type { Session, User } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import { supabase } from "../lib/supabase";

type AuthResult = { error: string | null; needsEmailConfirmation?: boolean };
type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  sendPasswordReset: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const messageFrom=(error:unknown)=>error instanceof Error?error.message:"Something went wrong. Please try again.";
const authRedirect=(path:"/login"|"/reset-password",flow:"signup"|"recovery")=>Linking.createURL(path,{
  ...(Platform.OS!=="web"?{scheme:"studyarc"}:{}),
  queryParams:{auth_flow:flow},
});

function parseUrlParams(url:string){
  const result:Record<string,string>={};
  const parse=(part?:string)=>{if(!part)return;part.split("&").forEach(piece=>{const[rawKey,...rawValue]=piece.split("=");if(!rawKey)return;result[decodeURIComponent(rawKey)]=decodeURIComponent(rawValue.join("=")||"")})};
  parse(url.includes("?")?url.split("?")[1]?.split("#")[0]:undefined);
  parse(url.includes("#")?url.split("#")[1]:undefined);
  return result;
}

export function AuthProvider({children}:{children:React.ReactNode}){
  const[session,setSession]=useState<Session|null>(null);
  const[loading,setLoading]=useState(true);

  useEffect(()=>{
    let mounted=true;
    const acceptAuthUrl=async(url:string|null)=>{
      if(!url)return;
      try{
        const params=parseUrlParams(url);
        const requireFreshLogin=params.type==="signup"||params.auth_flow==="signup";
        if(params.access_token&&params.refresh_token){
          const{data,error}=await supabase.auth.setSession({access_token:params.access_token,refresh_token:params.refresh_token});
          if(error)throw error;
          if(requireFreshLogin){
            await supabase.auth.signOut();
            if(mounted)setSession(null);
          }else if(mounted)setSession(data.session??null);
          return;
        }
        if(params.code){
          const{data,error}=await supabase.auth.exchangeCodeForSession(params.code);
          if(error)throw error;
          if(requireFreshLogin){
            await supabase.auth.signOut();
            if(mounted)setSession(null);
          }else if(mounted)setSession(data.session??null);
        }
      }catch(error){console.error("Unable to complete Study Arc auth link:",error)}
    };

    supabase.auth.getSession().then(({data,error})=>{if(!mounted)return;if(error)console.error("Unable to restore Supabase session:",error);setSession(data.session??null);setLoading(false)});
    Linking.getInitialURL().then(acceptAuthUrl).catch(()=>undefined);
    const linkSubscription=Linking.addEventListener("url",({url})=>{acceptAuthUrl(url).catch(()=>undefined)});
    const{data:listener}=supabase.auth.onAuthStateChange((_event,nextSession)=>{setSession(nextSession);setLoading(false)});
    return()=>{mounted=false;linkSubscription.remove();listener.subscription.unsubscribe()};
  },[]);

  const signIn=useCallback(async(email:string,password:string):Promise<AuthResult>=>{try{const{error}=await supabase.auth.signInWithPassword({email:email.trim().toLowerCase(),password});if(error)throw error;return{error:null}}catch(error){return{error:messageFrom(error)}}},[]);
  const signUp=useCallback(async(email:string,password:string):Promise<AuthResult>=>{try{const{data,error}=await supabase.auth.signUp({email:email.trim().toLowerCase(),password,options:{emailRedirectTo:authRedirect("/login","signup")}});if(error)throw error;return{error:null,needsEmailConfirmation:!data.session}}catch(error){return{error:messageFrom(error)}}},[]);
  const sendPasswordReset=useCallback(async(email:string):Promise<AuthResult>=>{try{const{error}=await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(),{redirectTo:authRedirect("/reset-password","recovery")});if(error)throw error;return{error:null}}catch(error){return{error:messageFrom(error)}}},[]);
  const updatePassword=useCallback(async(password:string):Promise<AuthResult>=>{try{const{error}=await supabase.auth.updateUser({password});if(error)throw error;return{error:null}}catch(error){return{error:messageFrom(error)}}},[]);
  const signOut=useCallback(async():Promise<AuthResult>=>{try{const{error}=await supabase.auth.signOut();if(error)throw error;return{error:null}}catch(error){return{error:messageFrom(error)}}},[]);
  const value=useMemo<AuthContextValue>(()=>({session,user:session?.user??null,loading,signIn,signUp,sendPasswordReset,updatePassword,signOut}),[session,loading,signIn,signUp,sendPasswordReset,updatePassword,signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth(){const value=useContext(AuthContext);if(!value)throw new Error("useAuth must be used inside AuthProvider.");return value;}
