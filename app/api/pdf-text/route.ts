import {getUserId,unauthorized} from "../auth/session";
import {PDFParse} from "pdf-parse";

export const runtime="nodejs";

export async function POST(req:Request){
 const userId=await getUserId(req);if(!userId)return unauthorized();
 let payload:{fileName?:string;data?:string};try{payload=await req.json()}catch{return Response.json({error:"PDF inválido."},{status:400})}
 if(!/\.pdf$/i.test(payload.fileName||"")||!payload.data||payload.data.length>4_100_000)return Response.json({error:"Envie um PDF válido de até 3 MB."},{status:400});
 const parser=new PDFParse({data:new Uint8Array(Buffer.from(payload.data,"base64"))});
 try{const result=await parser.getText(),text=result.text.trim();if(text.length<20)return Response.json({error:"Este PDF não possui texto selecionável. Envie o PDF original disponibilizado pelo banco."},{status:422});return Response.json({text})}catch(error){const reason=error instanceof Error?`${error.name}: ${error.message}`:String(error),message=/password/i.test(reason)?"Este PDF está protegido por senha. Precisamos da senha para fazer a leitura.":"Não conseguimos interpretar este PDF. Tente baixá-lo novamente no aplicativo do banco.";console.error("PDF_TEXT_EXTRACTION_FAILED",reason);return Response.json({error:message,code:"PDF_EXTRACTION_FAILED"},{status:422})}finally{await parser.destroy()}
}
