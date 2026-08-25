import {getUserId,unauthorized} from "../auth/session";
import {db} from "../supabase";

type StateRow={brand:string|null;heading:string|null;subtitle:string|null;theme_bg:string;theme_accent:string;theme_surface:string;finance_mode:"individual"|"family"|null;primary_person_name:string|null;secondary_person_name:string|null};
type MonthRow={month_key:string;due_periods:number[];income:number;income_robson:number|null;income_gabi:number|null;freelancers:unknown[];food_robson:number;food_gabi:number;expenses:unknown[]};
const validMonth=(v:string)=>/^\d{4}-(0[1-9]|1[0-2])$/.test(v),filter=(v:string)=>encodeURIComponent(v);

async function init(userId:string){
  const states=await db(`finance_state?user_id=eq.${filter(userId)}&select=brand`) as unknown[];
  if(states.length)return;
  const now=new Date().toISOString(),monthKey=now.slice(0,7);
  await db("finance_state",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({user_id:userId,brand:"SHIFT ZONE",heading:"Minha visão financeira",subtitle:"Organize hoje. Avance amanhã.",theme_bg:"#030504",theme_accent:"#2f9d6f",theme_surface:"#0d110f",finance_mode:"individual",primary_person_name:"Titular",secondary_person_name:"Pessoa 2",updated_at:now})});
  await db("finance_months",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({user_id:userId,month_key:monthKey,due_periods:[10],income:0,income_robson:null,income_gabi:null,freelancers:[],food_robson:0,food_gabi:0,expenses:[],updated_at:now})});
}

export async function GET(req:Request){
  const userId=await getUserId(req);if(!userId)return unauthorized();await init(userId);
  const url=new URL(req.url),requested=url.searchParams.get("month")||"",uid=filter(userId);
  const [states,monthRows]=await Promise.all([db(`finance_state?user_id=eq.${uid}&select=brand,heading,subtitle,theme_bg,theme_accent,theme_surface,finance_mode,primary_person_name,secondary_person_name`) as Promise<StateRow[]>,db(`finance_months?user_id=eq.${uid}&select=month_key,due_periods,income,income_robson,income_gabi,freelancers,food_robson,food_gabi,expenses&order=month_key.asc`) as Promise<MonthRow[]>]);
  const g=states[0];if(!g)return Response.json({error:"Dados indisponíveis"},{status:500});
  const months=monthRows.map(r=>r.month_key),globalData={brand:g.brand||"SHIFT ZONE",heading:g.heading||"Minha visão financeira",subtitle:g.subtitle||"Organize hoje. Avance amanhã.",themeBg:g.theme_bg,themeAccent:g.theme_accent,themeSurface:g.theme_surface,financeMode:g.finance_mode||"individual",primaryPersonName:g.primary_person_name||"Titular",secondaryPersonName:g.secondary_person_name||"Pessoa 2"};
  if(url.searchParams.get("summary")==="annual"){const requestedYear=url.searchParams.get("year")||months.at(-1)?.slice(0,4)||String(new Date().getFullYear()),year=/^\d{4}$/.test(requestedYear)?requestedYear:String(new Date().getFullYear()),annualRows=monthRows.filter(r=>r.month_key.startsWith(`${year}-`)),years=[...new Set(months.map(m=>m.slice(0,4)))],annualMonths=annualRows.map(row=>{const freelancers=(row.freelancers||[]) as {amount?:number}[],expenses=(row.expenses||[]) as {amount?:number;paymentStatus?:string;type?:string;installmentCurrent?:number;installmentTotal?:number}[],freelance=freelancers.reduce((sum,item)=>sum+Number(item.amount||0),0),expensesTotal=expenses.reduce((sum,item)=>sum+Number(item.amount||0),0),paid=expenses.filter(item=>item.paymentStatus==="paid").reduce((sum,item)=>sum+Number(item.amount||0),0),installments=expenses.filter(item=>item.type==="Parcela");return {monthKey:row.month_key,fixedIncome:row.income,freelance,totalIncome:row.income+freelance,expenses:expensesTotal,balance:row.income+freelance-expensesTotal,paid,pending:expensesTotal-paid,installments:installments.length,endingInstallments:installments.filter(item=>item.installmentCurrent&&item.installmentTotal&&item.installmentCurrent>=item.installmentTotal).length}});return Response.json({...globalData,year,years,months:annualMonths})}
  const monthKey=validMonth(requested)&&months.includes(requested)?requested:(months.at(-1)||new Date().toISOString().slice(0,7)),m=monthRows.find(row=>row.month_key===monthKey);if(!m)return Response.json({error:"Dados indisponíveis"},{status:500});
  return Response.json({...globalData,monthKey:m.month_key,months,duePeriods:m.due_periods?.length?m.due_periods:[10],income:m.income,incomeRobson:m.income_robson,incomeGabi:m.income_gabi,freelancers:m.freelancers||[],foodRobson:m.food_robson,foodGabi:m.food_gabi,expenses:m.expenses||[]});
}

export async function PUT(req:Request){
  const userId=await getUserId(req);if(!userId)return unauthorized();
  const d=await req.json() as {monthKey:string;duePeriods:number[];brand:string;heading:string;subtitle:string;themeBg:string;themeAccent:string;themeSurface:string;financeMode:"individual"|"family";primaryPersonName:string;secondaryPersonName:string;income:number;incomeRobson:number|null;incomeGabi:number|null;freelancers:unknown[];foodRobson:number;foodGabi:number;expenses:unknown[]};
  if(!validMonth(d.monthKey)||!Array.isArray(d.duePeriods)||!d.duePeriods.length||d.duePeriods.some(day=>!Number.isInteger(day)||day<1||day>31)||new Set(d.duePeriods).size!==d.duePeriods.length||!["individual","family"].includes(d.financeMode)||!d.primaryPersonName?.trim()||(d.financeMode==="family"&&!d.secondaryPersonName?.trim())||!Number.isFinite(d.income)||!Array.isArray(d.expenses)||!Array.isArray(d.freelancers))return Response.json({error:"Dados inválidos"},{status:400});
  const now=new Date().toISOString(),uid=filter(userId);
  await Promise.all([db(`finance_state?user_id=eq.${uid}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({brand:d.brand,heading:d.heading,subtitle:d.subtitle,theme_bg:d.themeBg,theme_accent:d.themeAccent,theme_surface:d.themeSurface,finance_mode:d.financeMode,primary_person_name:d.primaryPersonName.trim(),secondary_person_name:d.secondaryPersonName.trim()||"Pessoa 2",updated_at:now})}),db(`finance_months?user_id=eq.${uid}&month_key=eq.${filter(d.monthKey)}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({due_periods:d.duePeriods,income:d.income,income_robson:d.incomeRobson,income_gabi:d.incomeGabi,freelancers:d.freelancers,food_robson:d.foodRobson,food_gabi:d.foodGabi,expenses:d.expenses,updated_at:now})})]);
  return Response.json({ok:true});
}

export async function POST(req:Request){
  const userId=await getUserId(req);if(!userId)return unauthorized();
  const d=await req.json() as {monthKey:string;sourceMonth:string;copyMode:"recurring"|"empty"};
  if(!validMonth(d.monthKey)||!validMonth(d.sourceMonth)||!["recurring","empty"].includes(d.copyMode))return Response.json({error:"Dados inválidos"},{status:400});
  const uid=filter(userId),existing=await db(`finance_months?user_id=eq.${uid}&month_key=eq.${filter(d.monthKey)}&select=month_key`) as unknown[];if(existing.length)return Response.json({error:"Este mês já existe"},{status:409});
  const sources=await db(`finance_months?user_id=eq.${uid}&month_key=eq.${filter(d.sourceMonth)}&select=month_key,due_periods,income,income_robson,income_gabi,freelancers,food_robson,food_gabi,expenses`) as MonthRow[],source=sources[0];if(!source)return Response.json({error:"Mês de origem não encontrado"},{status:404});
  const expenses:Record<string,unknown>[]=d.copyMode==="recurring"?((source.expenses||[]) as {type:string;installmentCurrent?:number;installmentTotal?:number}[]).filter(e=>e.type==="Fixa"||(e.type==="Parcela"&&(!e.installmentTotal||!e.installmentCurrent||e.installmentCurrent<e.installmentTotal))).map((e,i)=>({...e,id:Date.now()+i,confirmed:false,paymentStatus:"pending",paidDate:"",installmentCurrent:e.type==="Parcela"&&e.installmentCurrent&&e.installmentTotal?Number(e.installmentCurrent)+1:e.installmentCurrent})):[];
  await db("finance_months",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({user_id:userId,month_key:d.monthKey,due_periods:source.due_periods?.length?source.due_periods:[10],income:source.income,income_robson:source.income_robson,income_gabi:source.income_gabi,freelancers:[],food_robson:source.food_robson,food_gabi:source.food_gabi,expenses,updated_at:new Date().toISOString()})});
  return Response.json({ok:true,monthKey:d.monthKey});
}
