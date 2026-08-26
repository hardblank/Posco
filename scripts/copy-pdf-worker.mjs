import {copyFileSync,existsSync,mkdirSync} from "node:fs";
import {dirname,resolve} from "node:path";

const source=resolve("node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs");
const destination=resolve("public/pdf.worker.min.mjs");
if(!existsSync(source))throw new Error("Worker do leitor de PDF não encontrado.");
mkdirSync(dirname(destination),{recursive:true});
copyFileSync(source,destination);
