let items=[]; let selectedType='income'; let deferredPrompt=null;
const money=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(n)||0);
const $=s=>document.querySelector(s);
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2500)}
async function load(){try{const r=await fetch('/api/items');items=await r.json();render()}catch(e){toast('Não foi possível carregar os dados.');}}
function render(){
 const inc=items.filter(x=>x.type==='income').reduce((s,x)=>s+x.amount,0);
 const exp=items.filter(x=>x.type!=='income').reduce((s,x)=>s+x.amount,0);
 const inst=items.filter(x=>x.type==='installment').reduce((s,x)=>s+x.amount,0);
 $('#income').textContent=money(inc); $('#expense').textContent=money(exp); $('#balance').textContent=money(inc-exp); $('#installmentTotal').textContent=money(inst);
 renderList('#recentList',items.slice(0,5),true); renderList('#allList',items,false); renderList('#installmentList',items.filter(x=>x.type==='installment'),false); renderUpcoming(); renderCategories();
}
function renderList(sel,list,compact){const el=$(sel);if(!list.length){el.innerHTML='<div class="empty">Nenhum lançamento cadastrado ainda.</div>';return}el.innerHTML=list.map(x=>row(x,compact)).join('')}
function row(x,compact){const sign=x.type==='income'?'+':'−';const cls=x.type==='income'?'in':'out';const icon=x.type==='income'?'↗':x.type==='installment'?'▣':'↘';return '<div class="row"><div class="row-main"><div class="row-icon">'+icon+'</div><div><div class="row-title">'+esc(x.description)+'</div><div class="row-meta">'+esc(x.category||'Outros')+(x.date?' · '+formatDate(x.date):'')+(x.type==='installment'?' · '+x.currentInstallment+'/'+x.totalInstallments:'')+'</div></div></div><div style="display:flex;align-items:center;gap:12px"><span class="amount '+cls+'">'+sign+' '+money(x.amount)+'</span>'+(!compact?'<button class="danger" onclick="removeItem(\''+x._id+'\')">Excluir</button>':'')+'</div></div>'}
function renderUpcoming(){const list=items.filter(x=>x.type!=='income').slice(0,4);renderList('#upcomingList',list,true)}
function renderCategories(){const map={};items.filter(x=>x.type!=='income').forEach(x=>map[x.category]=(map[x.category]||0)+x.amount);const el=$('#categoryGrid');const arr=Object.entries(map).sort((a,b)=>b[1]-a[1]);el.innerHTML=arr.length?arr.map(([k,v])=>'<div class="category"><b>'+esc(k)+'</b><strong>'+money(v)+'</strong></div>').join(''):'<div class="empty">As categorias aparecerão aqui conforme você cadastrar despesas.</div>'}
function formatDate(s){try{return new Date(s+'T00:00:00').toLocaleDateString('pt-BR')}catch{return s}}
function esc(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
async function removeItem(id){if(!confirm('Excluir este lançamento?'))return;const r=await fetch('/api/items/'+id,{method:'DELETE'});if(r.ok){toast('Lançamento excluído.');load()}}
function openModal(type){selectedType=type||'income';document.querySelectorAll('.type').forEach(b=>b.classList.toggle('active',b.dataset.type===selectedType));$('#installmentFields').classList.toggle('hidden',selectedType!=='installment');$('#modal').classList.add('open');$('#modal').setAttribute('aria-hidden','false')}
function closeModal(){$('#modal').classList.remove('open');$('#itemForm').reset();selectedType='income';document.querySelector('.type[data-type="income"]').classList.add('active');document.querySelectorAll('.type:not([data-type="income"])').forEach(b=>b.classList.remove('active'));$('#installmentFields').classList.add('hidden')}
document.querySelectorAll('.nav').forEach(b=>b.addEventListener('click',()=>go(b.dataset.view)));
document.querySelectorAll('[data-view-go]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.viewGo)));
function go(view){document.querySelectorAll('.view').forEach(v=>v.classList.remove('active-view'));$('#'+view).classList.add('active-view');document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n.dataset.view===view));const titles={dashboard:'Visão geral',lancamentos:'Lançamentos',parcelas:'Parcelas',categorias:'Categorias'};$('#pageTitle').textContent=titles[view];document.querySelector('.sidebar').classList.remove('open')}
document.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',()=>openModal(b.dataset.type)));
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',closeModal));
document.querySelectorAll('.type').forEach(b=>b.addEventListener('click',()=>{selectedType=b.dataset.type;document.querySelectorAll('.type').forEach(x=>x.classList.toggle('active',x===b));$('#installmentFields').classList.toggle('hidden',selectedType!=='installment')}));
$('#itemForm').addEventListener('submit',async e=>{e.preventDefault();const body={type:selectedType,description:$('#description').value,amount:Number($('#amount').value),category:$('#category').value,date:$('#date').value,notes:$('#notes').value};if(selectedType==='installment'){body.totalInstallments=Number($('#totalInstallments').value);body.currentInstallment=Number($('#currentInstallment').value)}const r=await fetch('/api/items',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok){const j=await r.json();toast(j.error||'Erro ao salvar.');return}closeModal();toast('Lançamento salvo.');load()});
$('#menuBtn').addEventListener('click',()=>document.querySelector('.sidebar').classList.toggle('open'));
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#installBtn').hidden=false});
$('#installBtn').addEventListener('click',async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('#installBtn').hidden=true});
window.addEventListener('appinstalled',()=>toast('FinancasOn instalado com sucesso.'));
if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(()=>{});
load();
