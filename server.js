const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

app.use(express.json({limit:'1mb'}));
app.use(express.static(path.join(__dirname,'public')));

const itemSchema = new mongoose.Schema({
  type:{type:String,enum:['income','expense','installment'],required:true},
  description:{type:String,required:true,trim:true},
  amount:{type:Number,required:true,min:0},
  totalAmount:{type:Number,default:null,min:0},
  date:{type:String,default:''},
  category:{type:String,default:'Outros'},
  totalInstallments:{type:Number,default:1,min:1},
  currentInstallment:{type:Number,default:1,min:1},
  dueDay:{type:Number,default:null,min:1,max:31},
  recurring:{type:Boolean,default:false},
  recurrence:{type:String,enum:['monthly'],default:'monthly'},
  notes:{type:String,default:''}
},{timestamps:true});

let Item;
try { Item = mongoose.model('Item', itemSchema); } catch(e) { Item = mongoose.model('Item'); }

app.get('/api/health',(_,res)=>res.json({ok:true,mongodb:mongoose.connection.readyState===1}));

app.get('/api/items',async(_,res)=>{
  try {
    if(!MONGO_URI) return res.json([]);
    const items=await Item.find().sort({createdAt:-1}).lean();
    res.json(items);
  } catch(e){ res.status(500).json({error:'Não foi possível carregar os dados.'}); }
});

app.post('/api/items',async(req,res)=>{
  try {
    if(!MONGO_URI) return res.status(503).json({error:'MongoDB não configurado.'});
    const data={...req.body};
    if(data.type==='installment'){
      data.totalInstallments=Number(data.totalInstallments||1);
      data.totalAmount=Number(data.totalAmount||data.amount||0);
      data.amount=Number(data.amount||0);
      if(!data.amount && data.totalAmount && data.totalInstallments) data.amount=data.totalAmount/data.totalInstallments;
    }
    const item=await Item.create(data);
    res.status(201).json(item);
  } catch(e){ res.status(400).json({error:'Dados inválidos.'}); }
});

app.put('/api/items/:id',async(req,res)=>{
  try {
    const data={...req.body};
    if(data.type==='installment'){
      data.totalInstallments=Number(data.totalInstallments||1);
      data.totalAmount=Number(data.totalAmount||data.amount||0);
      data.amount=Number(data.amount||0);
      if(!data.amount && data.totalAmount && data.totalInstallments) data.amount=data.totalAmount/data.totalInstallments;
    }
    const item=await Item.findByIdAndUpdate(req.params.id,data,{new:true,runValidators:true});
    if(!item) return res.status(404).json({error:'Registro não encontrado.'});
    res.json(item);
  } catch(e){ res.status(400).json({error:'Não foi possível atualizar.'}); }
});

app.delete('/api/items/:id',async(req,res)=>{
  try {
    const item=await Item.findByIdAndDelete(req.params.id);
    if(!item) return res.status(404).json({error:'Registro não encontrado.'});
    res.json({ok:true});
  } catch(e){ res.status(400).json({error:'Não foi possível excluir.'}); }
});

app.get(/.*/,(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));

async function start(){
  if(MONGO_URI){
    try { await mongoose.connect(MONGO_URI); console.log('MongoDB conectado'); }
    catch(e){ console.error('MongoDB indisponível:',e.message); }
  } else console.warn('MONGODB_URI não configurada.');
  app.listen(PORT,()=>console.log('FinancasOn rodando na porta '+PORT));
}
start();
