import { useAudioPlayer } from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import React,{useEffect,useMemo,useState} from "react";
import { Platform } from "react-native";
import type { RewardItem } from "../lib/rewardsCatalog";

const chars="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function bytesToBase64(bytes:Uint8Array){
 let out="";
 for(let i=0;i<bytes.length;i+=3){const a=bytes[i]??0,b=bytes[i+1]??0,c=bytes[i+2]??0,n=(a<<16)|(b<<8)|c;out+=chars[(n>>18)&63]+chars[(n>>12)&63]+(i+1<bytes.length?chars[(n>>6)&63]:"=")+(i+2<bytes.length?chars[n&63]:"=")}
 return out;
}
const hash=(s:string)=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
function wavFor(name:string){
 const sampleRate=8000,seconds=3,count=sampleRate*seconds,dataBytes=count*2,bytes=new Uint8Array(44+dataBytes),view=new DataView(bytes.buffer);
 const write=(o:number,s:string)=>{for(let i=0;i<s.length;i++)bytes[o+i]=s.charCodeAt(i)};
 write(0,"RIFF");view.setUint32(4,36+dataBytes,true);write(8,"WAVE");write(12,"fmt ");view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);write(36,"data");view.setUint32(40,dataBytes,true);
 let seed=hash(name)||1,smooth=0,walk=0;
 const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296*2-1};
 for(let i=0;i<count;i++){
   const t=i/sampleRate,r=rnd();smooth=smooth*.94+r*.06;walk=Math.max(-1,Math.min(1,walk+r*.025));
   let x=0;
   switch(name){
     case "Brown Noise": x=walk*.62; break;
     case "Deep Noise": x=walk*.72+smooth*.12; break;
     case "Rain": x=r*.30+(Math.abs(r)>.93?r*.48:0); break;
     case "Night Rain": x=r*.22+(Math.abs(r)>.96?r*.42:0)+Math.sin(t*2*Math.PI*85)*.025; break;
     case "Ocean": x=smooth*(.22+.20*(.5+.5*Math.sin(t*2*Math.PI*.22)))+Math.sin(t*2*Math.PI*55)*.04; break;
     case "River": x=r*.11+smooth*.34+Math.sin(t*2*Math.PI*140)*.018; break;
     case "Wind": x=smooth*(.24+.16*(.5+.5*Math.sin(t*2*Math.PI*.13))); break;
     case "Fireplace": x=smooth*.13+(Math.abs(r)>.975?r*.78:0); break;
     case "Soft Train": x=walk*.18+Math.sin(t*2*Math.PI*46)*.09+((Math.floor(t*3)%2)===0?Math.sin(t*2*Math.PI*120)*.025:0); break;
     case "Cafe": x=smooth*.16+Math.sin(t*2*Math.PI*(130+20*Math.sin(t*.7)))*.025+r*.055; break;
     case "Forest": x=smooth*.16+(Math.sin(t*2*Math.PI*(900+80*Math.sin(t*1.1)))*((i%sampleRate)>7200?.035:0)); break;
     case "Library": x=walk*.08+Math.sin(t*2*Math.PI*60)*.025+r*.018; break;
     default: x=smooth*.18;
   }
   const sample=Math.max(-1,Math.min(1,x))*32767;view.setInt16(44+i*2,sample,true);
 }
 return bytesToBase64(bytes);
}

export default function FocusSoundPlayer({item,active}:{item:RewardItem|undefined;active:boolean}){
 const player=useAudioPlayer(null);
 const[source,setSource]=useState<string|null>(null);
 const b64=useMemo(()=>item?wavFor(item.name):null,[item?.id]);
 useEffect(()=>{let alive=true;if(!item||!b64){setSource(null);return}if(Platform.OS==="web"){setSource(`data:audio/wav;base64,${b64}`);return}const uri=`${FileSystem.cacheDirectory}studyarc-focus-${item.id.replace(/[^a-z0-9]/gi,"-")}.wav`;FileSystem.getInfoAsync(uri).then(info=>info.exists?uri:FileSystem.writeAsStringAsync(uri,b64,{encoding:FileSystem.EncodingType.Base64}).then(()=>uri)).then(uri=>{if(alive)setSource(uri)}).catch(()=>setSource(null));return()=>{alive=false}},[b64,item?.id]);
 useEffect(()=>{if(!source)return;try{player.replace({uri:source});player.loop=true;player.volume=.24;if(active)player.play()}catch{}return()=>{try{player.pause()}catch{}}},[player,source]);
 useEffect(()=>{if(!source)return;try{if(active){player.loop=true;player.volume=.24;player.play()}else player.pause()}catch{}},[active,player,source]);
 return null;
}
