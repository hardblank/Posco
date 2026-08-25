import {getUserId,unauthorized} from "../auth/session";
import {db} from "../supabase";

type Contribution={id:number;amount:number;date:string;note:string};
type GoalRow={id:string;user_id:string;name:string;goal_type:string;target_amount:number;initial_amount:number;monthly_amount:number;target_date:string|null;priority:string;color:string;icon:string;linked_expense_id:number|null;contributions:Contribution[];created_at:string;updated_at:string};
const filter=(value:string)=>encodeURIComponent(value);
const types=new Set(["emergency","debt","travel","purchase","education","vehicle","home","custom"]);
const priorities=new Set(["high","medium","low"]);
const clean=(body:Record<string,unknown>)=>({name:String(body.name||"").trim(),goal_type:types.has(String(body.goalType))?String(body.goalType):"custom",target_amount:Number(body.targetAmount||0),initial_amount:Math.max(0,Number(body.initialAmount||0)),monthly_amount:Math.max(0,Number(body.monthlyAmount||0)),target_date:body.targetDate?String(body.targetDate):null,priority:priorities.has(String(body.priority))?String(body.priority):"medium",color:/^#[0-9a-f]{6}$/i.test(String(body.color))?String(body.color):"#9b6de3",icon:String(body.icon||"◎").slice(0,4),linked_expense_id:body.linkedExpenseId?Number(body.linkedExpenseId):null});

export async function GET(req:Request){
 const userId=await getUserId(req);if(!userId)return unauthorized();
 try{const rows=await db(`finance_goals?user_id=eq.${filter(userId)}&select=*&order=created_at.asc`) as GoalRow[];return Response.json({goals:rows})}catch{return Response.json({error:"Não foi possível carregar as metas. Execute a migração financial-goals-migration.sql no Supabase."},{status:500})}
}

export async function POST(req:Request){
 const userId=await getUserId(req);if(!userId)return unauthorized();
 let body:Record<string,unknown>;try{body=await req.json()}catch{return Response.json({error:"Dados inválidos"},{status:400})}
 const goal=clean(body);if(!goal.name||goal.target_amount<=0)return Response.json({error:"Informe o nome e um valor-alvo válido"},{status:400});
 try{const rows=await db("finance_goals",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({...goal,user_id:userId,contributions:[]})}) as GoalRow[];return Response.json({goal:rows[0]},{status:201})}catch{return Response.json({error:"Não foi possível criar a meta"},{status:500})}
}

export async function PUT(req:Request){
 const userId=await getUserId(req);if(!userId)return unauthorized();
 let body:Record<string,unknown>;try{body=await req.json()}catch{return Response.json({error:"Dados inválidos"},{status:400})}
 const id=String(body.id||""),goal=clean(body);if(!id||!goal.name||goal.target_amount<=0)return Response.json({error:"Meta inválida"},{status:400});
 try{const rows=await db(`finance_goals?id=eq.${filter(id)}&user_id=eq.${filter(userId)}`,{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify({...goal,updated_at:new Date().toISOString()})}) as GoalRow[];if(!rows.length)return Response.json({error:"Meta não encontrada"},{status:404});return Response.json({goal:rows[0]})}catch{return Response.json({error:"Não foi possível atualizar a meta"},{status:500})}
}

export async function PATCH(req:Request){
 const userId=await getUserId(req);if(!userId)return unauthorized();
 let body:{id?:string;amount?:number;date?:string;note?:string};try{body=await req.json()}catch{return Response.json({error:"Dados inválidos"},{status:400})}
 const id=String(body.id||""),amount=Number(body.amount||0);if(!id||amount<=0)return Response.json({error:"Informe um aporte válido"},{status:400});
 try{const rows=await db(`finance_goals?id=eq.${filter(id)}&user_id=eq.${filter(userId)}&select=*`) as GoalRow[];if(!rows.length)return Response.json({error:"Meta não encontrada"},{status:404});const current=rows[0],contribution:Contribution={id:Date.now(),amount,date:body.date||new Date().toLocaleDateString("en-CA"),note:String(body.note||"").trim()},updated=await db(`finance_goals?id=eq.${filter(id)}&user_id=eq.${filter(userId)}`,{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify({contributions:[...(current.contributions||[]),contribution],updated_at:new Date().toISOString()})}) as GoalRow[];return Response.json({goal:updated[0]})}catch{return Response.json({error:"Não foi possível registrar o aporte"},{status:500})}
}

export async function DELETE(req:Request){
 const userId=await getUserId(req);if(!userId)return unauthorized();
 const id=new URL(req.url).searchParams.get("id");if(!id)return Response.json({error:"Meta não informada"},{status:400});
 try{await db(`finance_goals?id=eq.${filter(id)}&user_id=eq.${filter(userId)}`,{method:"DELETE",headers:{Prefer:"return=minimal"}});return Response.json({ok:true})}catch{return Response.json({error:"Não foi possível excluir a meta"},{status:500})}
}