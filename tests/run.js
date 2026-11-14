// StockPile checks. Run with:  node tests/run.js
// Loads the app's code from index.html with a minimal fake browser and real cryptography,
// then exercises money, stock, selling, debts, encryption, backups, recovery and barcodes.
// Prints one line per check; exits with an error if any check fails.
const fs=require('fs');
const mk=()=>({hidden:true,value:'',style:{},classList:{toggle(){},add(){}},dataset:{},focus(){},click(){},remove(){},querySelector:()=>null,textContent:'',innerHTML:'',disabled:false});
const els={};
global.document={querySelector:s=>els[s]||(els[s]=mk()),querySelectorAll:()=>[],getElementById:s=>mk(),addEventListener(){},createElement:()=>mk(),body:{appendChild(){}},hidden:false};
global.window={scrollTo(){}};global.location={protocol:'file:'};
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
const rt2=reminderText('Dana',50,'2026-12-01'); ok(/Hi Dana, a friendly reminder from My business: \\$50\\.00 is still owing, due Dec/.test(rt2),'reminder wording is right');
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
})().catch(e=>{console.log('CRASH',e);process.exitCode=1});
`;
const html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const app=html.match(/<script>([\s\S]*)<\/script>/)[1];
eval(app+test);
