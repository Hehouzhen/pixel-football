import {readFile} from 'node:fs/promises';
import {auditWorldIdentity} from './identity-audit.mjs';
// Read exported JSON as-is. Import/repair routines intentionally do not run here.
try{
 const path=process.argv[2];if(!path)throw new Error('用法：npm run audit:identity -- <导出的JSON备份路径>');
 const data=JSON.parse(await readFile(path,'utf8')),slots=Array.isArray(data.slots)?data.slots:[data.season?data:{season:data}];
 const reports=slots.flatMap((slot,index)=>slot?[{slot:index,...auditWorldIdentity(slot.season,slot.player)}]:[]);
 console.log(JSON.stringify({readOnly:true,reports},null,2));if(reports.some(r=>r.summary.error))process.exitCode=1;
}catch(error){console.error('未修改文件；审查失败：'+error.message);process.exitCode=2;}
