import {getUserId,unauthorized} from "../auth/session";
import {db} from "../supabase";
import {duePeriodFor,ExistingExpense,parseStatement,ReconciliationIssue} from "../../../lib/bankImport";

type MonthRow={month_key:string;due_periods:number[];expenses:ExistingExpense[]};
type StateRow={primary_person_name:string|null};
type Payload={action:"preview"|"commit";targetMonth:string;documentType:"bank_statement"|"credit_card";accountName:string;fileName:string;content:string;selectedFingerprints?:string[];categoryOverrides?:Record<string,string>;nameOverrides?:Record<string,string>};
const validMonth=(value:string)=>/^\d{4}-(0[1-9]|1[0-2])$/.test(value),filter=(value:string)=>encodeURIComponent(value);

export async function POST(req:Request){
 const userId=await getUserId(req);if(!userId)return unauthorized();let payload:Payload;try{payload=await req.json() as Payload}catch{return Response.json({error:"Arquivo inválido"},{status:400})}
 if(!["preview","commit"].includes(payload.action)||!validMonth(payload.targetMonth)||!["bank_statement","credit_card"].includes(payload.documentType)||!payload.fileName||!payload.content||payload.content.length>5_000_000)return Response.json({error:"Dados de importação inválidos"},{status:400});
 const uid=filter(userId),[rows,allRows,states]=await Promise.all([db(`finance_months?user_id=eq.${uid}&month_key=eq.${filter(payload.targetMonth)}&select=month_key,due_periods,expenses`) as Promise<MonthRow[]>,db(`finance_months?user_id=eq.${uid}&select=month_key,due_periods,expenses`) as Promise<MonthRow[]>,db(`finance_state?user_id=eq.${uid}&select=primary_person_name`) as Promise<StateRow[]>]),month=rows[0];if(!month)return Response.json({error:"O mês selecionado ainda não existe no dashboard"},{status:404});
 const knownExpenses=allRows.flatMap(row=>row.expenses||[]),parsed=parseStatement(payload.content,payload.fileName,month.expenses||[],payload.documentType,knownExpenses),expenses=parsed.items.filter(item=>item.direction==="expense");if(!expenses.length)return Response.json({error:"Nenhuma saída bancária válida foi encontrada. Prefira um arquivo OFX ou CSV com data, descrição e valor."},{status:422});
 if(payload.action==="preview")return Response.json({items:expenses,ignoredIncome:parsed.ignoredIncome,summary:{transactions:expenses.length,duplicates:expenses.filter(item=>item.duplicateKind).length,ready:expenses.filter(item=>!item.duplicateKind||payload.documentType==="bank_statement"&&item.duplicateKind==="possible_manual").length}});
 const selected=new Set(payload.selectedFingerprints||[]),now=new Date().toISOString(),accountName=String(payload.accountName||"").trim().slice(0,80)||"Conta não informada",fileName=String(payload.fileName).replace(/[^\w.()\- áàâãéêíóôõúç]/gi,"").slice(0,120),owner=states[0]?.primary_person_name||"Titular",current=[...(month.expenses||[])],newExpenses:Record<string,unknown>[]=[];let flagged=0,skipped=0;
 for(const transaction of expenses){
  const category=String(payload.categoryOverrides?.[transaction.fingerprint]||transaction.category).trim().slice(0,60)||transaction.category;
  const name=String(payload.nameOverrides?.[transaction.fingerprint]||transaction.description).replace(/\s+/g," ").trim().slice(0,60)||transaction.description,userEditedName=name!==transaction.description&&!transaction.nameLearned;
  if(transaction.duplicateKind==="already_imported"||transaction.duplicateKind==="within_file"){skipped++;continue}
  if(transaction.duplicateKind==="possible_manual"&&transaction.matchedExpenseId!=null){const index=current.findIndex(item=>String(item.id)===String(transaction.matchedExpenseId));if(index>=0){const issue:ReconciliationIssue={fingerprint:transaction.fingerprint,date:transaction.date,description:name,amount:transaction.amount,category,accountName,fileName,detectedAt:now,status:"pending"},issues=current[index].reconciliationIssues||[];if(!issues.some(item=>item.fingerprint===issue.fingerprint)){current[index]={...current[index],reconciliationIssues:[...issues,issue]};flagged++}}}
  if(!selected.has(transaction.fingerprint)){skipped++;continue}
  const isMovement=payload.documentType==="bank_statement";
  newExpenses.push({id:Date.now()+newExpenses.length,name,rawDescription:transaction.rawDescription,merchantKey:transaction.merchantKey,userEditedName:userEditedName||transaction.nameLearned,paymentMethod:transaction.paymentMethod,amount:transaction.amount,type:isMovement?"Movimentação":"Variável",recordKind:isMovement?"bank_movement":"expense",category,categoryConfidence:transaction.confidence,owner,note:`Importado de ${accountName} • ${fileName}`,confirmed:transaction.duplicateKind?false:true,period:duePeriodFor(transaction.date,month.due_periods||[10]),paymentStatus:isMovement?"paid":"pending",paidDate:isMovement?transaction.date:"",transactionDate:transaction.date,source:"bank_import",importInfo:{fingerprint:transaction.fingerprint,accountName,fileName,documentType:payload.documentType,importedAt:now},possibleDuplicateOf:transaction.matchedExpenseId});
 }
 await db(`finance_months?user_id=eq.${uid}&month_key=eq.${filter(payload.targetMonth)}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({expenses:[...current,...newExpenses],updated_at:now})});
 return Response.json({ok:true,imported:newExpenses.length,flagged,skipped});
}
