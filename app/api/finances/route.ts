import {getUserId,unauthorized} from "../auth/session";
import {db} from "../supabase";

const rows=[[1,"Dízimo",440,"Fixa","Família","Primeiro lançamento da anotação",1],[2,"Faculdade Robson",242,"Fixa","Robson","Mensalidade",1],[3,"Faculdade Gabi",172,"Fixa","Gabi","Mensalidade",1],[4,"Vivo Robson",65,"Fixa","Robson","Telefone",1],[5,"Vivo Gabi",90,"Fixa","Gabi","Mensalidade",1],[6,"Luz",0,"A confirmar","Casa","Valor não estava legível na imagem",0],[7,"Internet",150,"Fixa","Casa","Mensalidade",1],[8,"Imposto",136,"Fixa","Família","Conforme anotação",1],[9,"PC Mercado Pago",270,"Parcela","Robson","Compra parcelada",1],[10,"Spotify e Netflix",60,"Fixa","Família","Assinaturas juntas na anotação",1],[11,"Mesa / Alex",952,"Parcela","Família","R$ 240 + 312 + 160 + 40 + 200 · anotado 1/10",1],[12,"Serasa Robson",330,"Parcela","Robson","Acordo",1],[13,"Serasa Gabi",190,"Parcela","Gabi","Marcada como última parcela",1],[14,"Renner",192,"A confirmar","Família","Há + R$ 40 na anotação, não incluídos neste valor",0],[15,"Eucerin",104,"Variável","Família","Conforme anotação",1],[16,"Celular Michelle",412,"A confirmar","Família","Confirmar se é despesa ou valor recebido",0],[17,"Parcela celular",350,"Parcela","Família","Parcela 1/4",1],[18,"G2",75,"A confirmar","Família","Anotação parece indicar 2x de R$ 75",0],[19,"Dízimo",132,"Fixa","Família","Segundo lançamento da anotação",1],[20,"Academia",60,"Fixa","Família","Mensalidade",1],[21,"Boticário",75,"Variável","Família","Conforme anotação",1],[22,"Item a confirmar (parece ‘Rímel’)",105,"A confirmar","Família","Nome não estava totalmente legível",0],[23,"Liquidado",36,"A confirmar","Família","Descrição mantida como aparecia na anotação",0]];
const initialExpenses=rows.map(([id,name,amount,type,owner,note,confirmed])=>({id,name,amount,type,owner,note,confirmed:Boolean(confirmed),period:Number(id)<=11?"10":"20"}));
type StateRow={brand:string|null;heading:string|null;subtitle:string|null;theme_bg:string;theme_accent:string;theme_surface:string};
type MonthRow={month_key:string;income:number;income_robson:number|null;income_gabi:number|null;freelancers:unknown[];food_robson:number;food_gabi:number;expenses:unknown[]};
const validMonth=(v:string)=>/^\d{4}-(0[1-9]|1[0-2])$/.test(v),filter=(v:string)=>encodeURIComponent(v);

async function init(userId:string){
  const states=await db(`finance_state?user_id=eq.${filter(userId)}&select=brand`) as unknown[];
  if(states.length)return;
  const now=new Date().toISOString();
  await db("finance_state",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({user_id:userId,brand:"MYFINANCE",heading:"Visão financeira familiar",subtitle:"Robson & Gabi",theme_bg:"#030504",theme_accent:"#2f9d6f",theme_surface:"#0d110f",updated_at:now})});
  await db("finance_months",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify([{user_id:userId,month_key:"2026-08",income:9859,income_robson:null,income_gabi:null,freelancers:[],food_robson:550,food_gabi:585,expenses:[],updated_at:now},{user_id:userId,month_key:"2026-09",income:9859,income_robson:null,income_gabi:null,freelancers:[],food_robson:550,food_gabi:585,expenses:initialExpenses,updated_at:now}])});
}

export async function GET(req:Request){
  const userId=await getUserId(req);if(!userId)return unauthorized();await init(userId);
  const url=new URL(req.url),requested=url.searchParams.get("month")||"",uid=filter(userId);
  const [states,monthRows]=await Promise.all([db(`finance_state?user_id=eq.${uid}&select=brand,heading,subtitle,theme_bg,theme_accent,theme_surface`) as Promise<StateRow[]>,db(`finance_months?user_id=eq.${uid}&select=month_key,income,income_robson,income_gabi,freelancers,food_robson,food_gabi,expenses&order=month_key.asc`) as Promise<MonthRow[]>]);
  const g=states[0];if(!g)return Response.json({error:"Dados indisponíveis"},{status:500});
  const months=monthRows.map(r=>r.month_key),globalData={brand:g.brand||"MYFINANCE",heading:g.heading||"Visão financeira familiar",subtitle:g.subtitle||"Robson & Gabi",themeBg:g.theme_bg,themeAccent:g.theme_accent,themeSurface:g.theme_surface};
  if(url.searchParams.get("summary")==="annual"){const requestedYear=url.searchParams.get("year")||months.at(-1)?.slice(0,4)||String(new Date().getFullYear()),year=/^\d{4}$/.test(requestedYear)?requestedYear:String(new Date().getFullYear()),annualRows=monthRows.filter(r=>r.month_key.startsWith(`${year}-`)),years=[...new Set(months.map(m=>m.slice(0,4)))],annualMonths=annualRows.map(row=>{const freelancers=(row.freelancers||[]) as {amount?:number}[],expenses=(row.expenses||[]) as {amount?:number;paymentStatus?:string;type?:string;installmentCurrent?:number;installmentTotal?:number}[],freelance=freelancers.reduce((sum,item)=>sum+Number(item.amount||0),0),expensesTotal=expenses.reduce((sum,item)=>sum+Number(item.amount||0),0),paid=expenses.filter(item=>item.paymentStatus==="paid").reduce((sum,item)=>sum+Number(item.amount||0),0),installments=expenses.filter(item=>item.type==="Parcela");return {monthKey:row.month_key,fixedIncome:row.income,freelance,totalIncome:row.income+freelance,expenses:expensesTotal,balance:row.income+freelance-expensesTotal,paid,pending:expensesTotal-paid,installments:installments.length,endingInstallments:installments.filter(item=>item.installmentCurrent&&item.installmentTotal&&item.installmentCurrent>=item.installmentTotal).length}});return Response.json({...globalData,year,years,months:annualMonths})}
  const monthKey=validMonth(requested)&&months.includes(requested)?requested:(months.at(-1)||"2026-08"),m=monthRows.find(row=>row.month_key===monthKey);if(!m)return Response.json({error:"Dados indisponíveis"},{status:500});
  return Response.json({...globalData,monthKey:m.month_key,months,income:m.income,incomeRobson:m.income_robson,incomeGabi:m.income_gabi,freelancers:m.freelancers||[],foodRobson:m.food_robson,foodGabi:m.food_gabi,expenses:m.expenses||[]});
}

export async function PUT(req:Request){
  const userId=await getUserId(req);if(!userId)return unauthorized();
  const d=await req.json() as {monthKey:string;brand:string;heading:string;subtitle:string;themeBg:string;themeAccent:string;themeSurface:string;income:number;incomeRobson:number|null;incomeGabi:number|null;freelancers:unknown[];foodRobson:number;foodGabi:number;expenses:unknown[]};
  if(!validMonth(d.monthKey)||!Number.isFinite(d.income)||!Array.isArray(d.expenses)||!Array.isArray(d.freelancers))return Response.json({error:"Dados inválidos"},{status:400});
  const now=new Date().toISOString(),uid=filter(userId);
  await Promise.all([db(`finance_state?user_id=eq.${uid}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({brand:d.brand,heading:d.heading,subtitle:d.subtitle,theme_bg:d.themeBg,theme_accent:d.themeAccent,theme_surface:d.themeSurface,updated_at:now})}),db(`finance_months?user_id=eq.${uid}&month_key=eq.${filter(d.monthKey)}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({income:d.income,income_robson:d.incomeRobson,income_gabi:d.incomeGabi,freelancers:d.freelancers,food_robson:d.foodRobson,food_gabi:d.foodGabi,expenses:d.expenses,updated_at:now})})]);
  return Response.json({ok:true});
}

export async function POST(req:Request){
  const userId=await getUserId(req);if(!userId)return unauthorized();
  const d=await req.json() as {monthKey:string;sourceMonth:string;copyMode:"recurring"|"empty"};
  if(!validMonth(d.monthKey)||!validMonth(d.sourceMonth)||!["recurring","empty"].includes(d.copyMode))return Response.json({error:"Dados inválidos"},{status:400});
  const uid=filter(userId),existing=await db(`finance_months?user_id=eq.${uid}&month_key=eq.${filter(d.monthKey)}&select=month_key`) as unknown[];if(existing.length)return Response.json({error:"Este mês já existe"},{status:409});
  const sources=await db(`finance_months?user_id=eq.${uid}&month_key=eq.${filter(d.sourceMonth)}&select=month_key,income,income_robson,income_gabi,freelancers,food_robson,food_gabi,expenses`) as MonthRow[],source=sources[0];if(!source)return Response.json({error:"Mês de origem não encontrado"},{status:404});
  const expenses:Record<string,unknown>[]=d.copyMode==="recurring"?((source.expenses||[]) as {type:string;installmentCurrent?:number;installmentTotal?:number}[]).filter(e=>e.type==="Fixa"||(e.type==="Parcela"&&(!e.installmentTotal||!e.installmentCurrent||e.installmentCurrent<e.installmentTotal))).map((e,i)=>({...e,id:Date.now()+i,confirmed:false,paymentStatus:"pending",paidDate:"",installmentCurrent:e.type==="Parcela"&&e.installmentCurrent&&e.installmentTotal?Number(e.installmentCurrent)+1:e.installmentCurrent})):[];
  await db("finance_months",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({user_id:userId,month_key:d.monthKey,income:source.income,income_robson:source.income_robson,income_gabi:source.income_gabi,freelancers:[],food_robson:source.food_robson,food_gabi:source.food_gabi,expenses,updated_at:new Date().toISOString()})});
  return Response.json({ok:true,monthKey:d.monthKey});
}
