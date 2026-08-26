type PdfTextItem={str:string;transform:number[];width:number;hasEOL?:boolean};

function pageLines(items:PdfTextItem[]){
 const rows:{y:number;items:PdfTextItem[]}[]=[];
 for(const item of items.filter(value=>value.str?.trim())){const y=Number(item.transform?.[5]||0),row=rows.find(value=>Math.abs(value.y-y)<2.5);if(row)row.items.push(item);else rows.push({y,items:[item]})}
 return rows.sort((a,b)=>b.y-a.y).map(row=>{let line="",right=0;for(const item of row.items.sort((a,b)=>Number(a.transform?.[4]||0)-Number(b.transform?.[4]||0))){const x=Number(item.transform?.[4]||0),gap=x-right;if(line&&gap>1.5)line+=" ";line+=item.str.trim();right=x+Number(item.width||0)}return line.replace(/\s+/g," ").trim()}).filter(Boolean);
}

export async function readStatementFile(file:File){
 if(!/\.pdf$/i.test(file.name)&&file.type!=="application/pdf")return file.text();
 try{return await readPdfInBrowser(file)}catch{return readPdfOnServer(file)}
}

const fileBytes=(file:File)=>typeof file.arrayBuffer==="function"?file.arrayBuffer().then(value=>new Uint8Array(value)):new Promise<Uint8Array>((resolve,reject)=>{const reader=new FileReader;reader.onerror=()=>reject(new Error("Não foi possível abrir o arquivo."));reader.onload=()=>resolve(new Uint8Array(reader.result as ArrayBuffer));reader.readAsArrayBuffer(file)});

async function readPdfInBrowser(file:File){const pdfjs=await import("pdfjs-dist/legacy/build/pdf.mjs"),bytes=await fileBytes(file);pdfjs.GlobalWorkerOptions.workerSrc="/pdf.worker.min.mjs";const task=pdfjs.getDocument({data:bytes});try{const pdf=await task.promise,lines:string[]=[];for(let pageNumber=1;pageNumber<=pdf.numPages;pageNumber++){const page=await pdf.getPage(pageNumber),content=await page.getTextContent(),items=content.items.filter(item=>"str" in item).map(item=>item as unknown as PdfTextItem);lines.push(...pageLines(items))}const text=lines.join("\n").trim();if(text.length<20)throw new Error("PDF sem texto");return text}finally{await task.destroy()}}

const toBase64=(file:File)=>new Promise<string>((resolve,reject)=>{const reader=new FileReader;reader.onerror=()=>reject(new Error("Não foi possível abrir o PDF."));reader.onload=()=>resolve(String(reader.result||"").split(",")[1]||"");reader.readAsDataURL(file)});
async function readPdfOnServer(file:File){if(file.size>3_000_000)throw new Error("Este PDF é muito grande para a leitura pelo celular. Envie um PDF de até 3 MB.");const response=await fetch("/api/pdf-text",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({fileName:file.name,data:await toBase64(file)})}),body=await response.text();let result:{text?:string;error?:string}={};try{result=JSON.parse(body) as typeof result}catch{throw new Error("O leitor de PDF ficou indisponível por alguns instantes. Tente novamente.")}if(!response.ok||!result.text)throw new Error(result.error||"Não foi possível ler este PDF.");return result.text}
