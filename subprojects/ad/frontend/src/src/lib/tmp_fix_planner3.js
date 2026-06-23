const fs = require('fs');  
const p = `frontend/src/src/lib/planner-orchestrator.ts`;  
let t = fs.readFileSync(p, `utf8`);  
const replacements = [  
  [`llm_client_missing`, `planner_llm_missing`],  
  [`llm_error`, `planner_llm_exception`],  
  [`llm_timeout`, `planner_timeout`],  
  [`empty_llm_output`, `planner_empty_output`],  
  [`json_extraction_failed`, `planner_json_extraction_failed`],  
  [`json_parse_error`, `planner_json_parse_error`],  
  [`unexpected_error`, `planner_unexpected_error`],  
];  
for (const [oldValue, newValue] of replacements) {  
  t = t.split(`'${oldValue}'`).join(`'${newValue}'`);  
}  
fs.writeFileSync(p, t, `utf8`); 
