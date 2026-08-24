"use client";

import {useEffect,useState} from "react";

type InstallPrompt=Event&{
  prompt:()=>Promise<void>;
  userChoice:Promise<{outcome:"accepted"|"dismissed"}>;
};

export default function PwaInstall(){
  const [installPrompt,setInstallPrompt]=useState<InstallPrompt|null>(null);
  const [installed,setInstalled]=useState(false);
  const [showHelp,setShowHelp]=useState(false);
  const [copied,setCopied]=useState(false);

  useEffect(()=>{
    if("serviceWorker" in navigator)navigator.serviceWorker.register("/sw.js").catch(()=>undefined);
    const standalone=window.matchMedia("(display-mode: standalone)").matches||Boolean((navigator as Navigator&{standalone?:boolean}).standalone);
    if(standalone){setInstalled(true);return}
    const ready=(event:Event)=>{event.preventDefault();setInstallPrompt(event as InstallPrompt)};
    const done=()=>{setInstalled(true);setInstallPrompt(null);setShowHelp(false)};
    window.addEventListener("beforeinstallprompt",ready);
    window.addEventListener("appinstalled",done);
    return()=>{
      window.removeEventListener("beforeinstallprompt",ready);
      window.removeEventListener("appinstalled",done);
    };
  },[]);

  if(installed)return null;

  const install=async()=>{
    if(!installPrompt){setShowHelp(true);return}
    await installPrompt.prompt();
    const choice=await installPrompt.userChoice;
    if(choice.outcome==="accepted")setInstallPrompt(null);
  };

  const copyLink=async()=>{
    try{
      await navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
      window.setTimeout(()=>setCopied(false),1800);
    }catch{setCopied(false)}
  };

  return <>
    <button className="pwaInstallButton" onClick={install} aria-label="Instalar Shift Zone Finance no dispositivo">
      <span>↓</span><b>Instalar aplicativo</b>
    </button>
    {showHelp&&<div className="pwaHelpBackdrop" role="presentation" onMouseDown={()=>setShowHelp(false)}>
      <section className="pwaHelpCard" role="dialog" aria-modal="true" aria-labelledby="pwa-help-title" onMouseDown={event=>event.stopPropagation()}>
        <button className="pwaHelpClose" onClick={()=>setShowHelp(false)} aria-label="Fechar">×</button>
        <span className="pwaHelpEyebrow">SHIFT ZONE</span>
        <h2 id="pwa-help-title">Instale pelo navegador</h2>
        <p>Este navegador não oferece instalação direta. Abra o Shift Zone Finance no <strong>Chrome</strong> ou <strong>Microsoft Edge</strong>.</p>
        <ol>
          <li>Copie o link e abra no Chrome ou Edge.</li>
          <li>Toque em <strong>Instalar aplicativo</strong> ou use o menu do navegador.</li>
        </ol>
        <div className="pwaHelpActions">
          <button className="primary" onClick={copyLink}>{copied?"Link copiado":"Copiar link"}</button>
          <button onClick={()=>setShowHelp(false)}>Entendi</button>
        </div>
      </section>
    </div>}
  </>;
}
