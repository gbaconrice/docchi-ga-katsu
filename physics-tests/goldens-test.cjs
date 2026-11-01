const fs=require('fs'),assert=require('assert'),{api}=require('./harness.cjs'),{records}=require('./goldens.json');
for(const row of records){const actual=api.run(row.initial);delete actual.ms;assert.deepEqual(actual,row.expected);}
console.log('PASS: 30 independent candidate goldens match integrated physics exactly (winner,ticks,HP,positions,dead)');
