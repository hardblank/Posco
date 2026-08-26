"use client";
import {useEffect} from "react";
import {useRouter} from "next/navigation";
export default function ClientNavigation(){const router=useRouter();useEffect(()=>{["/","/movimentacoes","/cartao","/resumo","/dados"].forEach(path=>router.prefetch(path));const navigate=(event:MouseEvent)=>{const target=(event.target as HTMLElement).closest<HTMLAnchorElement>(".viewNav a,.mobileViewNav a");if(!target||target.target||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;const url=new URL(target.href,location.href);if(url.origin!==location.origin)return;event.preventDefault();router.push(url.pathname+url.search)};document.addEventListener("click",navigate,true);return()=>document.removeEventListener("click",navigate,true)},[router]);return null}
