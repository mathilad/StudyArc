import {StyleSheet} from "react-native";
import {appColor,getCurrentAppTheme} from "./appTheme";
function recolour(value:unknown):unknown{
 if(typeof value==="string")return appColor(value);
 if(Array.isArray(value))return value.map(recolour);
 if(value&&typeof value==="object"&&Object.getPrototypeOf(value)?.constructor?.name==="Object")return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,recolour(item)]));
 return value;
}
// Styles retain their original values, resolving the current palette when a screen renders.
export function createThemeStyles<T extends StyleSheet.NamedStyles<T>>(styles:T):T{
 const base=StyleSheet.create(styles);let palette="";const cache=new Map<PropertyKey,unknown>();
 return new Proxy(base,{get(target,key,receiver){const id=getCurrentAppTheme().id;if(palette!==id){palette=id;cache.clear()}const value=Reflect.get(target,key,receiver);if(id==="purple"||!value||typeof value!=="object")return value;if(!cache.has(key))cache.set(key,recolour(value));return cache.get(key)}});
}
