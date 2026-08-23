import {Link,NavLink} from 'react-router-dom';import {ArrowRight,Menu,X} from 'lucide-react';import {useState} from 'react';import {useAuth} from '../context/AuthContext';
export default function Navbar({app=false}){
 const [open,setOpen]=useState(false);const {user,logout}=useAuth();
 return <header className={app?'navbar app-nav':'navbar'}><div className="nav-inner">
  <Link to="/" className="brand"><img src="/travaio_nobg.png" /><span>Travaio</span></Link>
  <nav className={open?'nav-links open':'nav-links'}>
   <NavLink to="/">Home</NavLink><NavLink to="/about">About</NavLink><a href="/#services">Services</a><NavLink to="/contact">Contact</NavLink>
   {user?<NavLink to="/dashboard">Dashboard</NavLink>:null}
  </nav>
  <div className="nav-actions">{user?<><span className="nav-user">Hi, {user.name?.split(' ')[0]}</span><button className="link-button" onClick={logout}>Sign out</button></>:<><Link to="/login" className="sign-in">Sign in</Link><Link to="/signup" className="nav-cta">Start journey <ArrowRight size={15}/></Link></>}</div>
  <button className="mobile-menu" onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button>
 </div></header>
}