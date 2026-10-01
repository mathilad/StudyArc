import { createClient } from 'npm:@supabase/supabase-js@2.112.4';
import { AudioError, GitHubAudioStore } from './core.ts';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,x-client-info,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store'};
Deno.serve(async(req:Request)=>{
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return reply({error:'Method not allowed.'},405);
 try {
  const authorization=req.headers.get('Authorization')??'';if(!authorization.startsWith('Bearer '))return reply({error:'Sign in to sync your recordings.'},401);
  const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error}=await client.auth.getUser(authorization.slice(7));if(error||!user)return reply({error:'Sign in to sync your recordings.'},401);
  if(Number(req.headers.get('content-length')??0)>15*1024*1024)return reply({error:'Recording is too large to sync.'},413);
  const bodyText=await req.text();if(bodyText.length>15*1024*1024)return reply({error:'Recording is too large to sync.'},413);
  let body:any;try{body=JSON.parse(bodyText)}catch{return reply({error:'Invalid request.'},400)}
  const store=new GitHubAudioStore(Deno.env.get('GITHUB_AUDIO_REPOSITORY')??'',Deno.env.get('GITHUB_AUDIO_TOKEN')??'');
  await store.assertPrivate();
  // Account scope comes exclusively from verified Supabase Auth, never from request data.
  if(body.action==='list')return reply(await store.list(user.id));
  if(body.action==='upload')return reply(await store.upload(user.id,body));
  if(body.action==='audio')return reply(await store.audio(user.id,body.id));
  if(body.action==='delete')return reply(await store.remove(user.id,body.id));
  return reply({error:'Unknown recording action.'},400);
 } catch(e) {return reply({error:e instanceof AudioError?e.message:'Audio sync failed. Your local recordings are safe.'},e instanceof AudioError?e.status:500)}
});
