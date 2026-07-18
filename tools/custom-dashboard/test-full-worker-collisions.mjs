import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { __test } from '../../worker-admin1/src/index.js';
import { FILE_POLICIES, EDITABLE_PATHS, MAX_FILES_PER_COMMIT } from '../../worker-admin1/src/file-policies.js';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const assert=(v,m)=>{if(!v) throw new Error(m)};
const load=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const sampleFiles=EDITABLE_PATHS.map((p,i)=>({path:p,sha:`sha-${i}`,content:load(p)}));

// Input policy safety
assert(MAX_FILES_PER_COMMIT===21,'MAX files must equal exact allowlist size');
assert(__test.normalizeFiles(sampleFiles).length===21,'21-file atomic payload rejected');
for(const bad of [
  [...sampleFiles,{...sampleFiles[0],path:'data/visual-baseline.json'}],
  [sampleFiles[0],sampleFiles[0]],
]){
  let failed=false; try{__test.normalizeFiles(bad)}catch{failed=true} assert(failed,'unsafe payload accepted');
}
let invalid=structuredClone(sampleFiles.find(x=>x.path==='data/navigation-style.json'));
invalid.content.modeSwitchBackgroundOpacity=999;
let badNumber=false; try{__test.normalizeFiles([invalid])}catch{badNumber=true} assert(badNumber,'out-of-range number accepted');
let badList=structuredClone(sampleFiles.find(x=>x.path==='data/tools.json'));
badList.content[0]._cmsResetId='bad';
let badId=false; try{__test.normalizeFiles([badList])}catch{badId=true} assert(badId,'bad list ID accepted');
let unknown=structuredClone(sampleFiles.find(x=>x.path==='data/profile.json'));
unknown.content.__futurePagesCmsKey={preserve:true};
assert(__test.normalizeFiles([unknown]).length===1,'unknown key should be allowed');

function response(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}})}
const env={GITHUB_OWNER:'cybersabil',GITHUB_REPO:'cybersabil.github.io',GITHUB_BRANCH:'feature/chatgpt-custom-dashboard-v2'};
const session={token:'test-token'};

async function runAtomic({files=sampleFiles.slice(0,3),stalePath=null,branchConflict=false}){
  const calls=[]; let blob=0;
  globalThis.fetch=async (url,init={})=>{
    const u=new URL(url); const p=u.pathname+u.search; calls.push({p,method:init.method||'GET',body:init.body});
    if(p.includes('/git/ref/heads/')) return response({object:{sha:'base-head'}});
    if(p.includes('/contents/')){
      const decoded=decodeURIComponent(p.split('/contents/')[1].split('?')[0]);
      const f=files.find(x=>x.path===decoded);
      return response({sha:decoded===stalePath?'new-sha':f.sha});
    }
    if(p.endsWith('/git/commits/base-head')) return response({tree:{sha:'base-tree'}});
    if(p.endsWith('/git/blobs')) return response({sha:`blob-${++blob}`});
    if(p.endsWith('/git/trees')) return response({sha:'tree-new'});
    if(p.endsWith('/git/commits')) return response({sha:'commit-new'});
    if(p.includes('/git/refs/heads/')) return branchConflict?response({message:'conflict'},422):response({object:{sha:'commit-new'}});
    return response({message:`Unhandled ${p}`},500);
  };
  try{
    const normalized=__test.normalizeFiles(files);
    const result=await __test.atomicCommit(normalized,'Audit atomic save',session,env);
    return {result,calls};
  }catch(error){return {error,calls}}
}

const success=await runAtomic({files:sampleFiles});
assert(!success.error,'21-file atomic commit failed');
assert(success.result.commit==='commit-new','wrong commit result');
assert(success.result.files.length===21,'not all blobs returned');
assert(success.calls.filter(x=>x.p.endsWith('/git/commits')).length===1,'multiple commit objects created');
assert(success.calls.filter(x=>x.method==='PATCH').length===1,'branch ref not updated exactly once');

const stale=await runAtomic({files:sampleFiles.slice(0,3),stalePath:sampleFiles[1].path});
assert(stale.error?.status===409,'stale file SHA did not block');
assert(stale.calls.filter(x=>x.p.endsWith('/git/blobs')).length===0,'blobs created before stale check completed');
assert(stale.calls.filter(x=>x.method==='PATCH').length===0,'branch changed on stale failure');

const race=await runAtomic({files:sampleFiles.slice(0,3),branchConflict:true});
assert(race.error?.status===409,'branch race did not block');
assert(race.calls.filter(x=>x.method==='PATCH').length===1,'race test missing ref update');

console.log('AUDIT PASS 2E - strict 21-file allowlist and bounds validation: PASS');
console.log('AUDIT PASS 2F - all-or-none atomic commit for 21 files: PASS');
console.log('AUDIT PASS 2G - stale file SHA blocks before blob/commit creation: PASS');
console.log('AUDIT PASS 2H - branch-head race blocks non-force update: PASS');
console.log('FULL WORKER COLLISION AUDIT: PASS');
