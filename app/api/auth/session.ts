const COOKIE="shiftzone_session",MAX_AGE=60*60*24*30,encoder=new TextEncoder();
const config=()=>process.env as Record<string,string|undefined>;
const base64url=(bytes:Uint8Array)=>{let binary="";for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary).replaceAll("+","-").replaceAll("/","_").replace(/=+$/g,"")};
const sign=async(value:string)=>{const secret=config().DASH_SESSION_SECRET||"";if(!secret)throw new Error("DASH_SESSION_SECRET não configurado");const key=await crypto.subtle.importKey("raw",encoder.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);return base64url(new Uint8Array(await crypto.subtle.sign("HMAC",key,encoder.encode(value))))};
const safeEqual=(a:string,b:string)=>{if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0};
const cookieValue=(req:Request)=>req.headers.get("cookie")?.split(";").map(v=>v.trim()).find(v=>v.startsWith(`${COOKIE}=`))?.slice(COOKIE.length+1)||"";
export async function createSession(userId:string){const expires=String(Math.floor(Date.now()/1000)+MAX_AGE),value=`${userId}.${expires}`;return `${value}.${await sign(value)}`}
export async function getUserId(req:Request){const [userId,expires,signature]=cookieValue(req).split(".");if(!userId||!expires||!signature||Number(expires)<Math.floor(Date.now()/1000))return null;const expected=await sign(`${userId}.${expires}`);return safeEqual(signature,expected)?userId:null}
export async function isAuthenticated(req:Request){return Boolean(await getUserId(req))}
export const sessionCookie=(token:string)=>`${COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${MAX_AGE}`;
export const clearSessionCookie=()=>`${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
export const unauthorized=()=>Response.json({error:"Acesso não autorizado"},{status:401,headers:{"cache-control":"no-store"}});
