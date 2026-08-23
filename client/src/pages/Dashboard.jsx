import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {Plus,MapPin,ShieldCheck,ArrowRight,Edit3,Trash2,Activity,Users,CalendarDays} from 'lucide-react';
import Navbar from '../components/Navbar';
import api from '../services/api';
import {useAuth} from '../context/AuthContext';

export default function Dashboard(){
 const {user}=useAuth();const [trips,setTrips]=useState([]),[contacts,setContacts]=useState([]),[error,setError]=useState('');
 const load=async()=>{try{const [t,c]=await Promise.all([api.get('/trip'),api.get('/emergency')]);setTrips(t.data||[]);setContacts(c.data||[])}catch(e){setError(e.response?.data?.msg||'Unable to load your travel space.')}};
 useEffect(()=>{load()},[]);
 async function remove(id,name){if(!window.confirm(`Delete the journey ${name}? This cannot be undone.`))return;try{await api.delete(`/trip/${id}`);await load()}catch(e){setError(e.response?.data?.msg||'Unable to delete journey.')}}
 return <><Navbar app/><main className="container dashboard">
  <div className="dash-head"><div><span className="eyebrow">YOUR TRAVEL SPACE</span><h1>Good to see you, {user?.name?.split(' ')[0]||'traveler'}.</h1><p>Plan a journey and let Travaio keep an eye on the road.</p></div><div className="dash-actions"><Link className="primary-btn" to="/journeys/new"><Plus size={17}/> New journey</Link></div></div>
  {error&&<div className="form-error">{error}</div>}
  <div className="dashboard-summary"><div className="summary-card"><Activity size={19}/><div><span>JOURNEYS</span><strong>{trips.length}</strong></div></div><div className="summary-card"><Users size={19}/><div><span>TRUSTED PEOPLE</span><strong>{contacts.length}</strong></div></div><div className="summary-card"><ShieldCheck size={19}/><div><span>SAFETY</span><strong>Ready</strong></div></div></div>
  <div className="dashboard-grid"><section className="panel journeys-panel"><div className="panel-title"><div><span className="eyebrow">YOUR HISTORY</span><h2>Recent journeys</h2></div><span className="count-badge">{trips.length}</span></div>
   {trips.length?<div className="trip-list">{trips.map(t=><div className="trip-row trip-row-rich" key={t._id}><div className="trip-main"><div className="trip-route"><span className="trip-point"></span>{t.origin} <span className="trip-arrow">→</span> {t.destination}</div><div className="trip-meta"><CalendarDays size={12}/>{t.createdAt?new Date(t.createdAt).toLocaleDateString():''}<span className={`status-pill ${t.status}`}>{t.status||'planned'}</span></div></div><div className="trip-actions"><Link title="Open journey" className="icon-action primary-icon" to={`/monitor/${t._id}`}><ArrowRight size={16}/></Link>{t.status!=='active'&&<Link title="Edit journey" className="icon-action" to={`/journeys/edit/${t._id}`}><Edit3 size={15}/></Link>}<button title="Delete journey" className="icon-action danger-icon" onClick={()=>remove(t._id,`${t.origin} → ${t.destination}`)}><Trash2 size={15}/></button></div></div>)}</div>:<div className="empty"><MapPin size={25}/><p>No journeys yet.</p><Link to="/journeys/new">Plan your first journey →</Link></div>}
  </section><aside className="dashboard-aside">
   <section className="panel safety-panel"><div className="panel-title"><div><span className="eyebrow">TRAVAIO SAFETY</span><h2>Monitoring ready</h2></div><ShieldCheck size={23} color="var(--safe)"/></div><p className="muted">Start a journey when you're ready. Travaio compares your live GPS position with the planned road route.</p><Link className="secondary-btn wide" to="/journeys/new">Plan a journey <ArrowRight size={14}/></Link></section>
   <section className="panel"><div className="panel-title"><div><span className="eyebrow">TRUSTED NETWORK</span><h2>Emergency contacts</h2></div><Link to="/emergency-contacts" className="manage-link">Manage</Link></div>{contacts.length?<div className="contact-list">{contacts.slice(0,3).map((c,i)=><div className="contact-row" key={i}><div><strong>{c.name}</strong><span>{c.phone||c.email}</span></div><ShieldCheck size={16} color="var(--teal)"/></div>)}</div>:<p className="muted">Add a trusted person who can be contacted after unanswered safety checks.</p>}</section>
  </aside></div>
 </main></>
}
