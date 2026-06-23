const fs = require('fs');  
const t = fs.readFileSync('frontend/src/src/lib/planner-orchestrator.ts', `utf8`);  
const tokens = [  
  `planner_shadow_disabled`,  
  `planner_llm_missing`,  
  `planner_timeout`,  
  `planner_llm_exception`,  
  `planner_empty_output`,  
  `planner_json_extraction_failed`,  
  `planner_json_parse_error`,  
  `planner_contract_validation_failed`,  
  `planner_unexpected_error`,  
];  
for (const token of tokens) {  
