import {createContext,useContext,useEffect,useState} from 'react';
import api from '../services/api';
const AuthContext=createContext(null);
export function AuthProvider({children}){
 const [user,setUser]=useState(()=>JSON.parse(localStorage.getItem('travaio_user')||'null'));
 const [loading,setLoading]=useState(!!localStorage.getItem('travaio_token'));
 useEffect(()=>{if(!localStorage.getItem('travaio_token')){setLoading(false);return;} api.get('/auth/me').then(r=>setUser(r.data)).catch(()=>{localStorage.removeItem('travaio_token');localStorage.removeItem('travaio_user');setUser(null)}).finally(()=>setLoading(false))},[]);
 const login=async(data)=>{const r=await api.post('/auth/login',data);localStorage.setItem('travaio_token',r.data.token);localStorage.setItem('travaio_user',JSON.stringify(r.data.user));setUser(r.data.user);return r.data};
 const signup=async(data)=>api.post('/auth/signup',data);
 const logout=()=>{localStorage.removeItem('travaio_token');localStorage.removeItem('travaio_user');setUser(null)};
 return <AuthContext.Provider value={{user,loading,login,signup,logout}}>{children}</AuthContext.Provider>
}
export const useAuth=()=>useContext(AuthContext);