import fs from "node:fs";
import path from "node:path";
const root=path.resolve("node_modules");
const seen=new Set();
const packages=[];
function walk(dir){
  if(!fs.existsSync(dir))return;
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    if(!entry.isDirectory())continue;
    const full=path.join(dir,entry.name);
    if(entry.name.startsWith("@")){walk(full);continue;}
    const file=path.join(full,"package.json");
    if(fs.existsSync(file)&&!seen.has(file)){
      seen.add(file);
      try{
        const p=JSON.parse(fs.readFileSync(file,"utf8"));
        const license=typeof p.license==="string"?p.license:(Array.isArray(p.licenses)?p.licenses.map(x=>x.type).join(" OR "):"UNKNOWN");
        packages.push({name:p.name??entry.name,version:p.version??"?",license});
      }catch{packages.push({name:entry.name,version:"?",license:"UNKNOWN"})}
    }
    walk(path.join(full,"node_modules"));
  }
}
walk(root);
const counts=new Map();
for(const p of packages)counts.set(p.license,(counts.get(p.license)??0)+1);
console.log("Installed dependency license inventory");
for(const [license,count] of [...counts].sort((a,b)=>a[0].localeCompare(b[0])))console.log(String(count).padStart(4),license);
const unknown=packages.filter(p=>p.license==="UNKNOWN"||p.license==="UNLICENSED");
if(unknown.length){console.error("\nPackages requiring manual license verification:");for(const p of unknown)console.error(p.name+"@"+p.version);process.exitCode=1;}
console.log("\nTotal packages:",packages.length);
