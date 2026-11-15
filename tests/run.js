// StockPile checks. Run with:  node tests/run.js [path/to/index.html]   (default: beta/index.html)
// Set BETA=1 to run them the way the test copy runs (separate storage names).
// Loads the app's code from index.html with a minimal fake browser and real cryptography,
// then exercises money, stock, selling, debts, encryption, backups, recovery and barcodes.
// Prints one line per check; exits with an error if any check fails.
const fs=require('fs');
const mk=()=>({hidden:true,value:'',style:{},classList:{toggle(){},add(){}},dataset:{},focus(){},click(){},remove(){},querySelector:()=>null,textContent:'',innerHTML:'',disabled:false});
const els={},ids={};
global.document={querySelector:s=>els[s]||(els[s]=mk()),querySelectorAll:()=>[],getElementById:s=>ids[s]||(ids[s]=mk()),addEventListener(){},createElement:()=>mk(),body:{appendChild(){},classList:{toggle(){},add(){},remove(){}}},hidden:false};
global.window={scrollTo(){}};global.location={protocol:'file:',pathname:process.env.BETA?'/StockPile-/beta/':'/'};
Object.defineProperty(global,'navigator',{value:{},configurable:true});
const store={};
for(const [k,f] of Object.entries({getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]}})) Object.defineProperty(store,k,{value:f,enumerable:false});
global.localStorage=store;
global.URL.createObjectURL=()=>'x';global.confirm=()=>true;global.alert=m=>{global.lastAlert=m};
const test=`
;(async()=>{
const ok=(c,m)=>{ if(!c){ console.log('FAIL: '+m); process.exitCode=1; } else console.log('ok   '+m); };
const allTabs=()=>{ for(const sn of [false,true]) for(const mv of ['list','break']){showNums=sn;moneyView=mv;for(const k in V){const h=V[k]();if(/undefined|NaN|\\[object/.test(h))throw new Error(k+' bad output');}} showNums=false; };
await ready; firstRun=false;
S.items.push({id:'a',name:'SecretWidget',cost:5,price:12,qty:3,low:5});
S.tx.push({id:'t1',type:'in',amount:105,cat:'Sales',cust:'Bob',acct:'bank',gst:5,date:today(),cogs:40});
save(); P.list[0].name='Hidden Biz';
P.list.push({id:'p2',name:'Second Biz'}); P.current='p2'; S=fresh(); S.tx.push({id:'z1',type:'out',amount:9,cat:'Gas',acct:'cash',date:today()}); save();
await switchProfile('default');
ok(/SecretWidget/.test(store[KEY0]) && S.items.length===1,'plain mode stores readable data');
await enableEnc('123456');
const all=()=>Object.keys(store).map(k=>store[k]).join('|');
ok(!/SecretWidget|Bob|Hidden Biz|Second Biz|Gas/.test(all()),'after PIN: nothing readable in storage (data + business names)');
ok(JSON.parse(store[PKEY]).sec && JSON.parse(store[keyFor('p2')]).enc===2,'header + other business encrypted');
S.tx.push({id:'t2',type:'out',amount:30,cat:'Tools',acct:'cash',date:today()}); save(); await saveQ;
await lockNow();
ok(DK===null && S.tx.length===0 && P.list.length===1 && els['#lock'].hidden===false,'lock wipes key and data from memory');
els['#pinIn'].value='000000'; await tryUnlock();
ok(els['#lock'].hidden===false && DK===null && /Wrong/.test(els['#pinMsg'].textContent),'wrong PIN rejected');
els['#pinIn'].value='123456'; await tryUnlock();
ok(els['#lock'].hidden===true && S.tx.length===2 && S.items[0].name==='SecretWidget' && P.list.length===2 && profName()==='Hidden Biz','right PIN restores everything');
allTabs(); ok(true,'all screens render while encrypted');
await switchProfile('p2'); ok(S.tx.length===1 && S.tx[0].cat==='Gas','switch business under encryption');
await switchProfile('default'); ok(S.tx.length===2,'switch back');
const bk=await backupText(); const bd=JSON.parse(bk);
ok(bd.stockpileBackup===3 && !/SecretWidget|Bob/.test(bk),'backup file is encrypted');
ok((await openBackup(bd)).items[0].name==='SecretWidget','backup opens on same phone without asking');
const plain=await backupText(true); ok(/SecretWidget/.test(plain),'unlocked safety copy is readable');
await changePin('123456','abcdef-long');
let threw=false; try{ await changePin('nope','x') }catch(e){threw=true}; ok(threw,'change PIN needs correct current PIN');
// simulate closing and reopening the app
await saveQ; SEC=null;DK=null;LEGACY=null;S=fresh();P=defaultP(); await init();
ok(els['#lock'].hidden===false && SEC && !DK && S.tx.length===0,'reopen: starts locked with nothing loaded');
els['#pinIn'].value='123456'; await tryUnlock(); ok(DK===null,'old PIN no longer works');
els['#pinIn'].value='abcdef-long'; await tryUnlock(); ok(S.tx.length===2,'new PIN works after reopen');
// old backup on a "different phone" (no key in memory)
const keep=DK, keepKR=KR; DK=null; KR=new Map(); let np=false; try{ await openBackup(bd) }catch(e){ np=e.message==='needpin' } ok(np,'backup elsewhere asks for PIN');
let wp=false; try{ await openBackup(bd,'wrong') }catch(e){wp=true} ok(wp,'backup rejects wrong PIN');
ok((await openBackup(bd,'123456')).tx.length===2,'backup opens with the PIN from when it was made'); DK=keep; KR=keepKR;
// corrupted data must not be overwritten
const good=store[KEY0]; const o=JSON.parse(good); o.ct=o.ct.slice(0,-8)+'AAAAAAA='; store[KEY0]=JSON.stringify(o);
await loadProfile(); ok(loadFailed && S.tx.length===0,'damaged data detected');
const before=store[KEY0]; S.tx.push({id:'q',type:'in',amount:1,date:today()}); save(); await saveQ; ok(store[KEY0]===before,'damaged data is not overwritten');
allTabs(); store[KEY0]=good; await loadProfile(); ok(!loadFailed && S.tx.length===2,'recovers when data is intact');
// restore an encrypted backup into current business
S=fresh(); await restoreText(bk); await saveQ; ok(S.items.length===1 && /restored/.test(lastAlert),'restore from locked backup');
await removeEnc('abcdef-long');
ok(!JSON.parse(store[PKEY]).sec && /SecretWidget/.test(store[KEY0]) && /Gas/.test(store[keyFor('p2')]) && !SEC,'remove PIN: everything readable again');
// legacy PIN upgrade
store[PKEY]=JSON.stringify({list:P.list,current:P.current,pin:hashPin('1111')}); SEC=null;DK=null;LEGACY=null;S=fresh();P=defaultP(); await init();
ok(LEGACY && els['#lock'].hidden===false,'old-style PIN recognised');
els['#pinIn'].value='1111'; await tryUnlock(); await saveQ;
ok(SEC && DK && !LEGACY && !/SecretWidget/.test(all()) && S.items.length===1,'old-style PIN upgraded to encryption on unlock');
// forgot PIN wipe
eraseAll();
ok(Object.keys(store).filter(k=>k!==DKEY&&k!==MKEY).length===0 && !SEC && S.tx.length===0,'forgot PIN erases everything');

// recovery key
store[PKEY]&&0; await saveQ; saveGen++; KR=new Map(); KEYS={}; staff=null; staffMode=false; SEC=null;DK=null;LEGACY=null;S=fresh();P=defaultP();Object.keys(store).forEach(k=>delete store[k]);
S.items.push({id:'a',name:'SecretWidget',cost:5,price:12,qty:3,low:5}); save();
await enableEnc('pin-one'); await makeRecovery(); const code=lastRec;
ok(/^([0-9A-HJKMNP-TV-Z]{4}-){7}[0-9A-HJKMNP-TV-Z]{4}$/.test(code) && SEC.rec && !all().includes(code.replace(/-/g,'')),'recovery key created, not stored in readable form');
const bk2=JSON.parse(await backupText());
await lockNow();
let bad=false; try{ await recoverWithKey('AAAA-BBBB-CCCC-DDDD-EEEE-FFFF-GGGG-HHHH','newpin1') }catch(e){bad=true}
ok(bad && DK===null && els['#lock'].hidden===false,'wrong recovery key rejected');
await recoverWithKey(code.toLowerCase().replace(/-/g,' '),'newpin1');
ok(DK && S.items[0].name==='SecretWidget' && els['#lock'].hidden===true,'recovery key (typed loosely) unlocks and sets a new PIN');
await lockNow(); els['#pinIn'].value='pin-one'; await tryUnlock(); ok(DK===null,'forgotten old PIN is dead after recovery');
els['#pinIn'].value='newpin1'; await tryUnlock(); ok(S.items.length===1,'new PIN works');
const k2=DK, k2R=KR; DK=null; KR=new Map(); ok((await openBackup(bk2,code)).items.length===1,'recovery key also opens a locked backup'); DK=k2; KR=k2R;
await lockNow(); await recoverWithKey(code,'newpin2'); ok(S.items.length===1,'recovery key still valid for next time');
allTabs(); ok(/Recovery key: set/.test(V.more()),'settings show recovery key status');

// security questions
await saveQuestions(['Pet?','Street?','Truck?'],['Mr. Biscuit','  224th STREET ','f-150']);
ok(SEC.qa && SEC.qa.q.length===3 && !/biscuit|224th|f-150/i.test(all()),'questions saved; answers not stored readable');
ok(!JSON.parse(await backupText()).qa,'backup files do not carry the security questions');
await lockNow();
let qb=false; try{ await recoverWithAnswers(['mr biscuit','224th street','f250'],'qpin-1') }catch(e){qb=true}
ok(qb && DK===null,'one wrong answer out of three is rejected');
await recoverWithAnswers(['mr biscuit','224TH street','F 150'],'qpin-1');
ok(DK && S.items.length===1 && els['#lock'].hidden===true,'three right answers (any capitals/punctuation) reset the PIN');
await lockNow(); els['#pinIn'].value='qpin-1'; await tryUnlock(); ok(S.items.length===1 && SEC.rec && SEC.qa,'new PIN works; recovery key and questions kept');
await changePin('qpin-1','qpin-2'); await lockNow(); await recoverWithKey(code,'qpin-3'); ok(S.items.length===1,'recovery key still works after PIN changes');
allTabs(); ok(/Security questions: set/.test(V.more()),'settings show question status');

// sell screen / item numbers
S=clean({tx:[],debts:[],items:[{id:'a',name:'Widget',cost:5,price:12,qty:10},{id:'b',name:'Gadget',cost:2,price:4.5,qty:1,num:7},{id:'c',name:'Dup',cost:1,price:2,qty:5,num:7}]});
ok(S.items.map(i=>i.num).join()==='1,7,2','old products get item numbers; duplicates fixed');
ok(nextNum()===8,'next item number follows the highest');
$('#posNum').value='7'; posPreview(); ok(/Gadget/.test($('#posPrev').textContent),'typing an item number previews the product');
$('#posNum').value='99'; $('#posQty').value='1'; posAdd(); ok(cart.length===0 && /No item/.test($('#posPrev').textContent),'unknown item number is refused');
$('#posNum').value='1'; $('#posQty').value='3'; posAdd();
$('#posNum').value='7'; $('#posQty').value='2'; posAdd(); posAdd('a',1);
ok(cart.length===2 && cart[0].qty===4 && cart[1].qty===2,'cart collects items by number and by tap');
showNums=true; tab='sell'; ok(/Complete sale/.test(V.sell()) && /only 1 in stock/.test(V.sell()),'sell screen shows cart and low-stock warning'); allTabs();
posCust=' Bob '; posAcct='bank'; posDone();
ok(cart.length===0 && S.tx.length===2 && S.items[0].qty===6 && S.items[1].qty===-1,'completing a sale records each line and lowers stock');
ok(S.tx[0].amount===48 && S.tx[1].amount===9 && S.tx[0].cogs===20 && S.tx[0].cust==='Bob' && S.tx[0].acct==='bank' && S.tx[0].sale===S.tx[1].sale && /57\.00/.test(posMsg),'sale amounts, cost, customer and account are right');
ok(acctBal('bank')===57 && acctBal('cash')===0,'money lands in the chosen account');
delTx(S.tx[1].id); ok(S.tx.length===1 && S.items[1].qty===1,'deleting a sale can put the items back in stock');
const rt=clean(JSON.parse(JSON.stringify(S))); ok(rt.tx[0].qty===4 && rt.tx[0].sale && rt.items[1].num===7,'sale details survive save and reload');
allTabs(); tab='home';

// part payment / pay later
S=clean({tx:[],debts:[],items:[{id:'a',name:'Widget',cost:5,price:10,qty:20,num:1},{id:'b',name:'Gadget',cost:2,price:5,qty:20,num:2}]});
cart=[{id:'a',qty:4,price:10},{id:'b',qty:2,price:5}]; posPay='later'; posCust=''; posDone();
ok(S.tx.length===0 && cart.length===2 && /customer name/i.test(lastAlert),'pay later needs a customer name');
posCust='Dana'; posDone();
ok(S.tx.length===2 && S.tx.every(t=>t.amount===0) && S.tx[0].saleAmt===40 && S.tx[1].saleAmt===10 && S.items[0].qty===16 && S.items[1].qty===18,'pay later: stock drops, no money in yet');
ok(S.debts.length===1 && S.debts[0].dir==='owed' && S.debts[0].name==='Dana' && S.debts[0].amount===50 && /4 × Widget, 2 × Gadget/.test(S.debts[0].note) && S.debts[0].sale===S.tx[0].sale,'pay later: full amount goes to Debts owed to me');
ok(acctBal('cash')===0 && acctBal('bank')===0 && /owing was added to the Owing tab under Dana/.test(posMsg),'pay later: balances unchanged');
cart=[{id:'a',qty:3,price:10},{id:'b',qty:1,price:5}]; posPay='part'; posPaid=''; posCust='Eli'; posDone();
ok(S.tx.length===2 && /how much was paid/i.test(lastAlert),'part payment needs an amount');
posPaid='20'; posAcct='bank'; posDone();
const pt=S.tx.slice(2);
ok(pt.length===2 && round(pt[0].amount+pt[1].amount)===20 && pt[0].saleAmt===30 && pt[1].saleAmt===5 && acctBal('bank')===20,'part payment: only the money received counts as Money In');
ok(S.debts.length===2 && S.debts[1].amount===15 && S.debts[1].name==='Eli','part payment: the rest goes to Debts');
showNums=true; const hp=V.home(); ok(/44\.00/.test(hp),'profit on sales counts the full sale value (85 sold − 41 cost)');
// customer pays the debt off later
const dd=S.debts[1]; dd.payments.push({amount:15,date:today()}); S.tx.push({id:'pay1',type:'in',amount:15,cat:'Debt repaid to me',note:'From Eli',acct:'cash',date:today()});
ok(bal(dd)===0 && acctBal('cash')+acctBal('bank')===35 && /44\.00/.test(V.home()),'paying the debt later adds cash without double counting profit');
cart=[{id:'a',qty:1,price:10}]; posPay='part'; posPaid='500'; posCust=''; posDone();
ok(S.debts.length===2 && S.tx[S.tx.length-1].amount===10 && S.tx[S.tx.length-1].saleAmt===undefined,'part payment covering the whole sale is treated as paid in full');
const rr=recordSale([{it:S.items[0],qty:2,price:10}],{cust:'Flo',pay:'later'}); ok(rr.owing===20 && S.debts.length===3,'Stock-tab Sold form can pay later too');
const dcount=S.debts.length; delTx(S.tx[S.tx.length-1].id); ok(S.debts.length===dcount-1 && S.items[0].qty===12,'deleting a pay-later sale can restock and remove its debt');
const rc=clean(JSON.parse(JSON.stringify(S))); ok(rc.tx[0].saleAmt===40 && rc.debts[0].sale===rc.tx[0].sale,'pay-later details survive save and reload');
cart=[{id:'a',qty:1,price:10}]; posPay='part'; posPaid='4'; posCust='Gus'; tab='sell'; ok(/6\.00 will be added to Owing/.test(V.sell()),'sell screen shows the amount that will be owing'); allTabs(); cart=[]; posPay='full'; tab='home';

// ---- version 7 features ----
ok(/^\\d+\\.\\d+\\.\\d+$/.test(VERSION) && V.more().includes('version '+VERSION),'version number shows under More');
// barcodes
ok(eanCheck('400638133393')===1 && itemEAN(12)==='2000000000121'.slice(0,12)+eanCheck('200000000012') && itemEAN(12).length===13,'barcode check digit is right');
ok(eanBits(itemEAN(12)).length===95 && /^<svg/.test(eanSVG(itemEAN(12))),'barcode drawing has the right number of bars');
S=clean({tx:[],debts:[],items:[{id:'a',name:'Widget',cost:5,price:10,qty:20,num:1},{id:'b',name:'Gadget',cost:2,price:5,qty:20,num:12,code:'0064200116473'},{id:'c',name:'Thing',cost:1,price:3,qty:5,num:3,code:'<script>'}]});
ok(S.items[1].code==='064200116473' && S.items[2].code==='script','product barcodes are cleaned on load');
ok(itemByCode(itemEAN(12)).id==='b' && itemByCode(itemEAN(1)).id==='a' && itemByCode('064200116473').id==='b' && itemByCode('0064200116473').id==='b','scanning finds products by label or by their own barcode');
ok(!itemByCode('2000000000129') && !itemByCode(itemEAN(99)) && !itemByCode('') ,'wrong or unknown barcodes find nothing');
// scanner flow (camera itself can only be tried on a phone)
cart=[]; scan={stream:{getTracks:()=>[]},mode:'sell',last:'',lastAt:0,pending:null,timer:0};
onScan('9999999999999'); ok(!scan.pending && /No product/.test($('#scanMsg').textContent),'scanner reports an unknown barcode');
onScan(itemEAN(12)); ok(scan.pending==='b' && /Gadget/.test($('#scanAsk').innerHTML),'scan shows the product and asks how many');
onScan(itemEAN(1)); ok(scan.pending==='b','scanner waits for the quantity before reading the next barcode');
$('#scanQty').value='3'; scanAdd(); ok(!scan.pending && cart.length===1 && cart[0].qty===3 && /Added 3 × Gadget/.test($('#scanMsg').textContent),'entering a quantity adds to the cart and resumes scanning');
scan.lastAt=0; onScan(itemEAN(1)); $('#scanQty').value='2'; scanAdd(); scan.lastAt=0; onScan(itemEAN(12)); $('#scanQty').value=''; scanAdd();
ok(cart.length===2 && cart[0].qty===4 && cart[1].qty===2 && /6 items, \\$40\\.00/.test($('#scanMsg').textContent),'scan, quantity, scan next builds the sale');
closeForm(); ok(scan===null,'closing the scanner turns the camera off');
scan={stream:{getTracks:()=>[]},mode:'assign',target:'a',last:'',lastAt:0,pending:null,timer:0}; onScan('064200116473'); ok(!S.items[0].code && /already belongs to Gadget/.test($('#scanMsg').textContent),'a barcode cannot be given to two products');
onScan('0628915012347'); ok(S.items[0].code==='628915012347' && scan===null && itemByCode('628915012347').id==='a','scanning a product’s own barcode saves it');
// receipts, due dates, customers, void
posPay='part'; posPaid='20'; posCust='Dana'; posDue=addDays(-3); posAcct='cash'; posDone();
const sid=lastSale, ri=saleInfo(sid);
ok(ri && ri.total===40 && ri.paid===20 && ri.owing===20 && ri.lines.length===2 && ri.lines[0].qty===4 && ri.lines[0].each===5 && /^R-\\d{8}-/.test(ri.no),'receipt totals and lines are right');
ok(/Dana/.test(receiptBody(ri)) && /Still owing/.test(receiptBody(ri)) && /4 × Gadget @ \\$5\\.00 = \\$20\\.00/.test(receiptText(ri)) && /Still owing: \\$20\\.00/.test(receiptText(ri)),'receipt shows customer, items and what is owing');
ok(S.debts[0].due===posDue||S.debts[0].due===addDays(-3),'due date is saved on the amount owing');
ok(overdue(S.debts[0]) && (showNums=true,/Overdue/.test(V.home())) && /Overdue since/.test(V.debts()),'overdue debts are flagged on Home and Debts');
S.debts[0].payments.push({amount:20,date:today()}); ok(!overdue(S.debts[0]) && saleInfo(sid).owing===0 && /Paid in full/.test(receiptText(saleInfo(sid))),'paying it off clears the overdue flag and updates the receipt');
S.debts[0].payments.pop();
custCache=customerList(); ok(custCache.length===1 && custCache[0].name==='Dana' && custCache[0].sales===40 && custCache[0].owing===20 && custCache[0].count===1,'customer page totals are right');
ok(/Total bought: \\$40\\.00/.test(statementText(custCache[0])) && /Still owing: \\$20\\.00/.test(statementText(custCache[0])),'customer statement text is right');
customersSheet(); customerSheet(0); receipt(sid); barcodeSheet('a'); ok(!/undefined|NaN|\\[object/.test($('#modal').innerHTML),'customer, receipt and barcode pop-ups render');
moneyView='break'; moneyFilter='all'; const br=V.money(); ok(/Best sellers/.test(br) && /4 sold/.test(br) && /Profit by product/.test(br),'sales report shows best sellers and profit by product');
const q0=S.items.map(i=>i.qty).join(); voidSale(sid);
ok(S.tx.length===0 && S.debts.length===0 && S.items[1].qty===20 && S.items[0].qty===20 && !saleInfo(sid),'voiding a sale restocks everything and removes the sale and its debt');
// off-phone backup reminder
S.items.push({id:'x1',name:'A',num:50,qty:1,cost:1,price:1},{id:'x2',name:'B',num:51,qty:1,cost:1,price:1}); showNums=false;
ok(/No backup has left this phone/.test(V.home()),'reminder appears when no backup has left the phone');
S.offRemind=false; ok(!/left this phone/.test(V.home()),'reminder can be switched off'); S.offRemind=true;
S.lastSent=addDays(-20); ok(/20 days since a backup left/.test(V.home()),'reminder counts days since the last send');
S.offSnooze=addDays(7); ok(!/left this phone/.test(V.home()),'"Not now" hides the reminder for a week'); S.offSnooze=null;
S.lastSent=today(); ok(!/left this phone/.test(V.home()),'no reminder right after sending a backup');
const rv=clean(JSON.parse(JSON.stringify(S))); ok(rv.lastSent===today() && rv.offRemind===true && rv.items[0].code==='628915012347','new settings survive save and reload');
allTabs(); tab='home'; moneyView='list'; moneyFilter='month';

// version 8: delete and close from inside pop-up forms
S=clean({tx:[{id:'e1',type:'out',amount:5,cat:'Gas',date:today()}],debts:[{id:'d1',name:'Joe',dir:'owe',amount:10,date:today()}],items:[{id:'i1',name:'W',num:1,qty:1,cost:1,price:2}]});
addTx('out'); ok(!/id="fDel"/.test($('#modal').innerHTML) && /id="fX"/.test($('#modal').innerHTML),'new-entry form has a close button and no Delete');
editTx('e1'); ok(/id="fDel"/.test($('#modal').innerHTML),'editing an entry offers Delete'); $('#fDel').onclick(); ok(S.tx.length===0,'Delete inside the form removes the entry');
editItem('i1'); ok(/id="fDel"/.test($('#modal').innerHTML),'editing a product offers Delete'); $('#fDel').onclick(); ok(S.items.length===0,'Delete inside the form removes the product');
editDebt('d1'); $('#fDel').onclick(); ok(S.debts.length===0,'Delete inside the form removes the debt');

// version 9: clear a whole form; select several entries and delete together
addTx('in'); ok(/id="fClear"/.test($('#modal').innerHTML) && typeof $('#fClear').onclick==='function','forms have a Clear all button'); closeForm();
S=clean({tx:[],debts:[],items:[{id:'a',name:'Widget',cost:5,price:10,qty:20,num:1}]});
recordSale([{it:S.items[0],qty:2,price:10}],{cust:'Hal',pay:'later'}); recordSale([{it:S.items[0],qty:3,price:10}],{pay:'full'});
S.tx.push({id:'g1',type:'out',amount:7,cat:'Gas',acct:'cash',date:today()},{id:'g2',type:'out',amount:9,cat:'Food',acct:'cash',date:today()});
tab='money'; moneyView='list'; moneyFilter='all'; selToggleMode(); let mv2=V.money();
ok(selMode && /class="pk"/.test(mv2) && /0 selected/.test(mv2),'Select mode shows tick boxes on entries');
togSel('g1'); togSel(S.tx[0].id); ok(sel.size===2 && /2 selected/.test(V.money()),'tapping entries ticks them');
selAll(); ok(sel.size===4,'Tick all selects everything shown'); selAll(); ok(sel.size===0,'Untick all clears the ticks');
togSel('g1'); togSel(S.tx[0].id); togSel(S.tx[1].id); delSelected();
ok(S.tx.length===1 && S.tx[0].id==='g2' && S.items[0].qty===20 && S.debts.length===0 && !selMode,'Delete selected removes them together, restocks sales and clears their debt');
ok(!/class="pk"/.test(V.money()),'tick boxes go away afterwards'); allTabs(); tab='home'; moneyFilter='month';

// version 10.1: customer contacts, reminders and promotions sent from the phone's own apps
showNums=false; ok(V.home().includes('StockPile version '+VERSION),'version shows at the bottom of Home (welcome view)'); showNums=true; ok(V.home().includes('StockPile version '+VERSION),'version shows at the bottom of Home (summary view)');
S=clean({tx:[],debts:[{id:'d9',name:'Dana',dir:'owed',amount:50,date:today(),due:'2026-12-01'}],items:[],contacts:[{name:' Dana ',phone:'(604) 555-0123',email:'dana@example.com',promo:1},{name:'Eli',phone:'<b>',email:'not-an-email',promo:0},{name:'',phone:'1'}]});
ok(S.contacts.length===2 && S.contacts[0].key==='dana' && S.contacts[0].phone==='6045550123' && S.contacts[1].phone==='' && S.contacts[1].email==='','contacts are cleaned on load');
ok(contactOf('DANA ').email==='dana@example.com' && customerList().some(c=>c.name==='Eli'),'contacts are found by name and listed as customers');
const rt2=reminderText('Dana',50,'2026-12-01'); ok(/Hi Dana, just a friendly reminder from My business that \\$50\\.00 was due on Dec 1, 2026\\./.test(rt2) && /that \\$50\\.00 is still owing\\./.test(reminderText('Dana',50,'')),'reminder wording is right');
ok(smsLink('6045550123','Hi & bye')==='sms:6045550123?body=Hi%20%26%20bye' && mailLink('a@b.co','Sub ject','Bo dy')==='mailto:a@b.co?subject=Sub%20ject&body=Bo%20dy' && mailLink('','S','B',['x@y.z','q@r.s']).endsWith('&bcc=x@y.z,q@r.s'),'text and email links are built correctly');
location.href=''; remind('d9'); ok(/Send to Dana/.test($('#modal').innerHTML) && /💬 Text/.test($('#modal').innerHTML) && /✉️ Email/.test($('#modal').innerHTML),'Remind shows the message with Text and Email choices');
sendNow('sms'); ok(location.href.startsWith('sms:6045550123?body=Hi%20Dana'),'Text opens the phone’s texting app with the reminder filled in');
remind('d9'); sendNow('mail'); ok(location.href.startsWith('mailto:dana@example.com?subject=Reminder%20from%20My%20business'),'Email opens the email app with the reminder filled in');
ok(promoText(' 10% off ')==='10% off - My business. Reply STOP to opt out.','promotions name the business and include an opt-out');
promoSheet(); ok(/Dana/.test($('#modal').innerHTML) && !/>Eli</.test($('#modal').innerHTML),'promotion list only shows customers who agreed');
$('#promoMsg').value='Sale today'; promoSend(custCache.findIndex(c=>c.name==='Dana'),'sms'); ok(decodeURIComponent(location.href).endsWith('Sale today - My business. Reply STOP to opt out.'),'promotion text is sent with the opt-out line');
location.href=''; promoSend(custCache.findIndex(c=>c.name==='Eli'),'sms'); ok(location.href==='','customers who have not agreed cannot be sent a promotion');
customersSheet(); customerSheet(custCache.findIndex(c=>c.name==='Dana')); ok(/6045550123/.test($('#modal').innerHTML) && /Send reminder/.test($('#modal').innerHTML) && !/undefined|NaN/.test($('#modal').innerHTML),'customer page shows contact details and a reminder button');
ok(/🔔 Remind/.test(V.debts()),'Owing tab has a Remind button on money owed to me'); closeForm(); allTabs(); tab='home';

// version 10.2: choose the wording of a reminder
ok(REMIND.length===4 && REMIND.every(r=>!/undefined|NaN|\\[object/.test(r[2]('Dana','$5.00','Dec 1, 2026','Biz')) && !/undefined|NaN/.test(r[2]('Dana','$5.00','','Biz'))),'all four reminder messages fill in cleanly, with or without a due date');
ok(/final reminder from My business that \\$50\\.00 has been outstanding since Dec 1, 2026/.test(reminderText('Dana',50,'2026-12-01','final')) && /split it into smaller payments/.test(reminderText('Dana',50,'','plan')),'final notice and payment plan wording is right');
ok(remindDefault(addDays(-20))==='firm' && remindDefault(addDays(-3))==='friendly' && remindDefault('')==='friendly','long-overdue debts default to the firm message');
remind('d9'); ok(/id="tplSel"/.test($('#modal').innerHTML) && /Final notice/.test($('#modal').innerHTML),'Remind lets you pick which message to send');
tplPick('final'); ok(/final reminder/.test($('#tplPrev').textContent) && /final reminder/.test(pendMsg.body),'picking a message updates the preview');
sendNow('sms'); ok(decodeURIComponent(location.href).includes('this is a final reminder from My business'),'the picked message is what gets sent');
ok(thanksText('Dana',20,30)==='Hi Dana, got your payment of $20.00. Thank you! Your balance with My business is now $30.00.' && /all paid up/.test(thanksText('Dana',20,0)),'thank-you wording is right');
S.debts[0].payments.push({amount:20,date:today()}); thankFor('Dana',20); ok(/got your payment of \\$20\\.00/.test($('#modal').innerHTML) && /now \\$30\\.00/.test($('#modal').innerHTML) && !/id="tplSel"/.test($('#modal').innerHTML),'thank-you message shows the new balance'); closeForm(); allTabs(); tab='home';

// ================= version 11 =================
const F=(k,v)=>{document.getElementById('f_'+k).value=String(v)}, FC=(k,b)=>{document.getElementById('f_'+k).checked=b}, SAVE=()=>$('#fSave').onclick(), tick=ms=>new Promise(r=>setTimeout(r,ms));
ok(BETA===!!process.env.BETA && KEY0.startsWith('beta_')===BETA && PKEY.startsWith('beta_')===BETA,'the test copy keeps its data under separate names');
await saveQ; saveGen++; KR=new Map(); KEYS={}; staff=null; staffMode=false; SEC=null;DK=null;LEGACY=null;S=fresh();P=defaultP();Object.keys(store).forEach(k=>delete store[k]);
const mk11=()=>clean({tx:[],debts:[],items:[{id:'a',name:'Widget',cost:5,price:10,qty:20,num:1},{id:'b',name:'Gadget',cost:2,price:5,qty:20,num:2}]});
// discounts
S=mk11(); cart=[{id:'a',qty:2,price:10},{id:'b',qty:1,price:5}]; posDisc='10%'; let ct=cartTotals();
ok(ct.T0===25 && ct.disc===2.5 && ct.T===22.5,'percent discount is worked out on the whole sale');
posDisc='5'; ok(cartTotals().disc===5 && cartTotals().T===20,'dollar discount works'); posDisc='999'; ok(cartTotals().T===0,'a discount can never exceed the sale'); posDisc='abc'; ok(cartTotals().disc===0,'nonsense in the discount box is ignored');
posDisc='10%'; posPay='full'; posCust=''; posAcct='cash'; posDone(); let s11=lastSale, r11=saleInfo(s11);
ok(round(sum(S.tx,t=>t.amount))===22.5 && round(sum(S.tx,t=>t.disc))===2.5 && acctBal('cash')===22.5 && posDisc==='','discounted sale records the reduced amount');
ok(r11.total===22.5 && r11.disc===2.5 && r11.paid===22.5 && r11.lines[0].amount===20 && /Discount/.test(receiptBody(r11)) && /Discount: -\\$2\\.50/.test(receiptText(r11)) && /Subtotal/.test(receiptBody(r11)),'receipt shows subtotal, discount and total');
S=mk11(); cart=[{id:'a',qty:2,price:10},{id:'b',qty:1,price:5}]; posDisc='10%'; posPay='part'; posPaid='10'; posCust='Ida'; posDone();
ok(S.debts[0].amount===12.5 && round(sum(S.tx,t=>t.amount))===10 && round(sum(S.tx,t=>t.saleAmt))===22.5,'discount and part payment work together');
// returns
S=mk11(); recordSale([{it:S.items[0],qty:4,price:10}],{pay:'full',acct:'cash',cust:'Jo'}); s11=S.tx[0].sale;
returnForm(s11); F('q0',1); FC('back',true); F('acct','cash'); SAVE();
let rf=S.tx[1]; ok(rf && rf.type==='out' && rf.amount===10 && rf.saleAmt===-10 && rf.cogs===-5 && rf.qty===1 && rf.ret===s11 && S.items[0].qty===17 && acctBal('cash')===30,'returning one item refunds it and puts it back in stock');
ok(saleInfo(s11).returned===10 && saleInfo(s11).paid===30 && /Returned/.test(receiptBody(saleInfo(s11))),'receipt shows the return');
showNums=true; ok(/\\$15\\.00/.test(V.home()),'profit drops by the returned item (3 kept × $5 profit)');
returnForm(s11); F('q0',99); FC('back',false); SAVE(); ok(S.tx.length===3 && S.tx[2].qty===3 && S.items[0].qty===17 && saleInfo(s11).returned===40,'cannot return more than was sold; damaged returns stay out of stock');
lastAlert=''; returnForm(s11); ok(/already been returned/.test(lastAlert),'nothing left to return is reported');
delTx(rf.id); ok(S.items[0].qty===16 && saleInfo(s11).returned===30,'deleting a return takes the item back out of stock');
S=mk11(); recordSale([{it:S.items[0],qty:4,price:10}],{pay:'part',paid:10,acct:'cash',cust:'Kim'}); s11=S.tx[0].sale;
returnForm(s11); F('q0',1); FC('back',true); F('acct','cash'); SAVE();
ok(S.debts[0].amount===20 && S.tx[1].amount===0 && S.tx[1].owedCut===10 && acctBal('cash')===10,'a return comes off what the customer owes before any cash is refunded');
returnForm(s11); F('q0',3); FC('back',true); F('acct','cash'); SAVE(); ok(bal(S.debts[0])===0 && round(sum(S.tx.filter(t=>t.ret),t=>t.amount))===10 && acctBal('cash')===0,'returning everything clears the debt and refunds what was paid');
S=mk11(); recordSale([{it:S.items[0],qty:4,price:10}],{pay:'full',acct:'cash'}); s11=S.tx[0].sale; returnForm(s11); F('q0',1); FC('back',true); SAVE(); voidSale(s11);
ok(S.tx.length===0 && S.items[0].qty===20,'voiding a sale with a return restocks only what was still out');
const rcl=clean(JSON.parse(JSON.stringify(Object.assign(mk11(),{tx:[{id:'q1',type:'out',amount:5,saleAmt:-5,cogs:-2,gst:-0.2,ret:'s1',line:'l1',back:true,owedCut:1,qty:1,itemId:'a',date:today()}]})))); ok(rcl.tx[0].saleAmt===-5 && rcl.tx[0].ret==='s1' && rcl.tx[0].back===true && rcl.tx[0].owedCut===1 && rcl.tx[0].gst===-0.2,'return details survive save and reload');
// buying stock on credit
S=mk11(); restock('a'); F('qty',10); F('cost',4); F('pay','later'); F('sup',''); F('due',''); F('date',today()); F('acct','cash'); lastAlert=''; SAVE();
ok(/supplier name/.test(lastAlert) && S.items[0].qty===20 && S.debts.length===0,'pay-later restock needs a supplier');
F('sup','Acme'); F('due','2027-01-15'); SAVE(); ok(S.items[0].qty===30 && S.items[0].cost===4 && S.tx.length===0 && S.debts.length===1 && S.debts[0].dir==='owe' && S.debts[0].name==='Acme' && S.debts[0].amount===40 && S.debts[0].due==='2027-01-15','restocking on credit adds stock and an amount I owe the supplier');
restock('b'); F('qty',5); F('cost',2); F('pay','now'); F('acct','bank'); F('sup',''); SAVE(); ok(S.tx.length===1 && S.tx[0].amount===10 && S.tx[0].acct==='bank' && S.debts.length===1,'paying for stock now records Money Out');
restock('b'); F('qty',1); F('cost',2); F('pay','none'); SAVE(); ok(S.tx.length===1 && S.items[1].qty===26,'restock without recording money');
// stock adjustments
adjustForm('a'); F('dir','out'); F('qty',2); F('why','Damaged'); F('note','dropped'); SAVE();
ok(S.items[0].qty===28 && S.adj.length===1 && S.adj[0].qty===-2 && S.adj[0].value===8 && S.adj[0].why==='Damaged' && S.tx.length===1,'stock adjustment changes the count, not the money');
adjustForm('a'); F('dir','in'); F('qty',1); F('why','Counted wrong'); F('note',''); SAVE(); ok(S.items[0].qty===29 && S.adj[1].qty===1 && /Recent stock adjustments/.test(V.stock()),'stock can be adjusted up and the log shows on the Stock tab');
moneyView='break'; moneyFilter='all'; ok(/Stock written off/.test(V.money()) && /Damaged/.test(V.money()),'write-offs show in the breakdown'); moneyView='list'; moneyFilter='month';
ok(clean(JSON.parse(JSON.stringify(S))).adj.length===2,'adjustments survive save and reload');
// recurring expenses
S=mk11(); const d2=new Date(thisMonth()+'-15T12:00'); d2.setMonth(d2.getMonth()-2); const two=d2.toLocaleDateString('en-CA').slice(0,7);
S.rec=[{id:'r1',name:'Rent',amount:100,cat:'Rent',acct:'bank',day:1,last:two}];
ok(applyRecurring()===true && S.tx.length===2 && S.tx.every(t=>t.type==='out'&&t.amount===100&&t.acct==='bank'&&t.date.endsWith('-01')) && S.rec[0].last===thisMonth(),'missed months of a recurring bill are filled in');
ok(applyRecurring()===false && S.tx.length===2,'recurring bills are never added twice');
recurForm(); F('name','Phone'); F('amount',50); F('cat','Phone'); F('acct','cash'); F('day',28); FC('now',false); SAVE();
ok(S.rec.length===2 && S.rec[1].day===28 && S.tx.length===2,'a new recurring bill waits for its day');
recurForm(); F('name','Web'); F('amount',9); F('cat','Web'); F('acct','cash'); F('day',1); FC('now',true); SAVE(); ok(S.tx.length===3 && S.tx[2].note==='Web','“add this month too” records it straight away');
ok(/Recurring bills &amp; paydays|Recurring bills & paydays/.test(V.more()) && /Rent/.test(V.more()) && clean(JSON.parse(JSON.stringify(S))).rec.length===3,'recurring bills list under More and survive reload');
{ const n0=S.tx.length, past=dayShift(today(),-28);
  recurForm(null,{type:'in',freq:'biweekly'}); F('name','Paycheque'); F('amount',1500); F('cat','Pay'); F('next',past); SAVE();
  const pay=S.rec.find(r=>r.name==='Paycheque'); ok(pay.type==='in' && pay.freq==='biweekly' && S.tx.length===n0+3 && S.tx.slice(-3).every(t=>t.type==='in'&&t.amount===1500) && pay.next===dayShift(today(),14),'a bi-weekly payday from 4 weeks ago adds 3 paycheques and points to the next one');
  ok(applyRecurring()===false,'paydays are never added twice');
  ok(recDates({freq:'weekly',next:'2026-11-06',day:1},'2026-11-01','2026-11-30').join()==='2026-11-06,2026-11-13,2026-11-20,2026-11-27' && recDates({freq:'biweekly',next:'2026-11-20',day:1},'2026-11-01','2026-11-30').join()==='2026-11-06,2026-11-20','weekly and every-2-weeks dates are worked out');
  ok(recDates({freq:'semimonthly',day:15,d2:31},'2026-02-01','2026-02-28').join()==='2026-02-15,2026-02-28' && semiAfter({day:15,d2:31},'2026-11-15')==='2026-11-30' && semiAfter({day:15,d2:31},'2026-11-30')==='2026-12-15' && recDates({day:31},'2026-11-01','2026-11-30').join()==='2026-11-30','twice a month uses the 15th and the last day; 31 means the last day');
  const n1=S.tx.length; recurForm(null,{type:'in',freq:'semimonthly'}); F('name','Wages'); F('amount',1000); F('day',1); F('d2',15); FC('now',true); SAVE();
  const w=S.rec.find(r=>r.name==='Wages'); ok(w.freq==='semimonthly' && w.d2===15 && S.tx.length>n1 && S.tx.slice(n1).every(t=>t.type==='in') && w.next>today(),'twice-a-month pay with “add the latest one” records it and waits for the next');
  const C=clean(JSON.parse(JSON.stringify(S))).rec; ok(C.find(r=>r.name==='Paycheque').freq==='biweekly' && C.find(r=>r.name==='Wages').d2===15 && C.find(r=>r.name==='Rent').freq===undefined,'paydays and their schedule survive reload');
  ok(/Every 2 weeks · next/.test(V.more()) && /Add payday/.test(V.more()),'paydays show under More with how often and when next'); }
// year summary
S=mk11(); const Y=today().slice(0,4);
recordSale([{it:S.items[0],qty:2,price:10}],{pay:'full',acct:'cash'}); S.tx.push({id:'o1',type:'out',amount:7,cat:'Gas',acct:'cash',gst:0,date:today()},{id:'i2',type:'in',amount:30,cat:'Job payment',acct:'bank',gst:0,date:today()},{id:'old',type:'in',amount:999,cat:'Sales',acct:'cash',gst:0,date:'2001-05-05'});
S.adj=[{id:'j1',date:today(),itemId:'a',name:'Widget',qty:-1,why:'Damaged',note:'',value:5}];
const ys=yearSummary(Y); ok(ys.moneyIn===50 && ys.moneyOut===7 && ys.salesValue===20 && ys.cogs===10 && ys.gross===10 && ys.writeOff===5 && ys.inBy.length===2,'year summary adds up, and leaves other years out');
ok(csv(yearRows(ys)).includes('Profit on sales,10') && csv(yearRows(yearSummary('2001'))).includes('Money in (received),999'),'year summary download has the figures');
yearSheet(); ok(/Year summary/.test($('#modal').innerHTML) && /2001/.test($('#modal').innerHTML) && !/undefined|NaN/.test($('#modal').innerHTML),'year summary opens with a choice of years'); closeForm();
// search
tab='money'; moneyFilter='all'; moneyView='list'; V.money(); ledgerQ='gas'; ok(ledgerShown().length===1 && ledgerShown()[0].id==='o1','Ledger search finds entries by category');
ledgerQ='999'; ok(ledgerShown().length===1 && ledgerShown()[0].id==='old','Ledger search finds entries by amount'); ledgerQ='zzz'; ok(/Nothing matches/.test(ledgerBodyHTML()),'Ledger search says when nothing matches'); ledgerQ='';
stockQ='gad'; ok(stockShown().length===1 && stockShown()[0].id==='b','Stock search finds products by name'); stockQ='#1'; ok(stockShown().length===1 && stockShown()[0].id==='a','Stock search finds products by item number'); stockQ='';
S.contacts=[{key:'zed',name:'Zed',phone:'',email:'',promo:false},{key:'amy',name:'Amy',phone:'',email:'',promo:false}]; custCache=customerList(); custQ='am'; ok(/Amy/.test(custBodyHTML()) && !/Zed/.test(custBodyHTML()),'customer search works'); custQ='';
moneyFilter='month'; tab='home';
// dark mode
P.dark=true; ok(isDark()===true,'dark mode can be switched on'); save(); ok(JSON.parse(store[PKEY]).dark===true,'dark mode choice is saved'); P.dark=false; ok(isDark()===false,'and off'); P.dark=undefined;
allTabs(); tab='home'; staffMode=false;

// ================= version 11.1: personal books, budgets, receipt photos =================
await saveQ; saveGen++; KR=new Map(); KEYS={}; staff=null; staffMode=false; SEC=null;DK=null;LEGACY=null;S=fresh();P=defaultP();Object.keys(store).forEach(k=>delete store[k]);memPhotos.clear();thumbCache.clear();pendingPics=[];
ok(!isPersonal() && categories('out').includes('Supplies'),'business books keep business categories');
P.list.push({id:'home1',name:'Home',kind:'personal'}); P.current='home1'; S=fresh(); sanitizeP();
ok(isPersonal() && P.list[1].kind==='personal' && categories('out')[0]==='Groceries' && categories('in')[0]==='Pay','personal books use household categories');
tab='sell'; render(); ok(tab==='home','personal books have no Sell or Stock screen');
showNums=false; let ph=V.home(); ok(/Quick add/.test(ph) && /Groceries/.test(ph) && /Snap a receipt/.test(ph) && !/\\$\\d/.test(ph),'personal Home opens private, with quick-add categories');
addTx('out',null,{cat:'Fuel'}); ok(/value="Fuel"/.test($('#modal').innerHTML) && /id="picStrip"/.test($('#modal').innerHTML) && !/Customer/.test($('#modal').innerHTML),'tapping a category opens the entry with it filled in');
F('amount',120); F('cat','Groceries'); F('note','Save-On'); F('acct','bank'); F('date',today()); SAVE();
S.tx.push({id:'pp2',type:'out',amount:40,cat:'Fuel',acct:'cash',gst:0,date:today()},{id:'pp3',type:'in',amount:900,cat:'Pay',acct:'bank',gst:0,date:today()});
S.budgets={Groceries:100,Fuel:200}; showNums=true; ph=V.home();
ok(/\\$120\\.00 of \\$100\\.00/.test(ph) && /\\$40\\.00 of \\$200\\.00/.test(ph) && /Spending habits/.test(ph) && !/Profit on sales|Stock value/.test(ph),'personal summary shows spending against budgets, no business figures');
ok(/class="neg">\\$120\\.00 of/.test(ph),'going over a budget is flagged');
budgetsForm(); budgetCats().forEach((c,i)=>F('b'+i,c==='Pets'?75:'')); SAVE(); ok(Object.keys(S.budgets).length===1 && S.budgets.Pets===75,'budgets can be set per category');
ok(clean(JSON.parse(JSON.stringify(S))).budgets.Pets===75 && Object.keys(clean({budgets:{'<x>':-5,ok:'3'}}).budgets).join()==='ok','budgets survive reload and are cleaned');
moneyView='break'; moneyFilter='all'; ok(!/Best sellers|Customers/.test(V.money()) && /Where the money went/.test(V.money()),'personal breakdown leaves out business sections'); moneyView='list'; moneyFilter='month';
ok(!/Customers/.test(V.debts()),'personal Owing has no Customers button');
// receipt photos
const bytes=new Uint8Array([9,8,7,6,5]).buffer, TH='data:image/jpeg;base64,AAAA';
let pid1=await photoSave({buf:bytes,thumb:TH,w:10,h:20}); let pl=await photoLoad(pid1);
ok(pl && new Uint8Array(pl.buf).join()==='9,8,7,6,5' && pl.thumb===TH && pl.pid==='home1' && pl.date===today(),'a photo is stored and read back unchanged');
pendingPics=[pid1]; addTx('out'); F('amount',8.48); F('cat','Groceries'); F('note','Milk'); F('acct','cash'); F('date','2026-11-12'); SAVE();
const ptx=S.tx[S.tx.length-1]; ok(ptx.pics && ptx.pics[0]===pid1 && pendingPics.length===0 && (await photoLoad(pid1)),'saving the entry attaches the photo');
const pid2=await photoSave({buf:bytes,thumb:TH}); pendingPics=[pid2]; addTx('out'); closeForm(); await tick(20); ok(!(await PS.get(pid2)) && pendingPics.length===0,'cancelling the entry throws the unused photo away');
ok(/📎/.test(V.money().replace('month','')) || (moneyFilter='all', /📎/.test(V.money())),'entries with a photo show a paperclip in the Ledger'); moneyFilter='month';
tab='receipts'; rcQ='';rcCat='';rcMonth=''; ok(rcAll().length===1 && /Milk/.test(V.receipts()) && /data-pic="/.test(V.receipts()),'Receipts tab lists entries that have photos');
rcCat='Fuel'; ok(rcShown().length===0,'receipts filter by category'); rcCat='Groceries'; ok(rcShown().length===1); rcCat='';
rcMonth='2026-10'; ok(rcShown().length===0,'receipts filter by month'); rcMonth='2026-11'; ok(rcShown().length===1); rcMonth='';
rcQ='milk'; ok(rcShown().length===1,'receipts search by text'); rcQ='8.48'; ok(rcShown().length===1,'receipts search by amount'); rcQ='nov 12'; ok(rcShown().length===1,'receipts search by date'); rcQ='zzz'; ok(/No receipts match/.test(rcBodyHTML())); rcQ='';
ok(clean({tx:[{id:'a1',type:'out',amount:1,date:today(),pics:['good1','<bad>',5,'ok2']}]}).tx[0].pics.join()==='good1,ok2','photo links are cleaned on load');
// photos and encryption
save(); await enableEnc('pin-photo'); let raw1=memPhotos.get(pid1);
ok(raw1.enc===2 && !raw1.thumb && new Uint8Array(raw1.buf).join()!=='9,8,7,6,5','setting a PIN encrypts the stored photos');
pl=await photoLoad(pid1); ok(new Uint8Array(pl.buf).join()==='9,8,7,6,5' && pl.thumb===TH,'encrypted photos open normally while unlocked');
const pid3=await photoSave({buf:bytes,thumb:TH}); ok(memPhotos.get(pid3).enc===2,'new photos are encrypted too'); await photoDel(pid3);
const bkp=await backupText(true,true), bko=JSON.parse(bkp); ok(bko._photos.length===1 && bko._photos[0].id===pid1 && bko._photos[0].b64===b64(bytes),'“back up with photos” includes the pictures');
ok(!JSON.parse(await backupText(true))._photos,'ordinary backups leave photos out');
const lockedB=await backupText(false,true); ok(!lockedB.includes(b64(bytes)) && JSON.parse(lockedB).stockpileBackup===3,'a locked backup with photos is encrypted');
await lockNow(); ok(thumbCache.size===0,'locking clears photo previews from memory'); $('#pinIn').value='pin-photo'; await tryUnlock();
await removeEnc('pin-photo'); ok(!memPhotos.get(pid1).enc && new Uint8Array(memPhotos.get(pid1).buf).join()==='9,8,7,6,5','removing the PIN stores photos unlocked again');
memPhotos.clear(); bko._photos.push({id:'<evil>',b64:'AAAA'},{id:'x9',b64:5},null); applyBackup(bko); await tick(50);
ok(memPhotos.size===1 && (await photoLoad(pid1)) && new Uint8Array((await photoLoad(pid1)).buf).join()==='9,8,7,6,5' && /receipt photo/.test(lastAlert),'restoring a backup with photos brings the pictures back, and ignores bad ones');
const ptx2=S.tx.find(t=>t.pics); delTx(ptx2.id); await tick(20); ok(!(await PS.get(pid1)) && rcAll().length===0,'deleting an entry deletes its photo');
// reading a receipt
const R1=parseReceipt('SAVE-ON-FOODS\\nMaple Ridge BC\\n2026-11-12 14:32\\nMILK 4.99\\nBREAD 3.49\\nSUBTOTAL 8.48\\nGST 0.00\\nTOTAL 8.48\\nVISA 8.48');
ok(R1.amount===8.48 && R1.date==='2026-11-12' && R1.note==='Save-On-Foods' && R1.cat==='Groceries' && R1.read===true,'a grocery receipt reads as store, date, total and category');
const R2=parseReceipt('PETRO-CANADA\\nNov 3, 2026\\nREGULAR 41.2 L\\nFUEL SALE $62.10\\nTOTAL\\n$62.10');
ok(R2.amount===62.1 && R2.date==='2026-11-03' && R2.cat==='Fuel','a fuel receipt with the total on the next line reads correctly');
const R3=parseReceipt('Corner Store\\nGUM 1.25\\nCHIPS 2.75\\nTAX 0.20\\nCASH 4.20'); ok(R3.amount===4.2 && !R3.cat && !R3.date,'with no TOTAL line it takes the largest amount and leaves the rest blank');
ok(Object.keys(parseReceipt('')).length===0 && (await readReceipt({}).catch(()=>null))===null,'an unreadable photo fills in nothing');
ok(/Read receipt/.test(stripHTML(['a'],'')) && !/Read receipt/.test(stripHTML([],'')),'Read receipt button shows once there is a photo');
ok(parseReceipt('SAVE-ON-FOODS\\n2026-11-12\\nSUBTOTAL 15.77\\nTOTAL 15.77').amount===15.77,'receipt total is picked over subtotal');
ok(guessCat('BC HYDRO payment')==='Hydro' && guessCat('FortisBC')==='Natural gas' && guessCat('TELUS Mobility')==='Phone & internet' && guessCat('Tim Hortons #123')==='Eating out' && guessCat('random')==='','store names suggest a category');
ok(guessCat('Espresso Bar')==='' && guessCat('Taco Bell')==='Eating out' && guessCat('Corona Flowers')==='' && guessCat('Canadian Tire')==='Household' && guessCat('ESSO 1234')==='Fuel','category guesses avoid look-alike words');
ok(R1.place==='Maple Ridge, BC' && R1.acct==='credit' && !R1.gst && R1.lines.length===9,'a receipt also gives the city, card paid with, and the lines it read');
ok(parseReceipt('PETR0-CANADA\\n22540 Lougheed Hwy\\nMaple Ridge BC\\nTOTAL 40.00\\nINTERAC 40.00').note==='Petro-Canada' && parseReceipt('PETR0-CANADA\\n22540 Lougheed Hwy\\nMaple Ridge BC\\nTOTAL 40.00\\nINTERAC 40.00').place==='22540 Lougheed Hwy, Maple Ridge, BC','a chain name with a reader mistake is still found, with street and city');
ok(parseReceipt('Shop\\nVISA DEBIT 5.00').acct==='bank' && R3.acct==='cash' && parseReceipt('x\\nMASTERCARD 9.99').acct==='credit','debit, credit card and cash are told apart');
ok(parseReceipt('Thrifty Foods\\nSUBTOTAL 15.00\\nGST 0.75\\nTOTAL 15.75').gst===0.75 && !parseReceipt('Thrifty Foods\\nGST# 12345 RT0001\\nTOTAL 15.75').gst,'the GST amount is read, but not the GST number');
ok(findDate('Date: 14-Mar-2026')==='2026-03-14' && findDate('03/14/26 10:22')==='2026-03-14' && findDate('14/03/2026')==='2026-03-14' && findDate('2099-01-01')==='' && findDate('ref 4521-88-12')==='','dates in many layouts are read, and impossible ones ignored');
ok(parseReceipt('NHS A 7 PLR\\nTOTAL 5.00').note===undefined && parseReceipt('Thank you\\nCorner Store\\nTOTAL 5.00').note==='Corner Store','a garbled top line is not used as the store name');
S.learn={}; S.learn[storeKey('Corner Store')]='Snacks'; ok(parseReceipt('Corner Store\\nTOTAL 5.00').cat==='Snacks','a store you categorised before gets the same category'); S.learn={};
{ const keep=S.tx; S.tx=[{id:'c1',type:'out',amount:50,acct:'credit',cat:'x',note:'',date:today()},{id:'c2',type:'move',amount:20,from:'bank',to:'credit',note:'',date:today()},{id:'c3',type:'move',amount:5,from:'cash',note:'',date:today()}];
  ok(acctBal('credit')===-30 && acctBal('bank')===-15 && acctBal('cash')===-5 && usesCredit() && moveName(S.tx[1])==='Paid Credit card from Debit (bank)','credit card spending and paying it off add up; old Cash → Bank moves still work');
  const C=clean({tx:[...S.tx,{id:'c4',type:'out',amount:1,acct:'weird',place:'Maple Ridge',date:today()}],learn:{costco:'Groceries','BAD KEY':'x'}});
  ok(C.tx[0].acct==='credit' && C.tx[1].to==='credit' && !C.tx[2].to && C.tx[3].acct==='cash' && C.tx[3].place==='Maple Ridge' && C.learn.costco==='Groceries' && !C.learn['BAD KEY'],'saved books keep credit card, payoff moves, places and learned categories');
  S.cards=[{id:'credit',name:'RBC Visa',last4:'4417'},{id:'cctd1',name:'TD Mastercard'}]; S.tx.push({id:'c5',type:'out',amount:12,acct:'cctd1',cat:'x',note:'',date:today()});
  ok(acctName('credit')==='RBC Visa ••4417' && owedOn('cctd1')===12 && owedOn('credit')===30 && cardTiles().includes('TD Mastercard owed') && acctField('cash').o.map(x=>x[0]).join()==='cash,bank,credit,cctd1','each credit card has its own name and balance');
  ok(parseReceipt('Shell\\nTOTAL 20.00\\nVISA ************4417').acct==='credit' && parseReceipt('Shell\\nTOTAL 20.00\\nMASTERCARD').acct==='credit' && parseReceipt('Shell\\nTOTAL 20.00\\nCARD ****9999\\nDEBIT').acct==='bank','a receipt picks the card by its last 4 digits');
  const C2=clean({cards:[{id:'credit',name:'RBC Visa',last4:'4417'},{id:'cctd1',name:'TD',last4:'12'},{id:'bad',name:'x'},{id:'cczz',name:''}],tx:[{id:'m9',type:'move',amount:5,from:'bank',to:'cctd1',date:today()}]});
  ok(C2.cards.length===2 && C2.cards[1].last4===undefined && C2.tx[0].to==='cctd1','saved books keep the card list and payments to each card');
  S.cards=[];
  S.banks=[{id:'bank',name:'TD Chequing',last4:'1234'},{id:'bksav',name:'Savings'}]; S.tx.push({id:'b1',type:'move',amount:100,from:'cash',to:'bksav',note:'',date:today()},{id:'b2',type:'in',amount:7,acct:'bksav',cat:'x',note:'',date:today()});
  ok(acctName('bank')==='TD Chequing ••1234' && acctBal('bksav')===107 && bankTotal()===acctBal('bank')+107 && moves().some(m=>m[0]==='bank>bksav') && moves().some(m=>m[0]==='bksav>credit') && moveName(S.tx.find(t=>t.id==='b1'))==='Moved Cash → Savings','each bank account has its own name, balance and transfers');
  ok(parseReceipt('Shell\\nTOTAL 20.00\\nINTERAC ****1234').acct==='bank' && parseReceipt('Shell\\nTOTAL 20.00\\nDEBIT').acct==='bank' && acctField('cash',null,1).o.map(x=>x[0]).join()==='cash,bank,bksav','a receipt picks the bank account by the debit card digits; sales can go to any account');
  ok(clean({banks:[{id:'bksav',name:'Savings',last4:'9876'},{id:'zz',name:'x'}],tx:[{id:'q',type:'move',amount:1,from:'bksav',to:'cash',date:today()}]}).tx[0].from==='bksav' && clean({banks:[{id:'bksav',name:'Savings',last4:'9876'},{id:'zz',name:'x'}]}).banks.length===1,'saved books keep bank accounts and moves out of them');
  S.banks=[];
  S.tx=keep; }
addTx('out',null,R1); ok(/Filled in from the photo/.test($('#modal').innerHTML) && /value="8.48"/.test($('#modal').innerHTML) && /value="2026-11-12"/.test($('#modal').innerHTML),'a read receipt pre-fills the entry and asks you to check it'); closeForm();
// household shares and the budget helper
{ const keepTx=S.tx, keepB=S.budgets, keepR=S.rec; const ym=thisMonth(), p1=ymAdd(ym,-1), p2=ymAdd(ym,-2), d=n=>ym+'-'+String(n).padStart(2,'0');
  const keepSN=showNums; showNums=true; S.tx=[]; S.rec=[]; S.budgets={'Eating out':100};
  [p1,p2].forEach((m,i)=>{ S.tx.push({id:'g'+i,type:'out',amount:300,cat:'Groceries',note:'',date:m+'-10'},{id:'e'+i,type:'out',amount:80,cat:'Eating out',note:'',date:m+'-12'},{id:'n'+i,type:'out',amount:16.99,cat:'Subscriptions',note:'Netflix',date:m+'-03'},{id:'p'+i,type:'in',amount:2000,cat:'Pay',note:'',date:m+'-01'}); });
  for(let i=0;i<6;i++) S.tx.push({id:'t'+i,type:'out',amount:9,cat:'Eating out',note:'Tim Hortons',date:d(1)});
  S.tx.push({id:'big',type:'out',amount:900,cat:'Groceries',note:'',date:d(2)});
  const U=usual(); ok(U.months===2 && U.cats.Groceries===300 && U.inc===2000,'usual months are averaged from past entries');
  const A=advice(), all=A.warn.join(' ')+' '+A.tips.join(' ')+' '+A.suggTip;
  ok(/Groceries<\\/b> is \\$900\\.00 so far/.test(all) && /Suggested budgets/.test(all) && A.sugg.Groceries===300 && A.sugg['Eating out']===undefined,'unusual spending is flagged and budgets are suggested for categories without one');
  ok(/Tim Hortons<\\/b> 6 times/.test(all) && /monthly bill: <b>Netflix/.test(all) && (+today().slice(8)<5 || /at this pace/i.test(all)),'small buys, repeat bills and a month-end forecast are shown');
  ok(budgetAlert('Eating out',d(1)).startsWith('Heads up')===false && /Heads up|Over budget/.test(budgetAlert('Eating out',d(1))||'Heads up')===true,'budget alert runs');
  S.tx.push({id:'t9',type:'out',amount:60,cat:'Eating out',note:'',date:d(1)}); ok(/Over budget: Eating out is now \\$114\\.00 of your \\$100\\.00/.test(budgetAlert('Eating out',d(1))),'saving an entry that goes over budget warns you');
  useSugg(); ok(S.budgets.Groceries===300 && S.budgets['Eating out']===100,'suggested budgets can be used with one tap, keeping ones you set');
  S.house=[{id:'mom',name:'Mom',share:500}]; contribForm('mom'); F('amount',200); SAVE();
  ok(paidIn('mom')===200 && houseLeft()===300 && /Still owes \\$300\\.00/.test(houseCard()) && S.tx.some(t=>t.who==='mom'&&t.cat==='Household'),'household shares show who has paid and who still owes');
  ok(clean({house:[{id:'mom',name:'Mom',share:500},{name:''}],tx:[{id:'x1',type:'in',amount:5,who:'mom',date:today()}]}).house.length===1 && clean({tx:[{id:'x1',type:'in',amount:5,who:'mom',date:today()}]}).tx[0].who==='mom','saved books keep household people and who paid');
  ok(/Budget check/.test(adviceCard()),'Home shows the budget check');
  S.tx=keepTx; S.budgets=keepB; S.rec=keepR; S.house=[]; showNums=keepSN; }
// starting balances, card details, account history, split receipts, ledger account filter
{ const keepTx=S.tx, keepC=S.cards, keepB=S.banks, keepO=S.open, keepSN=showNums; showNums=true; S.tx=[]; S.cards=[]; S.banks=[]; S.open={};
  cardForm(null,'bank'); F('name','TD Chequing'); F('last4','1234'); F('bal',2500); SAVE();
  ok(acctBal('bank')===2500 && S.open.bank===2500 && S.tx.length===0,'a bank account can start with its real balance, without adding an entry');
  S.tx.push({id:'s1',type:'out',amount:100,acct:'bank',cat:'Groceries',note:'Costco',date:today()}); ok(acctBal('bank')===2400,'entries add and take away from the starting balance');
  balForm('bank'); F('bal',2390.5); SAVE(); ok(acctBal('bank')===2390.5 && S.tx.length===1,'setting the balance later matches the real account');
  cardForm(); F('name','RBC Visa'); F('last4','4417'); F('bal',800); F('limit',1000); F('due',+today().slice(8)===28?28:Math.min(+today().slice(8)+2,28)); F('apr',20); F('min',25); SAVE();
  const c=S.cards[0]; ok(owedOn('credit')===800 && c.limit===1000 && c.apr===20 && c.min===25 && cardDue(c)>=today(),'a card keeps what is owed, limit, due day, interest and minimum');
  const A=advice(), all=A.warn.join(' ')+A.tips.join(' '); ok(/payment due/.test(all) && /80% of its/.test(all) && /costs about \\$13\\.33 a month in interest/.test(all),'card payment due, near the limit and interest cost are flagged');
  acctSheet('bank'); ok(/TD Chequing/.test($('#modal').innerHTML) && /after: \\$2,390\\.50|after: \\$2390\\.50/.test($('#modal').innerHTML) && /Set balance/.test($('#modal').innerHTML),'tapping a balance shows its entries with the running balance'); closeForm();
  acctSheet('credit'); ok(/Pay it off/.test($('#modal').innerHTML) && /800\\.00 owed/.test($('#modal').innerHTML),'a card shows what is owed and a pay-off button'); closeForm();
  const C=clean({open:{bank:5,zz:3,cash:0},cards:[{id:'credit',name:'V',limit:500,due:40,apr:150}],tx:[{id:'g',type:'out',amount:1,grp:'abc',date:today()}]});
  ok(C.open.bank===5 && C.open.zz===undefined && C.cards[0].limit===500 && C.cards[0].due===undefined && C.cards[0].apr===undefined && C.tx[0].grp==='abc','saved books keep starting balances, card details and split groups');
  // split
  pendingPics=[]; addTx('out'); F('amount',150); F('cat','Groceries'); F('note','Costco'); F('acct','bank'); FC('split',true); SAVE(); await tick(60);
  ok(/Split \\$150\\.00/.test($('#modal').innerHTML),'ticking split opens the split screen');
  F('c0','Groceries'); F('a0',100); F('c1','Household'); F('a1',30); lastAlert=''; const yes=globalThis.confirm; globalThis.confirm=()=>true; SAVE(); globalThis.confirm=yes;
  const parts=S.tx.filter(t=>t.note==='Costco'&&t.grp); ok(parts.length===2 && parts.find(t=>t.cat==='Groceries').amount===120 && parts.find(t=>t.cat==='Household').amount===30 && parts[0].grp===parts[1].grp,'a split receipt becomes one entry per category, leftovers on the first');
  // ledger account filter
  moneyFilter='all'; moneyAcct='credit'; let L=V.money(); ok(/All accounts/.test(L) && !/Costco/.test(L),'the Ledger can show one account'); moneyAcct='bank'; L=V.money(); ok(/Costco/.test(L),'…and that account’s entries'); moneyAcct=''; moneyFilter='month';
  S.tx=keepTx; S.cards=keepC; S.banks=keepB; S.open=keepO; showNums=keepSN; }
// savings goals, payoff plan, calendar, monthly report
{ const keepTx=S.tx, keepR=S.rec, keepC=S.cards, keepD=S.debts, keepG=S.goals, keepSN=showNums; showNums=true; S.tx=[]; S.rec=[]; S.cards=[]; S.debts=[]; S.goals=[]; S.open={};
  const in90=dayShift(today(),90);
  recurForm(null,{type:'in',freq:'biweekly'}); F('name','Pay'); F('amount',2000); F('cat','Pay'); F('next',dayShift(today(),1)); SAVE();
  goalForm(); F('name','Mexico trip'); F('target',1200); F('date',in90); F('acct',''); F('start',200); SAVE();
  const g=S.goals[0]; ok(goalSaved(g)===200 && paydaysUntil(in90)>=6 && paydaysUntil(in90)<=7 && /each payday/.test(goalPlan(g)),'a goal shows what is saved and how much to put aside each payday');
  goalMoney(g.id,'out'); F('amount',300); SAVE(); ok(goalSaved(g)===500 && S.tx.some(t=>t.goal===g.id&&t.cat==='Savings'),'adding money to a goal moves it forward');
  ok(/Mexico trip/.test(goalsCard()) && clean({goals:[{id:'g1',name:'Car',target:5000,acct:'bank'}],tx:[{id:'q',type:'out',amount:1,goal:'g1',date:today()}]}).goals[0].acct==='bank','goals show on Home and survive reload');
  S.cards=[{id:'credit',name:'Visa',apr:20,min:50}]; S.open={credit:-3000}; S.debts=[{id:'d1',name:'Car loan',dir:'owe',amount:5000,payments:[],date:today(),rate:7,min:200}];
  const L=planDebts(), r0=simulate(L,0,'rate'), r1=simulate(L,200,'rate'), r2=simulate(L,200,'small');
  ok(L.length===2 && !r0.stuck && r1.months<r0.months && r1.interest<r0.interest && r1.order[0][0]==='Visa' && r2.order[0][0]==='Visa','the payoff plan pays highest interest first and saves time and interest with extra');
  planSheet(); ok(/Debt-free by/.test($('#modal').innerHTML) && /Saves/.test($('#modal').innerHTML),'the payoff plan screen shows the debt-free date and savings'); closeForm();
  ok(/Payoff plan/.test(V.debts()),'Owing has a Payoff plan button');
  S.cards[0].due=25; S.debts[0].due=dayShift(today(),10); let got=null; const dl=download; download=(n,t)=>{got=t}; const yes=globalThis.confirm; globalThis.confirm=()=>true; calendarExport(); download=dl; globalThis.confirm=yes;
  ok(got && /BEGIN:VCALENDAR/.test(got) && /RRULE:FREQ=WEEKLY;INTERVAL=2/.test(got) && /BYMONTHDAY=25/.test(got) && /Pay Car loan/.test(got) && /TRIGGER:-P1D/.test(got),'bills, paydays, card due dates and debts go into a calendar file with reminders');
  const ym=thisMonth(); S.tx.push({id:'r1',type:'out',amount:50,cat:'Groceries',note:'Safeway',date:ym+'-01'}); const R=reportData(ym);
  ok(R.out>=50 && R.stores.some(x=>x[0]==='Safeway') && /By category/.test(reportHTML(R)) && /Left over/.test(reportText(R)),'the monthly report adds up the month');
  reportSheet(ym); ok(/Print/.test($('#modal').innerHTML),'the report can be printed or shared'); closeForm();
  S.tx=keepTx; S.rec=keepR; S.cards=keepC; S.debts=keepD; S.goals=keepG; S.open={}; showNums=keepSN; }
// 3.12.0: Home and Ledger together, Budget tab, Transportation category
// bills: paid / unpaid, Auto-pay, plain colours for money out (3.15.0)
{ const keepTx=S.tx, keepR=S.rec, keepSN=showNums, me=P.list.find(p=>p.id===P.current), keepK=me.kind; me.kind='personal'; showNums=true; S.tx=[]; S.rec=[];
  const dd=+today().slice(8), ym=thisMonth(), d1=ym+'-01';
  recurForm(); F('type','out'); F('freq','monthly'); F('name','Rent'); F('amount',1000); F('cat','Rent'); F('acct','bank'); F('day',1); F('auto','no'); FC('now',true); SAVE();
  ok(S.rec.length===1 && S.rec[0].auto===false && S.tx.length===0,'a bill set to “I pay it myself” adds nothing to the Ledger by itself');
  const rid=S.rec[0].id; ok(billsNow().length===1 && billsNow()[0].d===d1 && billsNow()[0].st===(dd===1?'soon':'late'),'an unpaid bill past its date shows as overdue');
  let vb=V.budget(); ok(/🧾 Bills/.test(vb) && /Mark paid/.test(vb) && /0 of 1 paid/.test(vb) && (dd===1 || /class="neg">1 overdue/.test(vb)),'the Budget tab lists bills with a Mark paid button');
  let hm=personalHome(''); ok(/id="billsLine"/.test(hm) && /0 of 1 paid/.test(hm) && !/billPay\\(/.test(hm),'Home shows one Bills line, not each bill');
  billPay(rid,d1); vb=V.budget();
  ok(S.tx.length===1 && S.tx[0].amount===1000 && S.tx[0].date===today() && S.tx[0].rec===rid && billsNow()[0].st==='paid' && /1 of 1 paid/.test(vb) && /All paid/.test(vb) && /btn sm paid/.test(vb),'Mark paid adds the Ledger entry and turns the bill green');
  billUnpay(rid,d1); ok(S.tx.length===0 && !S.rec[0].paid && billsNow()[0].st!=='paid','tapping Paid again undoes it');
  billPayForm(rid,d1); F('amount',1234.5); F('date',today()); SAVE();
  ok(S.tx.length===1 && S.tx[0].amount===1234.5 && S.rec[0].amount===1000 && billsNow()[0].amt===1234.5,'a different amount can be paid for one month only');
  const c2=clean(JSON.parse(JSON.stringify(S))); ok(c2.rec[0].auto===false && c2.rec[0].paid[d1]===S.tx[0].id && c2.tx[0].rec===rid && isDate(c2.rec[0].since),'paid bills survive a reload');
  ok(applyRecurring()===false && S.tx.length===1,'a bill you pay yourself is never added automatically');
  S.tx=[]; ok(billsNow()[0].st!=='paid','deleting the Ledger entry makes the bill unpaid again');
  recurForm(); F('type','out'); F('freq','monthly'); F('name','Phone'); F('amount',60); F('cat','Phone'); F('acct','bank'); F('day',1); F('auto','yes'); FC('now',true); SAVE();
  const ph=billsNow().find(b=>b.r.name==='Phone'); ok(S.tx.length===1 && ph.st==='paid' && S.tx[0].rec===ph.r.id && !ph.r.auto && /Auto-pay/.test(V.budget()),'an Auto-pay bill is added on its date and shows as paid');
  recurForm(null,{freq:'weekly'}); F('type','out'); F('freq','weekly'); F('name','Gym'); F('amount',20); F('cat','Gym'); F('acct','bank'); F('next',dayShift(today(),2)); F('auto','no'); SAVE();
  const gym=S.rec.find(r=>r.name==='Gym'); ok(gym.auto===false && billState(gym,dayShift(today(),2))==='soon' && billState(gym,dayShift(today(),9))==='later' && billState(ph.r,dayShift(today(),2))==='later','a bill due within 3 days shows as due soon');
  S.rec.push({id:'old1',name:'Hydro',amount:80,cat:'Utilities',acct:'bank',day:15,last:ym,auto:false,since:dayShift(today(),-80)});
  const pd=onDay(monthShift(ym,-1),15); hm=personalHome('');
  ok(billsNow().some(b=>b.r.id==='old1'&&b.d===pd&&b.st==='late') && /overdue/.test(hm) && advice().warn.some(w=>/Hydro<\\/b> is overdue/.test(w)),'an unpaid bill from last month stays on the list and warns');
  billPay('old1',pd); ok(!billsNow().some(b=>b.r.id==='old1'&&b.d===pd&&b.st==='late') && S.rec.find(r=>r.id==='old1').paid[pd],'…until it is marked paid');
  recurForm(ph.r.id); F('type','out'); F('freq','monthly'); F('name','Phone'); F('amount',60); F('cat','Phone'); F('acct','bank'); F('day',1); F('auto','no'); SAVE();
  ok(ph.r.auto===false && ph.r.since===dayShift(today(),1) && billState(ph.r,d1)==='paid','switching a bill to “I pay it myself” leaves past dates settled');
  recurForm(ph.r.id); F('auto','yes'); SAVE(); ok(ph.r.auto===undefined && ph.r.since===undefined,'…and it can be switched back to Auto-pay');
  S.tx.push({id:'co1',type:'out',amount:12,cat:'Groceries',acct:'cash',gst:0,date:today()},{id:'co2',type:'in',amount:50,cat:'Pay',acct:'cash',gst:0,date:today()});
  moneyFilter='month'; const lg=V.money(true); hm=personalHome('');
  ok(!/class="amt neg"/.test(lg) && /class="amt ">−\\$12\\.00/.test(lg) && /class="amt pos">\\+\\$50\\.00/.test(lg) && /Out<\\/div><div class="big">/.test(hm),'money out is plain with a − sign; money in stays green with a +');
  ok(/Open Bills/.test(V.more()) && !/Recurring bills/.test(V.more()),'personal More points to the Budget tab for bills');
  delete me.kind; ok(/Recurring bills/.test(V.more()) && !/Open Bills/.test(V.more()),'business books keep recurring bills under More'); if(keepK) me.kind=keepK;
  F('auto','yes'); S.tx=keepTx; S.rec=keepR; showNums=keepSN; }
{ const keepTx=S.tx, keepB=S.budgets, keepSN=showNums, me=P.list.find(p=>p.id===P.current), keepK=me.kind; S.tx=[]; S.budgets={Groceries:200}; me.kind='personal';
  const d=today(); S.tx.push({id:'h1',type:'out',amount:80,cat:'Groceries',note:'Safeway',acct:'cash',gst:0,date:d},{id:'h2',type:'in',amount:900,cat:'Pay',note:'',acct:'cash',gst:0,date:d});
  tab='money'; render(); ok(tab==='home','personal books open the Ledger inside Home');
  showNums=false; let H=V.home(); ok(/Spending habits/.test(H) && /Entries/.test(H) && /Safeway/.test(H) && /👁 Show/.test(H) && !/\\$\\d/.test(H) && !/Welcome back/.test(H),'Home shows the full layout and entries with amounts hidden');
  showNums=true; H=V.home(); ok(/\\$80\\.00 of \\$200\\.00/.test(H) && /🙈 Hide/.test(H) && H.indexOf('Spending habits')<H.indexOf('Entries') && /Breakdown/.test(H),'tapping Show reveals the numbers, habits come before the entries');
  tab='budget'; render(); ok(tab==='budget','personal books have a Budget tab');
  let Bt=V.budget(); ok(/Budgeted – /.test(Bt) && /\\$120\\.00 left/.test(Bt) && /Groceries/.test(Bt) && !/Pets/.test(Bt),'the Budget tab shows each budget with what is left');
  budgetAll=true; blistN=99; Bt=V.budget(); ok(/Pets/.test(Bt) && /Transportation/.test(Bt),'all categories can be shown, including Transportation'); budgetAll=false; blistN=6;
  V.budget(); budgetOne(bCats.indexOf('Groceries')); F('b',250); SAVE(); ok(S.budgets.Groceries===250,'tapping a category sets its budget');
  V.budget(); budgetOne(bCats.indexOf('Groceries')); F('b',''); SAVE(); ok(S.budgets.Groceries===undefined,'clearing it removes the budget');
  ok(guessCat('TRANSLINK COMPASS')==='Transportation' && guessCat('Impark parking')==='Transportation' && guessCat('Uber Eats')==='Eating out' && guessCat('Lordco auto parts')==='Vehicle','receipts sort transit, parking and ride shares into Transportation');
  quickForm(); PCATS.forEach((c,i)=>FC('q'+i,['Groceries','Fuel'].includes(c[0]))); SAVE();
  H=V.home(); ok(/Choose icons/.test(V.more()) && S.set.quick.join()==='Groceries,Fuel' && H.includes('{cat:PCATS[0][0]}') && !H.includes('{cat:PCATS[4][0]}'),'Quick add on Home shows only the icons picked');
  ok(clean(JSON.parse(JSON.stringify(S))).set.quick.join()==='Groceries,Fuel','the picked icons survive reload');
  delete S.set.quick; quickN=6; H=V.home(); ok(H.includes('{cat:PCATS[5][0]}') && !H.includes('{cat:PCATS[6][0]}') && /Show more \\(/.test(H),'Quick add starts with 6 icons and a Show more button');
  quickN=12; H=V.home(); ok(H.includes('{cat:PCATS[11][0]}') && !H.includes('{cat:PCATS[12][0]}'),'Show more adds 6 at a time');
  quickN=PCATS.length; H=V.home(); ok(/Show less/.test(H) && H.includes('{cat:PCATS['+(PCATS.length-1)+'][0]}'),'once all show, it offers Show less'); quickN=6; S.set.quick=['Groceries','Fuel'];
  quickForm(); PCATS.forEach((c,i)=>FC('q'+i,false)); SAVE(); ok(!/Quick add/.test(V.home()),'unticking every icon hides Quick add');
  quickForm(); PCATS.forEach((c,i)=>FC('q'+i,true)); SAVE(); ok(S.set.quick===undefined && quickCats().length===PCATS.length,'ticking them all goes back to showing every icon');
  S.budgets={}; PCATS.slice(0,9).forEach((c,i)=>{S.budgets[c[0]]=100+i;}); showNums=true; chipN=4; habitN=5; blistN=6; budgetAll=false; H=V.home();
  ok((H.split('onclick=\"donutPick(').length-2)===4 && /Show more \\(5\\)/.test(H),'the budget buttons start with 4 and a Show more');
  ok((H.split('Spending habits')[1].split('Quick add')[0].match(/class="br"/g)||[]).length===5,'Spending habits starts with 5 rows');
  const nB=h=>h.split('Tap a category to set its budget')[1].split('onclick="budgetOne(').length-1; let Bl=V.budget(); ok(nB(Bl)===6 && /Show more \\(3\\)/.test(Bl),'the Budget tab list starts with 6');
  blistN=12; Bl=V.budget(); ok(nB(Bl)===9 && /Show less/.test(Bl),'Show more reveals the rest, then Show less'); blistN=6; S.budgets={Groceries:200};
  delete me.kind; tab='budget'; render(); ok(!isPersonal() && tab==='home','business books have no Budget tab'); me.kind=keepK; if(keepK===undefined) delete me.kind;
  S.tx=keepTx; S.budgets=keepB; showNums=keepSN; tab='home'; }
// 3.13.0: graphs
{ const keepTx=S.tx, keepB=S.budgets, keepSN=showNums, keepSet=S.set, me=P.list.find(p=>p.id===P.current), keepK=me.kind; me.kind='personal'; S.tx=[]; S.budgets={Groceries:300}; S.set={...S.set}; delete S.set.chart;
  const ym=thisMonth(), d=ym+'-01'; S.tx.push({id:'c1',type:'out',amount:120,cat:'Groceries',note:'',acct:'cash',gst:0,date:d},{id:'c2',type:'out',amount:30,cat:'Fuel',note:'',acct:'cash',gst:0,date:d},{id:'c3',type:'in',amount:1000,cat:'Pay',note:'',acct:'cash',gst:0,date:d},{id:'c4',type:'out',amount:400,cat:'Rent or mortgage',note:'',acct:'cash',gst:0,date:ymAdd(ym,-2)+'-03'});
  showNums=false; let H=V.home(); ok(!/<svg/.test(H) && /Tap Show to see this graph/.test(H),'graphs stay hidden until Show is tapped');
  showNums=true; H=V.home(); ok(/aria-label="Spending against your total budget"/.test(H) && /aria-label="Money in and out, last 6 months"/.test(H) && /class="dot"/.test(H) && !/NaN|undefined/.test(H),'Home shows the spending donut and the 6-month graph');
  ok(CAP.trend.length===6 && /in \\$1,000\\.00 · out \\$150\\.00/.test(CAP.trend[5]) && /out \\$400\\.00/.test(CAP.trend[3]),'the 6-month graph adds up each month');
  ok(spendSlots({a:5,b:1,c:2,d:1,e:1,f:1,g:1,h:1,i:1,j:1}).length===8 && spendSlots({a:5,b:1,c:2,d:1,e:1,f:1,g:1,h:1,i:1,j:1})[7][0]==='Other' && spendSlots({a:5,b:1})[0][2]==='var(--s1)','more than 8 categories fold into Other');
  ok(/>\\$150<\\/text><text[^>]*>of \\$300 budget/.test(H) && /no budget: \\$30\\.00/.test(CAP.spend.join()) && /\\$150\\.00 left of your \\$300\\.00 budget/.test(H) && /All budgets/.test(H),'the Home donut is the total budget with each category spent as a slice');
  donutPick(0); H=V.home(); ok(donutSel==='Groceries' && />\\$120<\\/text>/.test(H) && /of \\$300</.test(H) && /\\$180\\.00 left · about/.test(H),'tapping a budget shows its own donut');
  S.tx.push({id:'c5',type:'out',amount:250,cat:'Groceries',note:'',acct:'cash',gst:0,date:d}); H=V.home(); ok(/Over this budget by \\$70\\.00/.test(H) && CAP.spend.length===2,'going over a budget shows the over part'); S.tx.pop(); donutPick(-1);
  S.budgets={}; H=V.home(); ok(/aria-label="Spending by category"/.test(H),'with no budgets the donut shows spending by category'); S.budgets={Groceries:300};
  let Bt=V.budget(); ok(/Spending against budget/.test(Bt),'the Budget tab has the budget donut too'); ok(/This month's pace/.test(Bt) && /aria-label="Spending this month against an even pace"/.test(Bt) && /\\$120\\.00 spent so far/.test(CAP.pace[0]),'the Budget tab shows the pace graph');
  setChart('trend','line'); H=V.home(); ok(/<polyline/.test(H.split('Last 6 months')[1]) && S.set.chart.trend==='line','the 6-month graph can be a line');
  setChart('spend','list'); setChart('trend','off'); setChart('pace',false); H=V.home(); ok(!/<svg/.test(H) && !/This month's pace/.test(V.budget()) && /Graphs/.test(V.more()),'each graph can be changed or turned off under More');
  ok(clean(JSON.parse(JSON.stringify(S))).set.chart.trend==='off' && clean({set:{chart:{trend:'bad',pace:'x'}}}).set.chart.trend===undefined,'graph choices survive reload and are cleaned');
  ok(niceMax(1134)===1200 && niceMax(0)===100 && shortMoney(2500)==='$2.5k' && shortMoney(12000)==='$12k','graph axes use round numbers');
  me.kind=keepK; if(keepK===undefined) delete me.kind; S.tx=keepTx; S.budgets=keepB; S.set=keepSet; showNums=keepSN; }
// savings are set aside, not spending; storage meter; hidden test checklist
{ const keepTx=S.tx, keepB=S.budgets, keepR=S.rec, keepG=S.goals, keepSN=showNums, me=P.list.find(p=>p.id===P.current), keepK=me.kind; showNums=true; S.tx=[]; S.rec=[]; S.goals=[]; S.budgets={Savings:100,Groceries:200};
  const ym=thisMonth(), d1=ym+'-01';
  S.tx.push({id:'sv1',type:'out',amount:300,cat:'Savings',note:'Saved for Trip',acct:'bank',date:d1},{id:'sv2',type:'in',amount:50,cat:'Savings',note:'From savings: Trip',acct:'bank',date:d1},{id:'gr1',type:'out',amount:80,cat:'Groceries',note:'Safeway',date:d1},{id:'py1',type:'in',amount:1000,cat:'Pay',note:'',date:d1});
  me.kind='personal';
  const R=reportData(ym), A=advice(), all=A.warn.join(' ')+' '+A.tips.join(' ');
  ok(catsIn(ym).Savings===undefined && catsIn(ym).Groceries===80 && setAside(ym)===250 && budgetAlert('Savings',d1)==='' && !budgetCats().includes('Savings'),'savings are left out of spending and budgets');
  ok(R.out===80 && R.inn===1000 && R.aside===250 && !R.cats.some(c=>c[0]==='Savings') && /Set aside/.test(reportHTML(R)) && /Set aside: \\$250\\.00\\nLeft over: \\$670\\.00/.test(reportText(R)),'the monthly report shows savings as set aside, not spending');
  ok(!/Savings<\\/b> is over budget/.test(all) && /Set aside so far this month: <b>\\$250\\.00/.test(all),'the budget check does not warn about savings');
  const H=personalHome(''); ok(/Set aside</.test(H) && /\\$670\\.00/.test(H) && !/🏦 Savings/.test(H.split('Entries')[0].split('Spending habits')[1]),'Home shows money set aside and leaves it out of spending');
  me.kind=keepK; if(keepK===undefined) delete me.kind;
  ok(isPersonal() || catsIn(ym).Savings===300,'business books still count a Savings category as money out');
  const u=storageUse(); ok(u.used>0 && u.pct>=0 && u.pct<=100 && /Storage on this phone/.test(V.more()) && storageNote()==='','More shows how full storage is');
  store.zz_fill='x'.repeat(3.6e6); ok(/filling up/.test(storageNote()) && storageUse().pct>=70,'a backup nudge appears when storage passes 70%');
  store.zz_fill='x'.repeat(4.7e6); ok(/almost full/.test(storageNote()) && /Send backup/.test(storageNote()),'a stronger warning appears when storage is almost full'); delete store.zz_fill;
  closeForm(); for(let i=0;i<4;i++) verTap(); ok(!/Phone test checklist/.test($('#modal').innerHTML),'four taps on the version number do nothing'); verTap();
  ok(/Phone test checklist/.test($('#modal').innerHTML) && /0 of /.test($('#modal').innerHTML),'five taps on the version number open the hidden test checklist');
  testTick('r1',true); ok(testDone().r1===VERSION && /1 of /.test($('#modal').innerHTML) && store[TKEY],'ticks are saved on the phone'); testTick('r1',false); ok(!testDone().r1,'a tick can be cleared'); delete store[TKEY]; closeForm();
  S.tx=keepTx; S.budgets=keepB; S.rec=keepR; S.goals=keepG; showNums=keepSN; }
// business books still get receipts
P.current='default'; S=fresh(); S.tx.push({id:'bz',type:'out',amount:5,cat:'Supplies',acct:'cash',gst:0,date:today(),pics:['zz1']}); tab='money'; moneyFilter='all';
ok(!isPersonal() && /📎 Receipts/.test(V.money()) && /Customers/.test(V.debts()),'business books get a Receipts button and keep Customers'); moneyFilter='month';
showNums=false; ok(!/Welcome back/.test(V.home()) && !/Quick add/.test(V.home()) && /Stock value/.test(V.home()) && !/\\$\\d/.test(V.home()) && /👁 Show/.test(V.home()),'business Home keeps its layout with amounts hidden');
allTabs(); V.receipts(); tab='home';

// version 11.2: switch books from a drop-down at the top
await saveQ; saveGen++; KR=new Map(); KEYS={}; staff=null; staffMode=false; SEC=null;DK=null;LEGACY=null;S=fresh();P=defaultP();Object.keys(store).forEach(k=>delete store[k]);
P.list.push({id:'h2',name:'Home & <Family>',kind:'personal'}); S.tx.push({id:'biz1',type:'in',amount:5,cat:'Sales',acct:'cash',gst:0,date:today()}); save(); render();
let hd=$('#hdr').innerHTML; ok(/<select id="profSel"/.test(hd) && /<option value="default" selected>My business<\\/option>/.test(hd) && /<option value="h2" >Home &amp; &lt;Family&gt; \\(personal\\)<\\/option>/.test(hd) && !/profiles\\(\\)/.test(hd),'the top bar is a drop-down listing every set of books');
await switchProfile('h2'); ok(P.current==='h2' && isPersonal() && S.tx.length===0 && /<option value="h2" selected>/.test($('#hdr').innerHTML),'picking one from the drop-down switches to it');
await switchProfile('default'); ok(S.tx.length===1 && /Add, rename or delete books/.test(V.more()),'adding and managing books lives under More');
staffMode=true; render(); ok(!/<select/.test($('#hdr').innerHTML) && /Lock/.test($('#hdr').innerHTML),'staff mode shows Lock in place of the drop-down'); staffMode=false; tab='home'; render();



// ================= version 12: separate keys per books, per-person staff PINs, private PINs =================
const wait=async(cond,ms=25000)=>{const t0=Date.now(); while(!cond()&&Date.now()-t0<ms) await tick(40);};
const fails=async p=>{try{await p;return false}catch(e){return true}};
await saveQ; saveGen++; KR=new Map(); KEYS={}; staff=null; staffMode=false; SEC=null;DK=null;LEGACY=null;S=fresh();P=defaultP();Object.keys(store).forEach(k=>delete store[k]);memPhotos.clear();thumbCache.clear();
S.items.push({id:'a',name:'Widget',num:1,qty:10,cost:5,price:10}); S.debts.push({id:'ow1',name:'Supplier',dir:'owe',amount:50,date:today(),payments:[]},{id:'od1',name:'Cust',dir:'owed',amount:30,date:today(),payments:[]}); S.tx.push({id:'bizsecret',type:'in',amount:555,cat:'Sales',acct:'cash',gst:0,date:today()}); save();
P.list.push({id:'hm',name:'Home',kind:'personal'}); P.current='hm'; S=fresh(); S.tx.push({id:'homesecret',type:'out',amount:4321,cat:'Loans & credit cards',note:'private loan',acct:'bank',gst:0,date:today()}); save();
const hpic=await photoSave({buf:new Uint8Array([4,4,4]).buffer,thumb:'data:image/jpeg;base64,BBBB'}); S.tx[0].pics=[hpic]; save();
await enableEnc('owner-12');
ok(SEC.v===2 && JSON.parse(store[KEY0]).enc===2 && JSON.parse(store[keyFor('hm')]).enc===2 && KEYS.default && KEYS.hm && KEYS.default!==KEYS.hm,'each set of books gets its own encryption key');
ok(await fails(dec(await KR.get('default'),JSON.parse(store[keyFor('hm')]))) && await fails(dec(DK,JSON.parse(store[keyFor('hm')]))),'one set of books cannot be opened with another’s key, or with the master key directly');
ok(memPhotos.get(hpic).enc===2 && memPhotos.get(hpic).pid==='hm' && new Uint8Array((await photoLoad(hpic)).buf).join()==='4,4,4','photos are encrypted under the key of the books they belong to');
KR.set('hm2',KR.get('default')); P.list.push({id:'hm2',name:'X'}); dataReady=false; const pc0=P.current; P.current='hm2'; S=fresh(); S.tx.push({id:'zz',type:'in',amount:1,date:today()}); save(); await saveQ; ok(!store[keyFor('hm2')],'books that have not finished loading can never be saved over'); dataReady=true; P.current=pc0; P.list=P.list.filter(p=>p.id!=='hm2'); KR.delete('hm2'); await loadProfile();
await lockNow(); ok(DK===null && KR.size===0 && Object.keys(KEYS).length===0,'locking drops every key from memory');
$('#pinIn').value='owner-12'; await tryUnlock(); ok(S.tx[0].id==='homesecret' && KR.size===2,'the owner PIN opens ordinary books as before');
await switchProfile('default'); ok(S.tx[0].id==='bizsecret','and can switch between them');
// adding books while encrypted
addProfile(); F('kind','business'); F('name','Shop Two'); SAVE(); await saveQ; const s2=P.current;
ok(KEYS[s2] && JSON.parse(store[keyFor(s2)]).enc===2,'new books get their own key straight away'); S.items.push({id:'z',name:'Zed',num:1,qty:1,cost:1,price:2}); save(); await saveQ;
await lockNow(); $('#pinIn').value='owner-12'; await tryUnlock(); ok(P.current===s2 && S.items[0].name==='Zed','new books reopen after a lock'); await switchProfile('default');
// staff
staffForm(); F('who','Dana'); F('p1','owner-12'); PERMS.forEach(p=>FC('pm_'+p[0],false)); lastAlert=''; SAVE(); await wait(()=>/already in use/.test(lastAlert));
ok(/already in use/.test(lastAlert) && !(S.staff||[]).length,'a staff PIN cannot match the owner PIN');
F('p1','dana-1'); SAVE(); await wait(()=>(S.staff||[]).length===1); await saveQ;
ok(S.staff[0].who==='Dana' && Object.keys(S.staff[0].perms).length===0 && SEC.staff.length===1 && SEC.staff[0].pid==='default' && SEC.ssalt,'a staff member is added with their own PIN');
closeForm(); staffForm(); F('who','Eli'); F('p1','dana-1'); FC('pm_stock',true); FC('pm_stockEdit',true); FC('pm_owing',true); FC('pm_sales',true); FC('pm_refunds',true); lastAlert=''; SAVE(); await wait(()=>/already in use/.test(lastAlert));
ok(/already in use/.test(lastAlert) && S.staff.length===1,'two staff cannot share a PIN');
F('p1','eli-22'); SAVE(); await wait(()=>S.staff.length===2); await saveQ; closeForm();
ok(/Staff: 2 people/.test(V.more()) && /Manage staff/.test(V.more()),'More shows the staff for this business');
await lockNow(); const hdrBefore=store[PKEY]; $('#pinIn').value='dana-1'; await tryUnlock(); render();
ok(staffMode && staff.who==='Dana' && DK===null && KR.size===1 && P.list.length===1 && P.current==='default' && S.items[0].name==='Widget' && tab==='sell','a staff PIN unlocks its own business on the Sell screen');
ok(await fails(dec(await KR.get('default'),JSON.parse(store[keyFor('hm')]))) && await fails(dec(await KR.get('default'),JSON.parse(store[keyFor(s2)]))) && await fails(dec(await KR.get('default'),JSON.parse(store[PKEY]).body)),'staff hold no key for personal books, other businesses, or the list of books');
ok(await fails(photoLoad(hpic)),'staff cannot open photos from other books');
ok(staffTabs().join()==='sell' && (tab='stock',render(),tab==='sell') && (tab='more',render(),tab==='sell') && (tab='home',render(),tab==='sell'),'with no extra permissions, staff see only Sell');
const svd=V.sell(); ok(!/Today.s sales/.test(svd) && !/555/.test(svd) && /Dana · Lock/.test($('#hdr').innerHTML) && !/<select/.test($('#hdr').innerHTML),'no sales totals, and the top bar shows who is signed in');
$('#modal').innerHTML='x'; addTx('in'); editItem('a'); profiles(); customersSheet(); restock('a'); ok($('#modal').innerHTML==='x','staff cannot open owner-only forms');
ok((await backupText())===JSON.stringify(S,null,1) && (await backup(),true),'(staff backup is blocked at the door)');
cart=[{id:'a',qty:2,price:10}]; posPay='full'; posDisc=''; posCust=''; posDone(); await saveQ;
ok(S.tx[S.tx.length-1].by==='Dana' && S.items[0].qty===8 && store[PKEY]===hdrBefore,'a staff sale is saved and marked with their name, without touching the owner’s settings');
receipt(lastSale); ok(/Served by Dana/.test($('#modal').innerHTML) && !/Void sale|Return items/.test($('#modal').innerHTML),'receipt names the staff member; no void or return without permission'); closeForm();
await lockNow(); ok(!staffMode && staff===null && KR.size===0,'locking ends the staff session');
$('#pinIn').value='eli-22'; await tryUnlock(); render();
ok(staffMode && staff.who==='Eli' && staffTabs().join()==='sell,stock,debts','a second staff member has their own permissions');
tab='stock'; render(); ok(tab==='stock' && /Restock/.test(V.stock()) && !/Edit<\\/button>|Delete<\\/button>|Add product|Profit|Cost \\$/.test(V.stock()) && /Sells \\$10\\.00/.test(V.stock()),'stock permission shows prices and restock, not costs or editing');
tab='debts'; render(); const dv=V.debts(); ok(/Cust/.test(dv) && /Add payment/.test(dv) && !/Supplier|I owe|Add a debt|Edit<\\/button>/.test(dv),'owing permission shows what customers owe, not what the owner owes');
ok(/Today.s sales/.test(V.sell()) && /by Dana/.test(V.sell()),'sales permission shows today’s sales and who made them');
receipt(S.tx[S.tx.length-1].sale); ok(/Void sale/.test($('#modal').innerHTML) && /Return items/.test($('#modal').innerHTML),'refund permission allows returns and voids'); closeForm();
await lockNow(); $('#pinIn').value='owner-12'; await tryUnlock(); await switchProfile('default');
ok(!staffMode && DK && S.tx.some(t=>t.by==='Dana') && S.tx.some(t=>t.id==='bizsecret'),'the owner sees everything, including staff sales');
staffForm(S.staff[0].id); F('who','Dana'); F('p1',''); PERMS.forEach(p=>FC('pm_'+p[0],p[0]==='sales')); SAVE(); await wait(()=>S.staff.find(x=>x.who==='Dana').perms.sales); await saveQ; closeForm();
await lockNow(); $('#pinIn').value='dana-1'; await tryUnlock(); ok(staffMode && can('sales') && !can('stock'),'permissions can be changed without changing the PIN');
await lockNow(); $('#pinIn').value='owner-12'; await tryUnlock(); await switchProfile('default');
SEC.staff=SEC.staff.filter(x=>x.id!==S.staff.find(y=>y.who==='Dana').id); S.staff=S.staff.filter(x=>x.who!=='Dana'); save(); await saveQ;
await lockNow(); $('#pinIn').value='dana-1'; await tryUnlock(); ok(DK===null && !staffMode && els['#lock'].hidden===false,'a removed staff member’s PIN stops working');
$('#pinIn').value='owner-12'; await tryUnlock();
await changePin('owner-12','owner-13'); await lockNow(); $('#pinIn').value='eli-22'; await tryUnlock(); ok(staffMode && staff.who==='Eli','staff PINs survive an owner PIN change'); await lockNow();
// private PIN on the personal books
$('#pinIn').value='owner-13'; await tryUnlock(); await switchProfile('hm'); ok(isPersonal() && !/Manage staff/.test(V.more()) && /Set a private PIN/.test(V.more()),'personal books offer a private PIN, not staff');
privateForm(); F('p1','owner-13'); F('p2','owner-13'); lastAlert=''; SAVE(); await wait(()=>/different from your main PIN/.test(lastAlert)); ok(/different from your main PIN/.test(lastAlert) && !isPriv('hm'),'the private PIN must differ from the main PIN');
lastRec=''; F('p1','priv-1'); F('p2','priv-1'); SAVE(); await wait(()=>lastRec); await saveQ; const pcode=lastRec; closeForm();
ok(isPriv('hm') && !KEYS.hm && SEC.priv.hm.rec && /^([0-9A-HJKMNP-TV-Z]{4}-){7}/.test(pcode) && !/"hm"/.test(await dec(DK,JSON.parse(store[PKEY]).body).then(b=>JSON.stringify(JSON.parse(b).keys))),'setting a private PIN takes that key out of the owner’s reach and gives its own recovery key');
ok(S.tx[0].id==='homesecret' && /ON 🔒/.test(V.more()),'the books stay open for the rest of this session');
const pbk=JSON.parse(await backupText()); ok(pbk.stockpileBackup===3 && pbk.priv && !pbk.wrap && !pbk.pk,'a backup of private books is locked by the private PIN only');
await lockNow(); $('#pinIn').value='owner-13'; await tryUnlock(); render();
ok(DK && P.current==='hm' && needKey() && S.tx.length===0 && /have their own PIN/.test($('#view').innerHTML) && !/4321|private loan/.test($('#view').innerHTML) && /🔒 Home/.test($('#hdr').innerHTML),'after a lock, the main PIN opens the app but not the private books');
ok(await fails(dec(DK,JSON.parse(store[keyFor('hm')]))) && [...KR.keys()].join()!=='hm' && !KR.has('hm') && await fails(photoLoad(hpic)),'nothing the main PIN unlocks can decrypt the private books or their photos');
S.tx.push({id:'junk',type:'in',amount:1,date:today()}); const hmBefore=store[keyFor('hm')]; save(); await saveQ; ok(store[keyFor('hm')]===hmBefore,'while shut, nothing can be saved over the private books'); S=fresh();
ok(await fails(removeEnc('owner-13')) && SEC,'the main PIN cannot be removed while private books are shut');
ok(await fails(openBackup(pbk)) && await fails(openBackup(pbk,'owner-13')) && (await openBackup(pbk,'priv-1')).tx[0].id==='homesecret' && (await openBackup(pbk,pcode)).tx[0].id==='homesecret','the private backup opens with the private PIN or its recovery key, not the main PIN');
privUnlockForm(); F('pin','nope'); lastAlert=''; SAVE(); await wait(()=>/wrong/.test(lastAlert)); ok(/wrong/.test(lastAlert) && needKey(),'a wrong private PIN is refused');
F('pin','priv-1'); SAVE(); await wait(()=>!needKey()&&S.tx.length); ok(S.tx[0].id==='homesecret' && new Uint8Array((await photoLoad(hpic)).buf).join()==='4,4,4','the private PIN opens the books and their photos');
await switchProfile('default'); await switchProfile('hm'); ok(!needKey() && S.tx[0].id==='homesecret','no need to re-enter it until the app locks');
await lockNow(); $('#pinIn').value='owner-13'; await tryUnlock(); await switchProfile('default'); ok(S.tx.some(t=>t.id==='bizsecret') && !needKey(),'other books are unaffected'); await switchProfile('hm');
privRecoverForm(); F('code','AAAA-BBBB-CCCC-DDDD-EEEE-FFFF-GGGG-HHHH'); F('p1','priv-2'); F('p2','priv-2'); lastAlert=''; SAVE(); await wait(()=>/recovery key isn.t right/.test(lastAlert)); ok(/recovery key isn.t right/.test(lastAlert) && needKey(),'a wrong recovery key is refused');
F('code',pcode.toLowerCase()); SAVE(); await wait(()=>!needKey()&&S.tx.length,4000); await saveQ; ok(S.tx.length===1 && S.tx[0].id==='homesecret','the books’ own recovery key resets the private PIN without losing anything');
await lockNow(); $('#pinIn').value='owner-13'; await tryUnlock(); privUnlockForm(); F('pin','priv-1'); lastAlert=''; SAVE(); await wait(()=>lastAlert); ok(needKey(),'the old private PIN no longer works');
F('pin','priv-2'); SAVE(); await wait(()=>!needKey()&&S.tx.length); ok(S.tx[0].id==='homesecret','the new private PIN does');
// main recovery key still works, and does not open private books
await switchProfile('default'); await makeRecovery(); const mcode=lastRec; closeForm(); await lockNow(); await recoverWithKey(mcode,'owner-14');
ok(DK && KR.has('default') && !KR.has('hm') && S.tx.some(t=>t.id==='bizsecret'),'the main recovery key resets the main PIN, and still cannot open private books');
await switchProfile('hm'); privUnlockForm(); F('pin','priv-2'); SAVE(); await wait(()=>!needKey()&&S.tx.length);
await removePrivate(); await saveQ; ok(!isPriv('hm') && KEYS.hm,'the private PIN can be removed'); await lockNow(); $('#pinIn').value='owner-14'; await tryUnlock(); ok(P.current==='hm' && !needKey() && S.tx[0].id==='homesecret','then the main PIN opens those books again');
await switchProfile('default'); await delProfile(s2); await saveQ; ok(!KEYS[s2] && !P.list.some(p=>p.id===s2),'deleting books removes their key');
await removeEnc('owner-14'); ok(!SEC && /Widget/.test(store[KEY0]) && /homesecret/.test(store[keyFor('hm')]) && !memPhotos.get(hpic).enc,'removing the main PIN stores everything unlocked again');
// data saved by the previous version (one key for everything) is upgraded on unlock
await saveQ; saveGen++; KR=new Map(); KEYS={}; staff=null; staffMode=false; SEC=null;DK=null;LEGACY=null;S=fresh();P=defaultP();Object.keys(store).forEach(k=>delete store[k]);memPhotos.clear();thumbCache.clear();
const oraw=rnd(32), okey=await importDK(oraw), osalt=rnd(16);
const osec={salt:b64(osalt),iter:ITER,wrap:await enc(await pinKey('old-pin',osalt,ITER),b64(oraw)),staff:{salt:'x',iter:1,iv:'x',ct:'x'}};
store[PKEY]=JSON.stringify({sec:osec,body:await enc(okey,JSON.stringify({list:[{id:'default',name:'Biz'},{id:'p9',name:'Home',kind:'personal'}],current:'default'}))});
store[KEY0]=JSON.stringify({enc:1,...await enc(okey,JSON.stringify({tx:[{id:'o1',type:'in',amount:9,date:today(),pics:['oph']}],items:[],debts:[]}))});
store[keyFor('p9')]=JSON.stringify({enc:1,...await enc(okey,JSON.stringify({tx:[{id:'o2',type:'out',amount:3,date:today()}],items:[],debts:[]}))});
memPhotos.set('oph',{id:'oph',pid:'default',date:today(),w:1,h:1,size:3,enc:1,...await encBuf(okey,new Uint8Array([7,7,7]).buffer),th:await enc(okey,'data:image/jpeg;base64,CCCC')});
await init(); ok(els['#lock'].hidden===false && SEC && !DK,'(older data starts locked)');
$('#pinIn').value='old-pin'; await tryUnlock(); await saveQ;
ok(DK && S.tx[0].id==='o1' && SEC.v===2 && !SEC.staff && JSON.parse(store[KEY0]).enc===2 && JSON.parse(store[keyFor('p9')]).enc===2 && KEYS.default && KEYS.p9,'data from the previous version is upgraded to separate keys on first unlock');
ok(memPhotos.get('oph').enc===2 && new Uint8Array((await photoLoad('oph')).buf).join()==='7,7,7','older photos are upgraded too');
await switchProfile('p9'); ok(S.tx[0].id==='o2','every set of books survives the upgrade'); await lockNow(); $('#pinIn').value='old-pin'; await tryUnlock(); ok(S.tx[0].id==='o2' && isPersonal(),'and reopens normally afterwards');
await removeEnc('old-pin'); allTabs(); tab='home';

// ================= version 0.9.1: first open asks what the app is for =================
await saveQ; saveGen++; KR=new Map(); KEYS={}; staff=null; staffMode=false; SEC=null;DK=null;LEGACY=null;S=fresh();P=defaultP();Object.keys(store).forEach(k=>delete store[k]);memPhotos.clear();
await init(); ok(firstRun===true && /What would you like to keep track of/.test($('#view').innerHTML) && !/Welcome back/.test($('#view').innerHTML),'a brand-new install opens on the “what is this for” question');
chooseUse('personal'); ok(!firstRun && isPersonal() && profName()==='My money' && P.list.length===1 && !bizOn() && JSON.parse(store[PKEY]).biz===false,'choosing personal sets up personal books only');
tab='home'; showNums=false; render(); const pv1=$('#view').innerHTML+$('#hdr').innerHTML; ok(/Quick add/.test(pv1) && !/business|Sell|Stock/i.test(pv1.replace(/StockPile/g,'')),'nothing on the personal Home mentions business');
const pm=V.more(); ok(!/Stock list|Manage staff/.test(pm) && /<b>GST<\\/b>/.test(pm) && /hidden><b>GST/.test(pm) && /<b>Budgets<\\/b>/.test(pm) && /Money in and out for a year/.test(pm),'personal More shows budgets, and no GST, stock or staff');
addProfile(); ok(!/What is it for/.test($('#modal').innerHTML),'adding more books offers personal only'); F('name','Holiday fund'); SAVE(); ok(P.list.length===2 && P.list[1].kind==='personal' && isPersonal(),'extra personal books can be added');
yearSheet(); ok(/Left over/.test($('#modal').innerHTML) && !/Profit on sales|Cost of the goods/.test($('#modal').innerHTML) && csv(yearRows(yearSummary(today().slice(0,4)))).includes('Left over'),'personal year summary has no sales or profit lines'); closeForm();
P.biz=true; save(); addProfile(); ok(/What is it for/.test($('#modal').innerHTML) && /Show business features/.test(V.more()),'business features can be switched on later'); closeForm();
await init(); ok(!firstRun && isPersonal() && P.list.length===2 && bizOn(),'the question is only asked once, and choices are remembered');
await saveQ; saveGen++; SEC=null;DK=null;S=fresh();P=defaultP();Object.keys(store).forEach(k=>delete store[k]); await init(); chooseUse('both');
ok(P.list.length===2 && !isPersonal() && P.list[1].kind==='personal' && bizOn() && profName()==='My business','choosing both sets up business and personal books');
await saveQ; saveGen++; S=fresh();P=defaultP();Object.keys(store).forEach(k=>delete store[k]); await init(); chooseUse('business'); ok(P.list.length===1 && !isPersonal() && bizOn(),'choosing business sets up business books');
await saveQ; saveGen++; S=fresh();P=defaultP();Object.keys(store).forEach(k=>delete store[k]); await init(); chooseUse('personal'); await enableEnc('first-pin'); await lockNow(); $('#pinIn').value='first-pin'; await tryUnlock();
ok(isPersonal() && !bizOn() && !firstRun,'the personal-only choice survives a PIN and a lock'); await removeEnc('first-pin');
store[KEY0]=JSON.stringify({tx:[],items:[],debts:[]}); delete store[PKEY]; await init(); ok(!firstRun,'someone who already has data is never asked'); allTabs(); tab='home';

// version 3.0.1: backup file names carry the time, so same-day backups never collide
ok(/^\\d{4}-\\d{2}-\\d{2}-\\d{6}$/.test(stamp()) && stamp().startsWith(today()),'backup file names include the date and the time');

// ================= version 3.1.0: shared books merged between two phones =================
await saveQ; saveGen++; KR=new Map(); KEYS={}; staff=null; staffMode=false; SEC=null;DK=null;LEGACY=null;S=fresh();P=defaultP();Object.keys(store).forEach(k=>delete store[k]);memPhotos.clear();
const PH={}; let curPh=''; const usePh=n=>{ if(curPh) PH[curPh]={S,baseSnap,DEV}; curPh=n; ({S,baseSnap,DEV}=PH[n]); };
const copyOf=o=>JSON.parse(JSON.stringify(o)), ids=a=>a.map(x=>x.id).sort().join(), same=()=>{ const a=PH.A.S,b=PH.B.S; return ids(a.tx)===ids(b.tx) && ids(a.items)===ids(b.items) && ids(a.debts)===ids(b.debts) && a.items.every(i=>b.items.find(j=>j.id===i.id).qty===i.qty) && JSON.stringify(a.tx.map(t=>[t.id,t.note,t.amount]).sort())===JSON.stringify(b.tx.map(t=>[t.id,t.note,t.amount]).sort()); };
const syncAB=()=>{ usePh('A'); const pa=copyOf(sharePayload()); usePh('B'); const pb=copyOf(sharePayload()); const nb=mergeInto(pa); save(); usePh('A'); const na=mergeInto(pb); save(); return [na,nb]; };
// phone A starts the books and shares them
DEV='phonea'; S=fresh(); S.items.push({id:'w',name:'Widget',num:1,qty:10,cost:5,price:10},{id:'g',name:'Gadget',num:2,qty:4,cost:2,price:5});
S.tx.push({id:'a1',type:'out',amount:20,cat:'Gas',note:'fill up',acct:'cash',gst:0,date:today()}); S.debts.push({id:'dj',name:'Joe',dir:'owed',amount:100,date:today(),payments:[]}); S.budgets={Fuel:50};
baseSnap=null; save(); S.share={id:'sh1',pass:'household'}; save();
ok(S.items[0].q.phonea.n===10 && S.gone && S.mm && qtyOf(S.items[0])===10,'stock counts are tracked per phone from the start');
PH.A={S,baseSnap,DEV}; curPh='A';
PH.B={S:Object.assign(clean(copyOf(sharePayload())),{share:{id:'sh1',pass:'household'}}),baseSnap:null,DEV:'phoneb'}; usePh('B'); prepSync(); takeSnap();
ok(ids(S.tx)==='a1' && S.items[0].qty===10 && !S.staff.length,'the second phone joins with a full copy of the books');
// both phones work separately
usePh('A'); recordSale([{it:S.items[0],qty:3,price:10}],{pay:'full',acct:'cash'}); S.tx.find(t=>t.id==='a1').note='fill up (truck)'; save();
usePh('B'); recordSale([{it:S.items[0],qty:2,price:10}],{pay:'full',acct:'cash'}); S.tx.push({id:'b1',type:'out',amount:7,cat:'Food',note:'lunch',acct:'cash',gst:0,date:today()}); S.items[1].qty+=6; save();
ok(PH.A.S.items[0].qty===7 && S.items[0].qty===8,'(each phone only knows its own sales so far)');
let [na,nb]=syncAB();
ok(same() && PH.A.S.items[0].qty===5 && PH.A.S.items[1].qty===10 && PH.A.S.tx.length===4,'after swapping updates both phones match, and stock reflects sales and restocks from both');
ok(na===2 && nb===1 && PH.B.S.tx.find(t=>t.id==='a1').note==='fill up (truck)','each phone reports what was new, and an edit travels across');
[na,nb]=syncAB(); ok(same() && na===0 && nb===0 && PH.A.S.items[0].qty===5,'merging the same update again changes nothing');
// deletions
usePh('A'); S.tx=S.tx.filter(t=>t.id!=='b1'); save(); syncAB(); ok(same() && !PH.B.S.tx.some(t=>t.id==='b1'),'a deletion on one phone removes the entry on the other');
syncAB(); ok(!PH.A.S.tx.some(t=>t.id==='b1') && !PH.B.S.tx.some(t=>t.id==='b1'),'and a deleted entry does not come back');
usePh('A'); S.tx=S.tx.filter(t=>t.id!=='a1'); save(); await tick(5); usePh('B'); S.tx.find(t=>t.id==='a1').amount=25; save(); syncAB();
ok(same() && PH.A.S.tx.find(t=>t.id==='a1').amount===25,'an entry edited on one phone after being deleted on the other is kept, not lost');
// payments from both sides
usePh('A'); S.debts[0].payments.push({amount:30,date:today()}); save(); usePh('B'); S.debts[0].payments.push({amount:20,date:today()}); save(); syncAB();
ok(same() && PH.A.S.debts[0].payments.length===2 && bal(PH.A.S.debts[0])===50 && bal(PH.B.S.debts[0])===50,'payments recorded on both phones are both kept');
// both phones add a different product under the same item number
usePh('A'); S.items.push({id:'na',name:'New A',num:3,qty:1,cost:1,price:2}); save(); await tick(5); usePh('B'); S.items.push({id:'nb',name:'New B',num:3,qty:2,cost:1,price:2}); save(); syncAB(); syncAB();
const nums=PH.A.S.items.map(i=>i.num).sort().join(); ok(same() && new Set(PH.A.S.items.map(i=>i.num)).size===4 && nums===PH.B.S.items.map(i=>i.num).sort().join(),'two products given the same item number are separated');
// settings and budgets: the latest change wins
usePh('A'); S.budgets={Fuel:60}; save(); await tick(5); usePh('B'); S.budgets={Fuel:80,Pets:20}; save(); syncAB(); ok(PH.A.S.budgets.Fuel===80 && PH.A.S.budgets.Pets===20 && PH.B.S.budgets.Fuel===80,'for budgets, the most recent change wins on both phones');
// a product deleted on one phone while the other sold it
usePh('B'); S.contacts.push({key:'amy',name:'Amy',phone:'1',email:'',promo:false}); save(); syncAB(); usePh('A'); ok(S.contacts.length===1,'customers travel too');
S.contacts=[]; save(); syncAB(); ok(PH.B.S.contacts.length===0,'and so does removing one');
// who added what
store[MKEY]='Rick'; usePh('A'); S.tx.push({id:'who1',type:'out',amount:3,cat:'Food',acct:'cash',gst:0,date:today()}); save(); ok(S.tx.find(t=>t.id==='who1').by==='Rick','entries on shared books are marked with who added them');
store[MKEY]='Sam'; usePh('B'); S.tx.push({id:'who2',type:'out',amount:4,cat:'Food',acct:'cash',gst:0,date:today()}); save(); syncAB(); ok(PH.A.S.tx.find(t=>t.id==='who2').by==='Sam' && PH.B.S.tx.find(t=>t.id==='who1').by==='Rick' && /by Sam/.test((usePh('A'),showNums=true,moneyFilter='all',moneyView='list',V.money())),'and the name shows on the other phone');
// device-only things do not travel
usePh('A'); S.staff=[{id:'s1',who:'Dana',perms:{}}]; S.lastBackup=today(); const pay=sharePayload(); ok(!('staff' in pay) && !('lastBackup' in pay) && !('share' in pay) && !('dirty' in pay),'staff lists, backup dates and the sharing password stay off the shared copy'); S.staff=[];
// the file itself
const ftext=await shareFileText(), fobj=JSON.parse(ftext);
ok(fobj.stockpileShare===1 && fobj.id==='sh1' && !/Widget|fill up|household/.test(ftext),'the sharing file is locked and shows nothing readable');
ok(await fails(openShare(fobj,'wrong-pass')) && (await openShare(fobj,'household')).items.length===4 && await fails(openShare({nope:1},'x')),'it opens only with the sharing password');
// merging through the file on phone B
usePh('A'); S.tx.push({id:'viafile',type:'in',amount:11,cat:'Sales',acct:'cash',gst:0,date:today()}); const f2=await shareFileText(); usePh('B'); P=defaultP(); shareMode='merge'; lastAlert=''; await onShareFile(f2);
ok(S.tx.some(t=>t.id==='viafile') && /Merged/.test(lastAlert) && /1 new entry/.test(lastAlert),'“Merge an update” brings in the other phone’s entries');
const wrong=JSON.stringify({...JSON.parse(f2),id:'other'}); lastAlert=''; await onShareFile(wrong); ok(/different books/.test(lastAlert),'an update for different books is refused');
lastAlert=''; await onShareFile('{"tx":[]}'); ok(/isn.t a StockPile sharing file/.test(lastAlert),'a backup file is not mistaken for a sharing file');
// joining from the file on a third phone
await saveQ; saveGen++; S=fresh(); P=defaultP(); baseSnap=null; DEV='phonec'; Object.keys(store).forEach(k=>delete store[k]); save();
shareMode='join'; await onShareFile(f2); F('me','Kim'); F('pass','nope'); lastAlert=''; SAVE(); await wait(()=>/password is wrong/.test(lastAlert)); ok(/password is wrong/.test(lastAlert) && P.list.length===1,'joining needs the right sharing password');
F('pass','household'); SAVE(); await wait(()=>P.list.length===2); await tick(150);
ok(P.list[1].share==='sh1' && P.current===P.list[1].id && S.share.id==='sh1' && S.items.length===4 && S.tx.some(t=>t.id==='viafile') && store[MKEY]==='Kim' && /⇄/.test((render(),$('#hdr').innerHTML)),'joining adds the shared books to the new phone as their own set');
shareMode='join'; lastAlert=''; await onShareFile(f2); ok(/already have these shared books/.test(lastAlert),'the same books cannot be joined twice');
ok(/Send update/.test(V.more()) && /Merge an update/.test(V.more()),'shared books show Send and Merge under More');
stopShare(); ok(!S.share && !P.list[1].share && /Join shared books/.test(V.more()),'sharing can be stopped without losing entries');
// shared books survive a PIN, and restoring a backup does not delete the other phone's entries
usePh('A'); P=defaultP(); const beforeR=S.tx.length; const bkS=JSON.stringify(S); S.tx.push({id:'later',type:'in',amount:1,cat:'Sales',acct:'cash',gst:0,date:today()}); save();
applyBackup(JSON.parse(bkS)); ok(S.tx.length===beforeR && S.share && !S.gone.later,'restoring an older backup does not mark newer entries as deleted');
ok(clean(copyOf(S)).items[0].q && clean(copyOf(S)).share.pass==='household' && Object.keys(clean(copyOf(S)).gone).length>0,'sharing details survive save and reload');
ok(Object.keys(clean({gone:{'<img src=x>':5,ok1:9},items:[{id:'i',name:'n',q:{'<x>':{n:1,v:1},good:{n:'2',v:'3'}}}]}).gone).join()==='ok1' && JSON.stringify(clean({items:[{id:'i',name:'n',q:{'<x>':{n:1,v:1},good:{n:'2',v:'3'}}}]}).items[0].q)==='{"good":{"n":2,"v":3}}','sharing data from a file is cleaned like everything else');
allTabs(); tab='home'; moneyFilter='month'; showNums=false;

// ================= version 3.2.0: live link over local Wi-Fi =================
// pairing codes
const sdpS='v=0\\r\\no=- 46117327 2 IN IP4 127.0.0.1\\r\\ns=-\\r\\nt=0 0\\r\\na=group:BUNDLE 0\\r\\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\\r\\nc=IN IP4 0.0.0.0\\r\\na=candidate:1 1 udp 2113937151 192.168.1.23 54321 typ host generation 0\\r\\na=candidate:2 1 tcp 1518280447 192.168.1.23 9 typ host tcptype active\\r\\na=candidate:3 1 udp 2113939711 fe80::1c2:33ff:fe44:5566 54322 typ host\\r\\na=ice-ufrag:abcd\\r\\na=ice-pwd:0123456789abcdefghijklmn\\r\\na=fingerprint:sha-256 AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99\\r\\na=setup:actpass\\r\\na=mid:0\\r\\na=sctp-port:5000\\r\\n';
ok((await unsqueeze(await squeeze('héllo ✓ '.repeat(50))))==='héllo ✓ '.repeat(50),'pairing data survives being squeezed and unsqueezed');
const tsdp=trimSDP(sdpS); ok(/192\\.168\\.1\\.23 54321/.test(tsdp) && !/ tcp /.test(tsdp) && !/fe80/.test(tsdp) && /a=fingerprint/.test(tsdp) && tsdp.endsWith('\\r\\n'),'the pairing code keeps the local Wi-Fi address and drops what the link does not need');
const pcode2=await packDesc({type:'offer',sdp:sdpS}), back=await unpackDesc(pcode2);
ok(pcode2.startsWith('SPL1:') && pcode2.length<700 && back.type==='offer' && back.sdp===tsdp,'a pairing code round-trips and is short enough to scan');
ok(await fails(unpackDesc('https://example.com')) && await fails(unpackDesc('SPL1:'+await squeeze('{"t":"evil","s":1}'))),'anything that is not a pairing code is refused');
const qm=qrMatrix(pcode2); ok(qm && qm.length===qm[0].length && qm.length<=89 && qm[0][0] && qm[0][6] && !qm[0][7] && qm[qm.length-1][0] && /^<svg/.test(qrSVG(pcode2)),'the pairing code is drawn as a QR code');
ok(qrMatrix('x'.repeat(40)).length===29 && qrMatrix('x'.repeat(800))===null && qrSVG('x'.repeat(800))==='','QR size grows with the content and stops at a scannable limit');
require('fs').writeFileSync(require('os').tmpdir()+'/qr-final.json',JSON.stringify([pcode2,'SPL1:'+'Zz9+/'.repeat(120)].map(s=>[s,qrMatrix(s)])));
// long messages are cut up and rejoined
link={buf:{}}; const longMsg='M'.repeat(150000)+'end', fr=linkFrames(longMsg); let joined=null; for(const f of [fr[2],fr[0],fr[1]]) joined=linkJoin(f)??joined;
ok(fr.length===3 && joined===longMsg && linkFrames('short').length===1 && linkJoin('short')==='short','long updates are split for the link and rejoined in any order'); link=null;
// two phones over a pretend link
await saveQ; saveGen++; KR=new Map(); KEYS={}; staff=null; staffMode=false; SEC=null;DK=null;LEGACY=null;S=fresh();P=defaultP();Object.keys(store).forEach(k=>delete store[k]);
DEV='tilla'; S=fresh(); S.items.push({id:'w',name:'Widget',num:1,qty:20,cost:5,price:10,low:0}); baseSnap=null; save(); S.share={id:'shL',pass:'tillpass'}; save();
PH.A={S,baseSnap,DEV}; curPh='A'; PH.B={S:Object.assign(clean(copyOf(sharePayload())),{share:{id:'shL',pass:'tillpass'}}),baseSnap:null,DEV:'tillb'}; usePh('B'); prepSync(); takeSnap(); save();
usePh('A'); ok(canonSig(sharePayload())===canonSig(PH.B.S && (usePh('B'),sharePayload())),'two phones holding the same books get the same fingerprint');
const LK=await shareKey('tillpass',new Uint8Array(16)), QA=[], QB=[];
const LA={open:true,id:'shL',key:LK,dc:{readyState:'open',send:m=>QB.push(m)},buf:{},echo:0,count:0}, LB={open:true,id:'shL',key:LK,dc:{readyState:'open',send:m=>QA.push(m)},buf:{},echo:0,count:0};
const pump=async()=>{ let r=0; while((QA.length||QB.length)&&r<30){ r++; if(QB.length){ usePh('B'); link=LB; for(const m of QB.splice(0)) await linkOnMessage(m); } if(QA.length){ usePh('A'); link=LA; for(const m of QA.splice(0)) await linkOnMessage(m); } } return r; };
usePh('A'); link=LA; recordSale([{it:S.items[0],qty:3,price:10}],{pay:'full',acct:'cash'}); save(); await linkSendNow();
ok(QB.length===1 && !/Widget/.test(QB[0]),'a sale on one till is sent to the other, encrypted');
let rounds=await pump(); ok(same() && PH.A.S.items[0].qty===17 && PH.B.S.items[0].qty===17 && rounds<=2 && !QA.length && !QB.length,'the other till shows the sale and the stock drop, and the exchange settles');
usePh('B'); link=LB; recordSale([{it:S.items[0],qty:2,price:10}],{pay:'full',acct:'cash'}); save(); await linkSendNow(); usePh('A'); link=LA; recordSale([{it:S.items[0],qty:4,price:10}],{pay:'full',acct:'cash'}); save(); await linkSendNow();
rounds=await pump(); ok(same() && PH.A.S.items[0].qty===11 && PH.B.S.items[0].qty===11 && PH.A.S.tx.length===3 && rounds<=4,'sales rung up on both tills at the same moment both count');
usePh('A'); link=LA; await linkSendNow(); ok(!QB.length,'nothing is sent when the other till is already up to date');
usePh('A'); link=LA; S.tx=S.tx.slice(1); save(); await linkSendNow(); await pump(); ok(same() && PH.B.S.tx.length===2,'a deletion carries over the link');
// wrong books and wrong password are refused
usePh('B'); link={...LB,key:null,open:false}; lastAlert=''; await linkOnMessage(JSON.stringify({t:'h',id:'other-books',salt:b64(rnd(16))})); ok(link===null && /different books/.test(lastAlert),'a link to different books is refused');
const badKey=await shareKey('not-the-pass',new Uint8Array(16)); usePh('A'); link=LA; S.tx.push({id:'zz9',type:'in',amount:1,cat:'Sales',acct:'cash',gst:0,date:today()}); save(); LA.sentSig=''; await linkSendNow();
usePh('B'); link={...LB,key:badKey}; lastAlert=''; for(const m of QB.splice(0)) await linkOnMessage(m); ok(link===null && /passwords.*do not match/.test(lastAlert) && !S.tx.some(t=>t.id==='zz9'),'a link with a different sharing password is refused and nothing is merged');
QA.length=0; QB.length=0; link=null;
usePh('A'); P=defaultP(); tab='sell'; ok(/Link tills/.test(V.sell()) && /Live link/.test(V.more()),'shared books offer the live link on the Sell screen and under More'); link={open:true}; render(); ok(/🔗/.test($('#hdr').innerHTML) && /Linked/.test(V.sell()),'a linked till shows it at the top'); link=null; render();
linkSheet(); ok(/Start on this phone/.test($('#modal').innerHTML) && /experimental/.test($('#modal').innerHTML),'the link screen explains the two steps'); closeForm();
allTabs(); tab='home';
})().catch(e=>{console.log('CRASH',e);process.exitCode=1});
`;
const html=fs.readFileSync(process.argv[2]?require('path').resolve(process.argv[2]):require('path').join(__dirname,'..','beta','index.html'),'utf8');
const app=html.match(/<script>([\s\S]*)<\/script>/)[1];
eval(app+test);
