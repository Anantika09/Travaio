import {useEffect,useState} from 'react';
import {Edit3,Trash2,UserPlus,Save,X,ShieldCheck} from 'lucide-react';
import Navbar from '../components/Navbar';
import api from '../services/api';

const empty={name:'',phone:'',email:''};

export default function EmergencyContacts(){
 const [items,setItems]=useState([]);
 const [form,setForm]=useState(empty);
 const [editing,setEditing]=useState(null);
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);

 const load=async()=>{try{const r=await api.get('/emergency');setItems(r.data||[]);}catch(e){setError(e.response?.data?.msg||'Unable to load contacts.')}};
 useEffect(()=>{load()},[]);

 const change=(k,v)=>setForm(x=>({...x,[k]:v}));
 const reset=()=>{setForm(empty);setEditing(null);setError('')};

 async function save(e){
  e.preventDefault();setError('');
  if(!form.name.trim()||(!form.phone.trim()&&!form.email.trim())){setError('Add a name and at least a phone number or email.');return}
  setBusy(true);
  try{
   if(editing!==null) await api.put(`/emergency/${editing}`,form);
   else await api.post('/emergency',form);
   reset();await load();
  }catch(err){setError(err.response?.data?.msg||err.response?.data?.error||'Unable to save contact.')}
  finally{setBusy(false)}
 }
 async function remove(index){
  if(!window.confirm(`Remove ${items[index]?.name||'this contact'} from your emergency contacts?`))return;
  try{await api.delete(`/emergency/${index}`);if(editing===index)reset();await load();}
  catch(err){setError(err.response?.data?.msg||'Unable to delete contact.')}
 }
 function edit(index){setEditing(index);setForm({...items[index]});setError('');window.scrollTo({top:0,behavior:'smooth'})}

 return <><Navbar app/><main className="container section-pad">
  <div className="section-head app-section-head">
   <span className="eyebrow">SAFETY NETWORK</span>
   <h1>People Travaio can reach when you can't.</h1>
   <p>Add someone you trust. They are only contacted when a journey's safety checks remain unanswered.</p>
  </div>
  <div className="contact-grid contact-page-grid">
   <section className="panel contact-editor">
    <div className="panel-title"><div><span className="eyebrow">{editing!==null?'EDIT CONTACT':'ADD A CONTACT'}</span><h2>{editing!==null?'Update trusted person':'Your trusted person'}</h2></div><ShieldCheck size={23} color="var(--teal)"/></div>
    {error&&<div className="form-error">{error}</div>}
    <form onSubmit={save}>
     <div className="field"><label>Full name</label><input value={form.name} onChange={e=>change('name',e.target.value)} placeholder="e.g. Rahul Sharma" required/></div>
     <div className="field"><label>Phone number</label><input value={form.phone} onChange={e=>change('phone',e.target.value)} placeholder="+91 98XXXXXXXX"/></div>
     <div className="field"><label>Email address</label><input type="email" value={form.email} onChange={e=>change('email',e.target.value)} placeholder="trusted@example.com"/></div>
     <div className="editor-actions"><button className="primary-btn" disabled={busy}>{editing!==null?<><Save size={16}/> {busy?'Saving…':'Save changes'}</>:<><UserPlus size={16}/> {busy?'Adding…':'Add contact'}</>}</button>{editing!==null&&<button type="button" className="secondary-btn" onClick={reset}><X size={16}/> Cancel</button>}</div>
    </form>
   </section>
   <section className="panel">
    <div className="panel-title"><div><span className="eyebrow">YOUR LIST</span><h2>Emergency contacts</h2></div><span className="count-badge">{items.length}</span></div>
    <div className="contact-list large-contact-list">
     {items.length?items.map((c,index)=><div className="contact-row contact-row-large" key={index}>
      <div className="contact-identity"><div className="contact-avatar">{c.name?.charAt(0)?.toUpperCase()||'?'}</div><div><strong>{c.name}</strong><span>{c.phone||'No phone number'}</span>{c.email&&<span>{c.email}</span>}</div></div>
      <div className="contact-actions"><button title="Edit contact" onClick={()=>edit(index)}><Edit3 size={16}/></button><button title="Delete contact" className="danger-icon" onClick={()=>remove(index)}><Trash2 size={16}/></button></div>
     </div>):<div className="empty"><ShieldCheck size={28}/><p>No emergency contacts yet.</p><span>Add someone you trust so Travaio knows who to reach after unanswered safety checks.</span></div>}
    </div>
   </section>
  </div>
 </main></>
}
