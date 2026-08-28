import type { Metadata, Viewport } from "next";
import "./globals.css";
import ClientNavigation from "./ClientNavigation";
import AuthGate from "./AuthGate";
import PwaInstall from "./PwaInstall";
export const metadata: Metadata = {
  metadataBase: new URL("https://meu-financeiro-familiar.contato-robsonjunior.chatgpt.site"),
  title: "Shift Zone Finance",
  description: "Dashboard editável para acompanhar renda, alimentação, gastos e decisões financeiras da família.",
  manifest: "/manifest.webmanifest",
  applicationName: "Shift Zone Finance",
  appleWebApp: {capable: true, title: "Shift Zone", statusBarStyle: "black-translucent"},
  icons: {icon: [{url: "/icon-192.png", sizes: "192x192", type: "image/png"}], apple: [{url: "/icon-192.png", sizes: "192x192", type: "image/png"}]},
  openGraph: { title: "Shift Zone Finance", description: "Renda, gastos e decisões em um só lugar", images: ["/og.png"] },
  twitter: { card: "summary_large_image", title: "Shift Zone Finance", description: "Renda, gastos e decisões em um só lugar", images: ["/og.png"] },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};
const themeBoot=`(()=>{try{const r=document.documentElement,s=localStorage;r.style.setProperty('--user-bg',s.getItem('dashfinance-bg')||'#030504');r.style.setProperty('--user-accent',s.getItem('dashfinance-accent')||'#2f9d6f');r.style.setProperty('--user-surface',s.getItem('dashfinance-surface')||'#0d110f');const f=s.getItem('dashfinance-font')||'modern',fonts={modern:'Inter,Segoe UI,system-ui,sans-serif',geometric:'Avenir Next,Trebuchet MS,Segoe UI,sans-serif',rounded:'ui-rounded,Arial Rounded MT Bold,Trebuchet MS,sans-serif'};r.style.setProperty('--user-display-font',fonts[f]||fonts.modern)}catch(e){}})()`;
const zoomLock=`(()=>{const block=e=>e.preventDefault();document.addEventListener('gesturestart',block,{passive:false});document.addEventListener('gesturechange',block,{passive:false});document.addEventListener('gestureend',block,{passive:false});document.addEventListener('touchmove',e=>{if(e.touches.length>1)e.preventDefault()},{passive:false})})()`;
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR" suppressHydrationWarning><head><meta name="theme-color" content="#030504"/><script dangerouslySetInnerHTML={{__html:themeBoot}}/><script dangerouslySetInnerHTML={{__html:zoomLock}}/></head><body><ClientNavigation/><AuthGate>{children}</AuthGate><PwaInstall/></body></html>}
