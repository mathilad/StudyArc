export type VoiceNote = { id: string; subjectName: string; topicName: string; createdAt: string; durationSeconds: number; mimeType: string; size: number; path: string; deletedAt?: string };
type Index = { version: 1; notes: VoiceNote[] };
export class AudioError extends Error { constructor(message: string, public status = 400) { super(message); } }
export const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const formats: Record<string,string> = { 'audio/webm':'webm','audio/mp4':'m4a','audio/mpeg':'mp3','audio/ogg':'ogg','audio/wav':'wav','audio/3gpp':'3gp' };
export function validId(id: unknown): asserts id is string { if (typeof id !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(id)) throw new AudioError('Invalid recording ID.'); }
function encodeText(text:string) { const bytes=new TextEncoder().encode(text);let raw='';for(const byte of bytes)raw+=String.fromCharCode(byte);return btoa(raw); }
function decodeText(content:string) { return new TextDecoder().decode(Uint8Array.from(atob(content.replace(/\s/g,'')),c=>c.charCodeAt(0))); }
export class GitHubAudioStore {
 constructor(private repo:string,private token:string,private transport:typeof fetch=fetch) {
  if(!/^[\w.-]+\/[\w.-]+$/.test(repo)||!token)throw new AudioError('GitHub audio sync needs administrator setup. Your recordings remain on this device.',503);
 }
 private async request(path:string,method='GET',body?:unknown,raw=false) {
  const response=await this.transport(`https://api.github.com/repos/${this.repo}${path}`,{method,headers:{Authorization:`Bearer ${this.token}`,Accept:raw?'application/vnd.github.raw+json':'application/vnd.github+json','X-GitHub-Api-Version':'2026-03-10','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  if(response.status===404)return null;
  if(!response.ok)throw new AudioError(response.status===409||response.status===422?'GitHub is busy updating recordings. Please retry.':response.status===403||response.status===429?'GitHub sync is temporarily unavailable. Check the server token or try again later.':'GitHub audio sync failed. Please retry.',response.status===409||response.status===422?409:502);
  return raw?response:await response.json();
 }
 async assertPrivate() { const repo=await this.request('');if(!repo)throw new AudioError('The GitHub audio repository could not be found. Ask the administrator to check the connection.',503);if(repo.private!==true)throw new AudioError('Audio sync requires a private GitHub repository. Recordings were not uploaded.',503); }
 private root(userId:string) { if(!/^[a-f0-9-]{36}$/i.test(userId))throw new AudioError('Invalid account.',401);return `users/${userId}`; }
 private contentPath(path:string){return '/contents/'+path.split('/').map(encodeURIComponent).join('/');}
 private async readIndex(userId:string):Promise<{index:Index;sha?:string}> { const row=await this.request(this.contentPath(`${this.root(userId)}/index.json`));if(!row)return {index:{version:1,notes:[]}};const index=JSON.parse(decodeText(row.content));if(index.version!==1||!Array.isArray(index.notes))throw new AudioError('Recording library needs administrator attention.',502);return {index,sha:row.sha}; }
 private async editIndex(userId:string,edit:(notes:VoiceNote[])=>VoiceNote[]) {
  for(let attempt=0;attempt<3;attempt++){const {index,sha}=await this.readIndex(userId);index.notes=edit(index.notes);try { await this.request(this.contentPath(`${this.root(userId)}/index.json`),'PUT',{message:'Update private voice note library',content:encodeText(JSON.stringify(index)),...(sha?{sha}:{})});return index; }catch(e){if(!(e instanceof AudioError)||e.status!==409||attempt===2)throw e;}}
  throw new AudioError('Please retry syncing.',409);
 }
 async list(userId:string) { const {index}=await this.readIndex(userId);return {notes:index.notes.filter(n=>!n.deletedAt).map(({path,...note})=>note),deletedIds:index.notes.filter(n=>n.deletedAt).map(n=>n.id)}; }
 async upload(userId:string,payload:any) {
  validId(payload.id);const mime=String(payload.mimeType??'').split(';')[0].toLowerCase();if(!formats[mime])throw new AudioError('This audio format is not supported.');
  if(typeof payload.content!=='string'||payload.content.length%4!==0||!/^[A-Za-z0-9+/]+={0,2}$/.test(payload.content))throw new AudioError('Invalid audio upload.');
  const size=payload.content.length*3/4-(payload.content.endsWith('==')?2:payload.content.endsWith('=')?1:0);if(size<=0||size>MAX_AUDIO_BYTES)throw new AudioError('Recordings must be under 10 MB to sync. This recording is still on your device.');
  const subjectName=String(payload.subjectName??'').trim(),topicName=String(payload.topicName??'').trim();if(!subjectName||subjectName.length>100||!topicName||topicName.length>200||!Number.isFinite(payload.durationSeconds)||payload.durationSeconds<0||payload.durationSeconds>86400||!Number.isFinite(Date.parse(payload.createdAt)))throw new AudioError('Invalid recording details.');
  const {index}=await this.readIndex(userId);const old=index.notes.find(n=>n.id===payload.id);if(old){if(old.deletedAt)throw new AudioError('This recording has been deleted on another device.',409);return {note:old};}
  if(index.notes.length>=1000||index.notes.reduce((s,n)=>s+n.size,0)+size>200*1024*1024)throw new AudioError('Your GitHub recording library is full. This recording remains on your device.');
  const path=`${this.root(userId)}/audio/${payload.id}.${formats[mime]}`;
  // Idempotent retries: never overwrite an already uploaded audio file.
  if(!await this.request(this.contentPath(path)))await this.request(this.contentPath(path),'PUT',{message:'Save private voice note',content:payload.content});
  const note:VoiceNote={id:payload.id,subjectName,topicName,createdAt:payload.createdAt,durationSeconds:payload.durationSeconds,mimeType:mime,size,path};
  await this.editIndex(userId,notes=>{const previous=notes.find(n=>n.id===note.id);if(previous?.deletedAt)throw new AudioError('This recording has been deleted on another device.',409);return previous?notes:[note,...notes]});
  return {note};
 }
 async audio(userId:string,id:unknown) {validId(id);const {index}=await this.readIndex(userId);const note=index.notes.find(n=>n.id===id&&!n.deletedAt);if(!note||!note.path.startsWith(`${this.root(userId)}/audio/`))throw new AudioError('Recording not found.',404);const response=await this.request(this.contentPath(note.path),'GET',undefined,true) as Response|null;if(!response)throw new AudioError('Recording file not found.',404);const bytes=new Uint8Array(await response.arrayBuffer());if(bytes.length>MAX_AUDIO_BYTES)throw new AudioError('Recording is too large.',413);let raw='';for(let i=0;i<bytes.length;i+=8192)raw+=String.fromCharCode(...bytes.subarray(i,i+8192));return {content:btoa(raw),mimeType:note.mimeType}; }
 async remove(userId:string,id:unknown) {validId(id);let removed:VoiceNote|undefined;await this.editIndex(userId,notes=>notes.map(n=>{if(n.id!==id)return n;removed=n;return {...n,deletedAt:n.deletedAt??new Date().toISOString()}}));if(removed?.path.startsWith(`${this.root(userId)}/audio/`)){try{const file=await this.request(this.contentPath(removed.path));if(file)await this.request(this.contentPath(removed.path),'DELETE',{message:'Remove private voice note',sha:file.sha});}catch{/* The tombstone remains authoritative; GitHub history retains prior commits. */}}return {deleted:true}; }
}
