import {getUserId,unauthorized} from "../auth/session";
import {db} from "../supabase";

type CardPurchase={id:number|string;name?:string;amount?:number;type?:string;period?:string;category?:string;transactionDate?:string;installmentCurrent?:number|null;installmentTotal?:number|null;possibleDuplicateOf?:number|string|null;importInfo?:{accountName?:string;fileName?:string;documentType?:string;importedAt?:string}};
type MonthRow={month_key:string;due_periods:number[];expenses:CardPurchase[]};
type StateRow={theme_bg:string|null;theme_accent:string|null;theme_surface:string|null};
const validMonth=(value:string)=>/^\d{4}-(0[1-9]|1[0-2])$/.test(value),filter=(value:string)=>encodeURIComponent(value);

export async function GET(req:Request){
 const userId=await getUserId(req);if(!userId)return unauthorized();
 const uid=filter(userId),url=new URL(req.url),[rows,states]=await Promise.all([db(`finance_months?user_id=eq.${uid}&select=month_key,due_periods,expenses&order=month_key.asc`) as Promise<MonthRow[]>,db(`finance_state?user_id=eq.${uid}&select=theme_bg,theme_accent,theme_surface`) as Promise<StateRow[]>]),requested=url.searchParams.get("month")||"",monthKey=validMonth(requested)&&rows.some(row=>row.month_key===requested)?requested:rows.at(-1)?.month_key||"",row=rows.find(item=>item.month_key===monthKey),purchases=(row?.expenses||[]).filter(item=>item.importInfo?.documentType==="credit_card").sort((a,b)=>String(b.transactionDate||"").localeCompare(String(a.transactionDate||""))),state=states[0];
 return Response.json({monthKey,months:rows.map(item=>({monthKey:item.month_key,duePeriods:item.due_periods?.length?item.due_periods:[10]})),purchases,profile:{themeBg:state?.theme_bg||"#030504",themeAccent:state?.theme_accent||"#2f9d6f",themeSurface:state?.theme_surface||"#0d110f"}});
}
