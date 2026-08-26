type PdfTextItem={str:string;transform:number[];width:number;hasEOL?:boolean};

function pageLines(items:PdfTextItem[]){
 const rows:{y:number;items:PdfTextItem[]}[]=[];
 for(const item of items.filter(value=>value.str?.trim())){const y=Number(item.transform?.[5]||0),row=rows.find(value=>Math.abs(value.y-y)<2.5);if(row)row.items.push(item);else rows.push({y,items:[item]})}
 return rows.sort((a,b)=>b.y-a.y).map(row=>{let line="",right=0;for(const item of row.items.sort((a,b)=>Number(a.transform?.[4]||0)-Number(b.transform?.[4]||0))){const x=Number(item.transform?.[4]||0),gap=x-right;if(line&&gap>1.5)line+=" ";line+=item.str.trim();right=x+Number(item.width||0)}return line.replace(/\s+/g," ").trim()}).filter(Boolean);
}

export async function readStatementFile(file:File){
 if(!/\.pdf$/i.test(file.name)&&file.type!=="application/pdf")return file.text();
 const pdfjs=await import("pdfjs-dist/legacy/build/pdf.mjs");
 pdfjs.GlobalWorkerOptions.workerSrc="/pdf.worker.min.mjs";
 const task=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())});
 try{const pdf=await task.promise,lines:string[]=[];for(let pageNumber=1;pageNumber<=pdf.numPages;pageNumber++){const page=await pdf.getPage(pageNumber),content=await page.getTextContent(),items=content.items.filter(item=>"str" in item).map(item=>item as unknown as PdfTextItem);lines.push(...pageLines(items))}const text=lines.join("\n").trim();if(text.length<20)throw new Error("Este PDF não possui texto selecionável. Baixe o PDF original do banco em vez de uma foto ou digitalização.");return text}finally{await task.destroy()}
}
