import {Routes,Route} from 'react-router-dom';
import {AuthProvider} from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import NewJourney from './pages/NewJourney';
import EditJourney from './pages/EditJourney';
import Monitor from './pages/Monitor';
import EmergencyContacts from './pages/EmergencyContacts';
import About from './pages/About';
import Contact from './pages/Contact';

export default function App(){
 return <AuthProvider><Routes>
  <Route path="/" element={<Landing/>}/><Route path="/login" element={<Login/>}/><Route path="/signup" element={<Signup/>}/>
  <Route path="/about" element={<About/>}/><Route path="/contact" element={<Contact/>}/>
  <Route path="/dashboard" element={<ProtectedRoute><Dashboard/></ProtectedRoute>}/>
  <Route path="/journeys/new" element={<ProtectedRoute><NewJourney/></ProtectedRoute>}/><Route path="/journeys/edit/:id" element={<ProtectedRoute><EditJourney/></ProtectedRoute>}/>
  <Route path="/monitor/:id" element={<ProtectedRoute><Monitor/></ProtectedRoute>}/>
  <Route path="/emergency-contacts" element={<ProtectedRoute><EmergencyContacts/></ProtectedRoute>}/>
 </Routes></AuthProvider>
}