// Checks for where the books are kept (IndexedDB, with a one-time move from localStorage). Run with:
//   node tests/books-store.js [path/to/index.html]   (default: beta/index.html)
// Uses a small in-memory stand-in for IndexedDB. Prints one line per check; exits with an error if any fail.
const fs=require('fs'),path=require('path');
const mk=()=>({hidden:true,value:'',style:{},classList:{toggle(){},add(){}},dataset:{},focus(){},click(){},remove(){},querySelector:()=>null,textContent:'',innerHTML:'',disabled:false});
const els={},ids={};
global.document={querySelector:s=>els[s]||(els[s]=mk()),querySelectorAll:()=>[],getElementById:s=>ids[s]||(ids[s]=mk()),addEventListener(){},createElement:()=>mk(),body:{appendChild(){},classList:{toggle(){},add(){},remove(){}}},hidden:false};
global.window={scrollTo(){}};global.location={protocol:'file:',pathname:'/'};
Object.defineProperty(global,'navigator',{value:{},configurable:true});
const store={};
for(const [k,f] of Object.entries({getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]}})) Object.defineProperty(store,k,{value:f,enumerable:false});
global.localStorage=store;
global.URL.createObjectURL=()=>'x';global.confirm=()=>true;global.alert=m=>{global.lastAlert=m};
// --- a tiny IndexedDB stand-in: databases of object stores, each a Map; writes land when the transaction completes ---
const DBS={}; let failOpen=false, failWrites=false;
const later=f=>setTimeout(f,0);
function makeDb(name){
  const d=DBS[name];
  return {close(){},transaction(sn,mode){
    const st=d[sn]||(d[sn]=new Map()), pending=new Map(), tx={};
    const req=fn=>{const r={};later(()=>{r.result=fn();});return r;};
    tx.objectStore=()=>({
      put:(v,k)=>req(()=>{pending.set(k===undefined?v.id:k,v);}),
      delete:k=>req(()=>{pending.set(k,undefined);}),
      get:k=>req(()=>st.get(k)),
      getAll:()=>req(()=>[...st.values()]),
      getAllKeys:()=>req(()=>[...st.keys()])
    });
    later(()=>later(()=>{ if(mode==='readwrite'&&failWrites){tx.error=new Error('QuotaExceeded');tx.onabort&&tx.onabort();return;}
      for(const [k,v] of pending){ if(v===undefined) st.delete(k); else st.set(k,v); } tx.oncomplete&&tx.oncomplete(); }));
    return tx;
  }};
}
global.indexedDB={
  open(name){const r={};later(()=>{ if(failOpen){r.error=new Error('nope');r.onerror&&r.onerror();return;}
    const fresh=!DBS[name]; if(fresh) DBS[name]={}; r.result=Object.assign(makeDb(name),{createObjectStore:sn=>{DBS[name][sn]=new Map();}});
    if(fresh&&r.onupgradeneeded) r.onupgradeneeded(); r.onsuccess&&r.onsuccess();});return r;},
  deleteDatabase(name){delete DBS[name];}
};
// --- books saved by version 3.22.1, still in localStorage ---
const OLDP=JSON.stringify({list:[{id:'default',name:'Old Biz'},{id:'p2',name:'Home'}],current:'default',dark:false,biz:true,lock:60});
store['stockpile_profiles']=OLDP;
store['money_inventory_tracker_v1']=JSON.stringify({tx:[{id:'t1',type:'in',amount:50,cat:'Sales',acct:'cash',date:'2026-11-01'}],items:[{id:'a',name:'OldWidget',cost:1,price:2,qty:4}],debts:[]});
store['money_inventory_tracker_v1_p2']=JSON.stringify({tx:[{id:'h1',type:'out',amount:20,cat:'Food',acct:'cash',date:'2026-11-02'}],items:[],debts:[]});
store['stockpile_device']='abc12345';
const test=`
;(async()=>{
const ok=(c,m)=>{ if(!c){ console.log('FAIL: '+m); process.exitCode=1; } else console.log('ok   '+m); };
const kv=()=>DBS['stockpile_books'].kv, wait=()=>new Promise(r=>setTimeout(r,20));
const reopen=async()=>{ await saveQ; await ST.q; ST.mem=null; ST.db=null; ST.blocked=false; SEC=null;DK=null;LEGACY=null;KR=new Map();KEYS={};S=fresh();P=defaultP(); storageOK=true; await init(); };
await ready; await wait();
ok(!!ST.mem && S.tx.length===1 && S.items[0].name==='OldWidget' && P.list.length===2,'old books from localStorage open after the update');
ok(kv().has(PKEY) && kv().has(KEY0) && kv().has(KEY0+'_p2'),'all books were moved into IndexedDB');
ok(!(PKEY in store) && !(KEY0 in store) && !((KEY0+'_p2') in store) && store['stockpile_where']==='idb','old copies were cleared from localStorage once moved');
ok(store['stockpile_device']==='abc12345','small settings stay where they were');
await switchProfile('p2'); ok(S.tx[0].cat==='Food','second set of books opens from IndexedDB');
await switchProfile('default');
S.tx.push({id:'t2',type:'in',amount:7,cat:'Sales',acct:'cash',date:today()}); save(); await ST.q;
ok(/"t2"/.test(kv().get(KEY0)) && !(KEY0 in store),'new entries are written to IndexedDB, not localStorage');
await reopen(); ok(S.tx.length===2 && P.list[0].name==='Old Biz','closing and reopening keeps everything');
// big books: far past the old 5 million character limit
S.tx=[]; for(let i=0;i<40000;i++) S.tx.push({id:'b'+i,type:'out',amount:i%97,cat:'Misc',note:'x'.repeat(150),acct:'cash',date:today()}); save(); await ST.q;
ok(kv().get(KEY0).length>5e6 && storageOK,'books bigger than localStorage could ever hold are saved');
await reopen(); ok(S.tx.length===40000,'and they reopen in full');
S.tx=S.tx.slice(0,2); save(); await ST.q;
// PIN on: nothing readable in IndexedDB
await enableEnc('123456'); await saveQ; await ST.q;
const allKv=()=>[...kv().values()].join('|');
ok(!/OldWidget|Old Biz|"Food"/.test(allKv()) && !/OldWidget/.test(Object.values(store).join('|')),'after PIN: nothing readable in IndexedDB or localStorage');
await reopen(); ok(els['#lock'].hidden===false && S.tx.length===0,'reopen with PIN: starts locked');
els['#pinIn'].value='123456'; await tryUnlock(); ok(els['#lock'].hidden===true && S.items[0].name==='OldWidget','right PIN opens the books from IndexedDB');
// a failed write is shown, not hidden
failWrites=true; S.tx.push({id:'t3',type:'in',amount:1,cat:'Sales',acct:'cash',date:today()}); save(); await saveQ; await ST.q; failWrites=false;
ok(storageOK===false,'a write the phone refuses turns on the "not being saved" warning');
save(); await saveQ; await ST.q; ok(storageOK===true,'and it clears once saving works again');
// storage refuses to open after the move: never start fresh on top of the real books
failOpen=true; await reopen();
ok(ST.blocked && !firstRun && /couldn't be opened/.test($('#view').innerHTML),'if the books storage will not open, StockPile says so instead of starting empty');
const before=allKv(); S.tx.push({id:'zz',type:'in',amount:1,cat:'Sales',acct:'cash',date:today()}); save(); await saveQ; await ST.q;
ok(allKv()===before && !(KEY0 in store),'and nothing is saved over them');
failOpen=false; await reopen(); ok(!ST.blocked && SEC,'next open works normally');
// erase everything clears IndexedDB books too
eraseEverything(); await ST.q; ok(![...kv().keys()].some(isBookKey) && !(KEY0 in store),'Erase everything clears the books from IndexedDB');
// a browser with no IndexedDB keeps using localStorage as before
const idb=global.indexedDB; global.indexedDB=undefined; delete store['stockpile_where']; ST.mem=null; ST.db=null; ST.blocked=false;
S=fresh(); P=defaultP(); await init(); S.tx.push({id:'L1',type:'in',amount:3,cat:'Sales',acct:'cash',date:today()}); save();
ok(!ST.mem && /"L1"/.test(store[KEY0]),'no IndexedDB: books stay in localStorage'); global.indexedDB=idb;
})().catch(e=>{console.log('CRASH',e);process.exitCode=1});
`;
const html=fs.readFileSync(process.argv[2]?path.resolve(process.argv[2]):path.join(__dirname,'..','beta','index.html'),'utf8');
const app=html.match(/<script>([\s\S]*)<\/script>/)[1];
eval(app+test);
