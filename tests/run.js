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
await ready;
S.items.push({id:'a',name:'SecretWidget',cost:5,price:12,qty:3,low:5});
S.tx.push({id:'t1',type:'in',amount:105,cat:'Sales',cust:'Bob',acct:'bank',gst:5,date:today(),cogs:40});
save(); P.list[0].name='Hidden Biz';
P.list.push({id:'p2',name:'Second Biz'}); P.current='p2'; S=fresh(); S.tx.push({id:'z1',type:'out',amount:9,cat:'Gas',acct:'cash',date:today()}); save();
await switchProfile('default');
ok(/SecretWidget/.test(store[KEY0]) && S.items.length===1,'plain mode stores readable data');
await enableEnc('123456');
const all=()=>Object.keys(store).map(k=>store[k]).join('|');
ok(!/SecretWidget|Bob|Hidden Biz|Second Biz|Gas/.test(all()),'after PIN: nothing readable in storage (data + business names)');
ok(JSON.parse(store[PKEY]).sec && JSON.parse(store[keyFor('p2')]).enc===1,'header + other business encrypted');
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
ok(bd.stockpileBackup===2 && !/SecretWidget|Bob/.test(bk),'backup file is encrypted');
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
const keep=DK; DK=null; let np=false; try{ await openBackup(bd) }catch(e){ np=e.message==='needpin' } ok(np,'backup elsewhere asks for PIN');
let wp=false; try{ await openBackup(bd,'wrong') }catch(e){wp=true} ok(wp,'backup rejects wrong PIN');
ok((await openBackup(bd,'123456')).tx.length===2,'backup opens with the PIN from when it was made'); DK=keep;
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
ok(Object.keys(store).length===0 && !SEC && S.tx.length===0,'forgot PIN erases everything');

// recovery key
store[PKEY]&&0; SEC=null;DK=null;LEGACY=null;S=fresh();P=defaultP();Object.keys(store).forEach(k=>delete store[k]);
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
const k2=DK; DK=null; ok((await openBackup(bk2,code)).items.length===1,'recovery key also opens a locked backup'); DK=k2;
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
ok(VERSION>=7 && V.more().includes('version '+VERSION),'version number shows under More');
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
SEC=null;DK=null;LEGACY=null;S=fresh();P=defaultP();Object.keys(store).forEach(k=>delete store[k]);
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
ok(/Recurring expenses/.test(V.more()) && /Rent/.test(V.more()) && clean(JSON.parse(JSON.stringify(S))).rec.length===3,'recurring bills list under More and survive reload');
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
// staff PIN
S=mk11(); S.tx.push({id:'priv',type:'in',amount:777,cat:'Sales',acct:'cash',gst:0,date:today(),cogs:1,qty:1}); save();
await enableEnc('owner-1'); const st=rnd(16); SEC.staff={salt:b64(st),iter:ITER,...await enc(await pinKey('staff-1',st,ITER),b64(await crypto.subtle.exportKey('raw',DK)))}; save(); await saveQ;
await lockNow(); $('#pinIn').value='staff-1'; await tryUnlock();
ok(DK && staffMode===true && tab==='sell' && els['#lock'].hidden===true,'staff PIN unlocks into staff mode');
tab='more'; render(); ok(tab==='sell','staff mode cannot leave the Sell screen');
const sv=V.sell(); ok(!/Today.s sales/.test(sv) && !/777/.test(sv) && /Staff mode/.test(sv),'staff mode hides sales totals');
cart=[{id:'a',qty:1,price:10}]; posPay='full'; posDisc=''; posDone(); await saveQ; ok(S.tx.length===2 && S.items[0].qty===19,'staff can ring up a sale');
receipt(lastSale); ok(!/Void sale/.test($('#modal').innerHTML) && !/Return items/.test($('#modal').innerHTML),'staff cannot void or return'); closeForm();
await lockNow(); ok(staffMode===false,'locking ends staff mode'); $('#pinIn').value='nope'; await tryUnlock(); ok(DK===null,'wrong PIN still rejected with a staff PIN set');
$('#pinIn').value='owner-1'; await tryUnlock(); ok(DK && staffMode===false && S.tx.length===2,'owner PIN opens everything, including the staff sale');
ok(/Staff PIN: set/.test(V.more()),'settings show the staff PIN');
setStaffPin(); F('p1','owner-1'); F('p2','owner-1'); lastAlert=''; SAVE(); await tick(1500); ok(/different from your own/.test(lastAlert),'staff PIN must differ from the owner PIN');
await changePin('owner-1','owner-2'); await lockNow(); $('#pinIn').value='staff-1'; await tryUnlock(); ok(staffMode===true,'staff PIN survives an owner PIN change'); await lockNow();
$('#pinIn').value='owner-2'; await tryUnlock(); removeStaffPin(); await saveQ; ok(!SEC.staff,'staff PIN can be removed'); await removeEnc('owner-2');
allTabs(); tab='home'; staffMode=false;

// ================= version 11.1: personal books, budgets, receipt photos =================
SEC=null;DK=null;LEGACY=null;S=fresh();P=defaultP();Object.keys(store).forEach(k=>delete store[k]);memPhotos.clear();thumbCache.clear();pendingPics=[];
ok(!isPersonal() && categories('out').includes('Supplies'),'business books keep business categories');
P.list.push({id:'home1',name:'Home',kind:'personal'}); P.current='home1'; S=fresh(); sanitizeP();
ok(isPersonal() && P.list[1].kind==='personal' && categories('out')[0]==='Groceries' && categories('in')[0]==='Pay','personal books use household categories');
tab='sell'; render(); ok(tab==='home','personal books have no Sell or Stock screen');
showNums=false; let ph=V.home(); ok(/Quick add/.test(ph) && /Groceries/.test(ph) && /Snap a receipt/.test(ph) && !/\\$\\d/.test(ph),'personal Home opens private, with quick-add categories');
addTx('out',null,{cat:'Fuel'}); ok(/value="Fuel"/.test($('#modal').innerHTML) && /id="picStrip"/.test($('#modal').innerHTML) && !/Customer/.test($('#modal').innerHTML),'tapping a category opens the entry with it filled in');
F('amount',120); F('cat','Groceries'); F('note','Save-On'); F('acct','bank'); F('date',today()); SAVE();
S.tx.push({id:'pp2',type:'out',amount:40,cat:'Fuel',acct:'cash',gst:0,date:today()},{id:'pp3',type:'in',amount:900,cat:'Pay',acct:'bank',gst:0,date:today()});
S.budgets={Groceries:100,Fuel:200}; showNums=true; ph=V.home();
ok(/\\$120\\.00 of \\$100\\.00/.test(ph) && /\\$40\\.00 of \\$200\\.00/.test(ph) && /Spending in/.test(ph) && !/Profit on sales|Stock value/.test(ph),'personal summary shows spending against budgets, no business figures');
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
ok(raw1.enc===1 && !raw1.thumb && new Uint8Array(raw1.buf).join()!=='9,8,7,6,5','setting a PIN encrypts the stored photos');
pl=await photoLoad(pid1); ok(new Uint8Array(pl.buf).join()==='9,8,7,6,5' && pl.thumb===TH,'encrypted photos open normally while unlocked');
const pid3=await photoSave({buf:bytes,thumb:TH}); ok(memPhotos.get(pid3).enc===1,'new photos are encrypted too'); await photoDel(pid3);
const bkp=await backupText(true,true), bko=JSON.parse(bkp); ok(bko._photos.length===1 && bko._photos[0].id===pid1 && bko._photos[0].b64===b64(bytes),'“back up with photos” includes the pictures');
ok(!JSON.parse(await backupText(true))._photos,'ordinary backups leave photos out');
const lockedB=await backupText(false,true); ok(!lockedB.includes(b64(bytes)) && JSON.parse(lockedB).stockpileBackup===2,'a locked backup with photos is encrypted');
await lockNow(); ok(thumbCache.size===0,'locking clears photo previews from memory'); $('#pinIn').value='pin-photo'; await tryUnlock();
await removeEnc('pin-photo'); ok(!memPhotos.get(pid1).enc && new Uint8Array(memPhotos.get(pid1).buf).join()==='9,8,7,6,5','removing the PIN stores photos unlocked again');
memPhotos.clear(); bko._photos.push({id:'<evil>',b64:'AAAA'},{id:'x9',b64:5},null); applyBackup(bko); await tick(50);
ok(memPhotos.size===1 && (await photoLoad(pid1)) && new Uint8Array((await photoLoad(pid1)).buf).join()==='9,8,7,6,5' && /receipt photo/.test(lastAlert),'restoring a backup with photos brings the pictures back, and ignores bad ones');
const ptx2=S.tx.find(t=>t.pics); delTx(ptx2.id); await tick(20); ok(!(await PS.get(pid1)) && rcAll().length===0,'deleting an entry deletes its photo');
// reading a receipt
const R1=parseReceipt('SAVE-ON-FOODS\\nMaple Ridge BC\\n2026-11-12 14:32\\nMILK 4.99\\nBREAD 3.49\\nSUBTOTAL 8.48\\nGST 0.00\\nTOTAL 8.48\\nVISA 8.48');
ok(R1.amount===8.48 && R1.date==='2026-11-12' && R1.note==='SAVE-ON-FOODS' && R1.cat==='Groceries' && R1.read===true,'a grocery receipt reads as store, date, total and category');
const R2=parseReceipt('PETRO-CANADA\\nNov 3, 2026\\nREGULAR 41.2 L\\nFUEL SALE $62.10\\nTOTAL\\n$62.10');
ok(R2.amount===62.1 && R2.date==='2026-11-03' && R2.cat==='Fuel','a fuel receipt with the total on the next line reads correctly');
const R3=parseReceipt('Corner Store\\nGUM 1.25\\nCHIPS 2.75\\nTAX 0.20\\nCASH 4.20'); ok(R3.amount===4.2 && !R3.cat && !R3.date,'with no TOTAL line it takes the largest amount and leaves the rest blank');
ok(Object.keys(parseReceipt('')).length===0 && (await readReceipt({}))===null,'an unreadable photo fills in nothing');
ok(guessCat('BC HYDRO payment')==='Hydro' && guessCat('FortisBC')==='Natural gas' && guessCat('TELUS Mobility')==='Phone & internet' && guessCat('Tim Hortons #123')==='Eating out' && guessCat('random')==='','store names suggest a category');
ok(guessCat('Espresso Bar')==='' && guessCat('Taco Bell')==='Eating out' && guessCat('Corona Flowers')==='' && guessCat('Canadian Tire')==='Household' && guessCat('ESSO 1234')==='Fuel','category guesses avoid look-alike words');
addTx('out',null,R1); ok(/Filled in from the photo/.test($('#modal').innerHTML) && /value="8.48"/.test($('#modal').innerHTML) && /value="2026-11-12"/.test($('#modal').innerHTML),'a read receipt pre-fills the entry and asks you to check it'); closeForm();
// business books still get receipts
P.current='default'; S=fresh(); S.tx.push({id:'bz',type:'out',amount:5,cat:'Supplies',acct:'cash',gst:0,date:today(),pics:['zz1']}); tab='money'; moneyFilter='all';
ok(!isPersonal() && /📎 Receipts/.test(V.money()) && /Customers/.test(V.debts()),'business books get a Receipts button and keep Customers'); moneyFilter='month';
showNums=false; ok(/Welcome back/.test(V.home()) && !/Quick add/.test(V.home()),'business Home is unchanged');
allTabs(); V.receipts(); tab='home';

// version 11.2: switch books from a drop-down at the top
SEC=null;DK=null;LEGACY=null;S=fresh();P=defaultP();Object.keys(store).forEach(k=>delete store[k]);
P.list.push({id:'h2',name:'Home & <Family>',kind:'personal'}); S.tx.push({id:'biz1',type:'in',amount:5,cat:'Sales',acct:'cash',gst:0,date:today()}); save(); render();
let hd=$('#hdr').innerHTML; ok(/<select id="profSel"/.test(hd) && /<option value="default" selected>My business<\\/option>/.test(hd) && /<option value="h2" >Home &amp; &lt;Family&gt; \\(personal\\)<\\/option>/.test(hd) && !/profiles\\(\\)/.test(hd),'the top bar is a drop-down listing every set of books');
await switchProfile('h2'); ok(P.current==='h2' && isPersonal() && S.tx.length===0 && /<option value="h2" selected>/.test($('#hdr').innerHTML),'picking one from the drop-down switches to it');
await switchProfile('default'); ok(S.tx.length===1 && /Add, rename or delete books/.test(V.more()),'adding and managing books lives under More');
staffMode=true; render(); ok(!/<select/.test($('#hdr').innerHTML) && /Lock/.test($('#hdr').innerHTML),'staff mode shows Lock in place of the drop-down'); staffMode=false; tab='home'; render();
})().catch(e=>{console.log('CRASH',e);process.exitCode=1});
`;
const html=fs.readFileSync(process.argv[2]?require('path').resolve(process.argv[2]):require('path').join(__dirname,'..','beta','index.html'),'utf8');
const app=html.match(/<script>([\s\S]*)<\/script>/)[1];
eval(app+test);
