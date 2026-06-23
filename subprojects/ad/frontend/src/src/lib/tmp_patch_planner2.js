const fs = require('fs');  
const filePath = 'frontend\\src\\src\\lib\\planner-orchestrator.ts';  
const text = fs.readFileSync(filePath, 'utf8');  
const oldPattern = /status: 'disabled',\r?\n\s*errors,\r?\n\s*warnings,\r?\n\s*durationMs: Date.now\(\) - startTime,\r?\n\s*\.\.\.buildPlannerGovernanceMeta\(\{ plannerMode \}\),/;  
const newSegmentLines = [  
  `status: 'disabled',`,  
  `        errors: [{ code: 'planner_shadow_disabled', message: 'Planner shadow execution is disabled by governance config.' }],`,  
  `        warnings,`,  
  `        durationMs: Date.now() - startTime,`,  
  `      ...buildPlannerGovernanceMeta({ plannerMode }),`,  
];  
const newSegment = newSegmentLines.join('\r\n');  
const changed = text.replace(oldPattern, newSegment);  
if (text === changed) { console.log('no-replace'); } else { fs.writeFileSync(filePath, changed, 'utf8'); console.log('patched'); } 
