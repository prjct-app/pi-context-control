import assert from 'node:assert/strict';
import { test } from 'node:test';
import { installContextControl } from '../src/controller.js';
import { readHistory } from '../src/history.js';
function fixture() {
 const tools=new Map(), events=new Map(), requests=[], messages=[], notices=[];
 const branch=[{id:'original',type:'message',message:{role:'user',content:'ORIGINAL constraint: preserve Spanish ñ and evidence.'}},{id:'checkpoint',type:'compaction',firstKeptEntryId:'recent',tokensBefore:350000},{id:'recent',type:'message',message:{role:'assistant',content:[{type:'text',text:'Pending work'}],usage:{input:20,output:5,cacheRead:1000}}}];
 const pi={on:(n,f)=>events.set(n,f),registerTool:t=>tools.set(t.name,t),sendMessage:(...args)=>messages.push(args)};
 const ctx={model:{provider:'fixture',id:'model',contextWindow:1000000},thinkingLevel:'high',getContextUsage:()=>({tokens:160000}),sessionManager:{getBranch:()=>branch,getSessionId:()=> 'session'},hasUI:true,ui:{notify:(...args)=>notices.push(args)},compact:options=>requests.push(options)};
 const state=installContextControl(pi,{},()=>({enabled:true,reserveTokens:40000,keepRecentTokens:60000}));
 return {tools,events,requests,messages,notices,branch,state,ctx,call:(name,args={},signal)=>tools.get(name).execute('call',args,signal,undefined,ctx)};
}
test('inspection never requests compaction and registers no automatic trigger',async()=>{const f=fixture();assert.deepEqual([...f.events.keys()],['session_start','session_tree','session_shutdown']);const r=(await f.call('context_status')).details;assert.equal(r.contextTokens,160000);assert.equal(r.processedTokens.cacheRead,1000);assert.equal(r.nativeCompactionThreshold,960000);assert.equal(r.thinkingLevel,'high');assert.equal(f.requests.length,0);});
test('agent request acknowledges pending work and resumes only after success',async()=>{const f=fixture();assert.equal((await f.call('context_compact',{focus:'Preserve tests'})).details.status,'requested');assert.equal(f.state.pending,true);assert.equal(f.messages.length,0);assert.equal((await f.call('context_compact')).details.status,'already_requested');assert.equal(f.requests.length,1);assert.match(f.requests[0].customInstructions,/Preserve tests/);f.requests[0].onComplete();f.requests[0].onComplete();assert.equal(f.state.pending,false);assert.equal(f.messages.length,1);assert.deepEqual(f.messages[0][1],{triggerTurn:true,deliverAs:'followUp'});});
test('resume=false does not start another generation',async()=>{const f=fixture();await f.call('context_compact',{resume:false});f.requests[0].onComplete();assert.equal(f.messages.length,0);});
test('failed summary retains original journal and does not retry',async()=>{const f=fixture(), original=structuredClone(f.branch);await f.call('context_compact');f.requests[0].onError(new Error('token cap'));assert.deepEqual(f.branch,original);assert.equal(f.messages.length,0);assert.equal(f.requests.length,1);assert.equal(f.state.pending,false);assert.match(f.notices[0][0],/token cap/);});
for(const event of ['session_start','session_tree','session_shutdown'])test(`${event} invalidates stale completion`,async()=>{const f=fixture();await f.call('context_compact');f.events.get(event)();f.requests[0].onComplete();assert.equal(f.messages.length,0);});
test('aborted request does not compact',async()=>{const f=fixture();await assert.rejects(f.call('context_compact',{},AbortSignal.abort()),/cancelled/);assert.equal(f.requests.length,0);});
test('exact historical text is recoverable before the compaction boundary',async()=>{const f=fixture(), original=structuredClone(f.branch);const search=(await f.call('context_history',{action:'search',query:'SPANISH Ñ'})).details;assert.equal(search.entries[0].id,'original');assert.equal((await f.call('context_history',{action:'read',entryId:'original'})).details.text,f.branch[0].message.content);assert.deepEqual(f.branch,original);});
test('history pages reconstruct the entire entry and stay on the selected branch',()=>{const text='evidence '.repeat(8000);const branch=Array.from({length:45},(_,i)=>({id:String(i),type:'message',message:{role:'user',content:text}}));const search=readHistory(branch,{action:'search',query:'evidence'});assert.equal(search.entries.length,20);assert.equal(search.nextOffset,20);assert.equal(readHistory(branch,{action:'search',offset:40}).entries.length,5);const pages=[];let offset=0;do{const page=readHistory(branch,{action:'read',entryId:'0',offset});pages.push(page.text);offset=page.nextOffset;}while(offset!==null);assert.equal(pages.join(''),text);assert.throws(()=>readHistory(branch,{action:'read',entryId:'other-branch'}),/not in this session branch/);});

test('reading and listing render only the requested entries', () => {
  const reads = [];
  const branch = Array.from({ length: 100 }, (_, i) => ({ id: String(i), type: 'message', message: {
    role: 'assistant', get content() { reads.push(i); return [{ type: 'text', text: `original ${i}` }]; },
  } }));
  assert.equal(readHistory(branch, { action: 'read', entryId: '70' }).text, 'original 70');
  assert.deepEqual([...new Set(reads)], [70]);
  reads.length = 0;
  assert.equal(readHistory(branch, { action: 'search', offset: 20 }).totalMatches, 100);
  assert.deepEqual([...new Set(reads)], Array.from({ length: 20 }, (_, i) => i + 20));
  reads.length = 0;
  const found = readHistory(branch, { action: 'search', query: 'original 99' });
  assert.equal(found.entries[0].id, '99');
  assert.equal(new Set(reads).size, 100);
});
