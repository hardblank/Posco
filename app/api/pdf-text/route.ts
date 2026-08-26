import {getUserId,unauthorized} from "../auth/session";

export const runtime="nodejs";
type PdfTextItem={str:string;transform:number[];width:number};

function pageLines(items:PdfTextItem[]){const rows:{y:number;items:PdfTextItem[]}[]=[];for(const item of items.filter(value=>value.str?.trim())){const y=Number(item.transform?.[5]||0),row=rows.find(value=>Math.abs(value.y-y)<2.5);if(row)row.items.push(item);else rows.push({y,items:[item]})}return rows.sort((a,b)=>b.y-a.y).map(row=>{let line="",right=0;for(const item of row.items.sort((a,b)=>Number(a.transform?.[4]||0)-Number(b.transform?.[4]||0))){const x=Number(item.transform?.[4]||0);if(line&&x-right>1.5)line+=" ";line+=item.str.trim();right=x+Number(item.width||0)}return line.replace(/\s+/g," ").trim()}).filter(Boolean)}

export async function POST(req:Request){
 const userId=await getUserId(req);if(!userId)return unauthorized();
 let payload:{fileName?:string;data?:string};try{payload=await req.json()}catch{return Response.json({error:"PDF inválido."},{status:400})}
 if(!/\.pdf$/i.test(payload.fileName||"")||!payload.data||payload.data.length>4_100_000)return Response.json({error:"Envie um PDF válido de até 3 MB."},{status:400});
 try{const [pdfjs]=await Promise.all([import("pdfjs-dist/legacy/build/pdf.mjs"),import("pdfjs-dist/legacy/build/pdf.worker.mjs")]),bytes=new Uint8Array(Buffer.from(payload.data,"base64")),task=pdfjs.getDocument({data:bytes});try{const pdf=await task.promise,lines:string[]=[];for(let pageNumber=1;pageNumber<=pdf.numPages;pageNumber++){const page=await pdf.getPage(pageNumber),content=await page.getTextContent(),items=content.items.filter(item=>"str" in item).map(item=>item as unknown as PdfTextItem);lines.push(...pageLines(items))}const text=lines.join("\n").trim();if(text.length<20)return Response.json({error:"Este PDF não possui texto selecionável. Baixe o arquivo original do banco, não uma foto ou digitalização."},{status:422});return Response.json({text})}finally{await task.destroy()}}catch(error){const reason=error instanceof Error?`${error.name}: ${error.message}`:String(error),message=/password/i.test(reason)?"Este PDF está protegido por senha. Precisamos da senha para fazer a leitura.":/worker|module|import/i.test(reason)?"O leitor de PDF não carregou corretamente no servidor. Atualize a página e tente novamente.":"Não conseguimos abrir este PDF específico. Envie o arquivo aqui no chat para adaptarmos o leitor ao formato do banco.";console.error("PDF_TEXT_EXTRACTION_FAILED",reason);return Response.json({error:message,code:"PDF_EXTRACTION_FAILED"},{status:422})}
}
