const express = require('express');
const Trip = require('../models/Trip');
const User = require('../models/User');
const nodemailer = require('nodemailer');
const auth = require('../middleware/auth');
const router = express.Router();

const R = 6371000;
const toRad = v => v * Math.PI / 180;
const cleanCoords = value => {
  if (!value || value.lat === undefined || value.lng === undefined) return null;
  const lat = Number(value.lat), lng = Number(value.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
};
const distance = (a,b) => {
  const p1=toRad(a.lat), p2=toRad(b.lat), dp=toRad(b.lat-a.lat), dl=toRad(b.lng-a.lng);
  const x=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
  return 2*R*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
};
const pointSegmentDistance=(p,a,b)=>{
  const scale=Math.cos(toRad((a.lat+b.lat)/2));
  const x=(p.lng-a.lng)*scale, y=p.lat-a.lat, bx=(b.lng-a.lng)*scale, by=b.lat-a.lat;
  const denom=bx*bx+by*by;
  if(!denom) return distance(p,a);
  const t=Math.max(0,Math.min(1,(x*bx+y*by)/denom));
  return distance(p,{lat:a.lat+by*t,lng:a.lng+(bx*t)/scale});
};
const minRouteDistance=(p,route)=>{let min=Infinity;for(let i=1;i<route.length;i++)min=Math.min(min,pointSegmentDistance(p,route[i-1],route[i]));return min;};

async function geocode(place) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(place)}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Travaio/2.0 travel-safety-app'
      },
      signal: AbortSignal.timeout(12000)
    });

    console.log('Nominatim:', place, response.status);

    if (!response.ok) {
      throw new Error(`Nominatim returned HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data.length) {
      throw new Error(`Could not find "${place}"`);
    }

    return {
      name: data[0].display_name,
      lat: Number(data[0].lat),
      lng: Number(data[0].lon)
    };
  } catch (error) {
    console.error('Geocoding failed:', place, error.message);
    throw new Error('Location search is temporarily unavailable.');
  }
}

async function routeBetween(a,b){
  const url=`https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson&steps=false`;
  const response=await fetch(url,{signal:AbortSignal.timeout(12000)});
  if(!response.ok) throw new Error('Road route service is temporarily unavailable.');
  const data=await response.json();
  if(data.code!=='Ok'||!data.routes?.[0]) throw new Error('No drivable route could be found between these locations.');
  const route=data.routes[0];
  return {coordinates:route.geometry.coordinates.map(([lng,lat])=>({lat,lng})),distance:route.distance,duration:route.duration};
}

router.post('/route-preview', auth, async (req,res)=>{
  try{
    const {origin,destination}=req.body;
    if(!origin||!destination) return res.status(400).json({msg:'Starting point and destination are required.'});
    const [a,b]=await Promise.all([geocode(origin),geocode(destination)]);
    const route=await routeBetween(a,b);
    res.json({origin:a,destination:b,...route});
  }catch(err){res.status(502).json({msg:err.message});}
});

router.post('/', auth, async (req,res)=>{
  try{
    const {origin,destination,startTime,originCoords,destinationCoords,routeCoordinates,routeDistanceMeters,routeDurationSeconds}=req.body;
    const requestedRadius=Number(req.body.destinationAlertRadiusMeters);
    const destinationAlertRadiusMeters=Number.isFinite(requestedRadius)&&requestedRadius>=100&&requestedRadius<=50000?Math.round(requestedRadius):1000;
    if(!origin||!destination||!startTime) return res.status(400).json({msg:'Origin, destination and start time are required.'});
    const a=cleanCoords(originCoords), b=cleanCoords(destinationCoords);
    const points=Array.isArray(routeCoordinates)?routeCoordinates.map(cleanCoords).filter(Boolean):[];
    if(!a||!b||points.length<2) return res.status(400).json({msg:'A valid road route is required before creating a journey.'});
    const trip=await Trip.create({userId:req.userId,origin:origin.trim(),destination:destination.trim(),startTime:new Date(startTime),status:'planned',originCoords:a,destinationCoords:b,routeCoordinates:points,routeDistanceMeters:Number(routeDistanceMeters)||0,routeDurationSeconds:Number(routeDurationSeconds)||0,destinationAlertRadiusMeters});
    res.status(201).json({msg:'Journey created successfully.',trip});
  }catch(err){console.error('Trip create error:',err);res.status(500).json({error:err.message});}
});

router.get('/',auth,async(req,res)=>{try{res.json(await Trip.find({userId:req.userId}).sort({createdAt:-1}));}catch(err){res.status(500).json({error:err.message});}});
router.get('/:id',auth,async(req,res)=>{try{const trip=await Trip.findOne({_id:req.params.id,userId:req.userId});if(!trip)return res.status(404).json({msg:'Journey not found.'});res.json(trip);}catch(err){res.status(500).json({error:err.message});}});

router.put('/:id',auth,async(req,res)=>{
  try{
    const trip=await Trip.findOne({_id:req.params.id,userId:req.userId});
    if(!trip)return res.status(404).json({msg:'Journey not found.'});

    if(req.body.status==='completed'){
      trip.status='completed';
      trip.completedAt=new Date();
    }else if(req.body.status==='canceled'){
      trip.status='canceled';
    }else if(req.body.origin||req.body.destination||req.body.startTime||req.body.destinationAlertRadiusMeters){
      if(trip.status==='active') return res.status(400).json({msg:'Stop live monitoring before editing this journey.'});
      const origin=(req.body.origin||trip.origin).trim();
      const destination=(req.body.destination||trip.destination).trim();
      const startTime=req.body.startTime?new Date(req.body.startTime):trip.startTime;
      if(!origin||!destination||Number.isNaN(startTime.getTime())) return res.status(400).json({msg:'Valid origin, destination and start time are required.'});
      const [a,b]=await Promise.all([geocode(origin),geocode(destination)]);
      const route=await routeBetween(a,b);
      trip.origin=origin;trip.destination=destination;trip.startTime=startTime;
      trip.originCoords=a;trip.destinationCoords=b;
      trip.routeCoordinates=route.coordinates;trip.routeDistanceMeters=route.distance;trip.routeDurationSeconds=route.duration;
      const requestedRadius=Number(req.body.destinationAlertRadiusMeters);
      trip.destinationAlertRadiusMeters=Number.isFinite(requestedRadius)&&requestedRadius>=100&&requestedRadius<=50000?Math.round(requestedRadius):(trip.destinationAlertRadiusMeters||1000);
      trip.arrivalAlertedAt=undefined;
      trip.status='planned';trip.completedAt=undefined;
    }
    await trip.save();
    res.json(trip);
  }catch(err){console.error('Trip update error:',err);res.status(502).json({msg:err.message||'Unable to update journey.'});}
});
router.delete('/:id',auth,async(req,res)=>{try{const trip=await Trip.findOneAndDelete({_id:req.params.id,userId:req.userId});if(!trip)return res.status(404).json({msg:'Journey not found.'});res.json({msg:'Journey deleted successfully.'});}catch(err){res.status(500).json({error:err.message});}});

router.post('/:id/start',auth,async(req,res)=>{
  try{
    const trip=await Trip.findOne({_id:req.params.id,userId:req.userId});if(!trip)return res.status(404).json({msg:'Journey not found.'});
    if(trip.status==='completed')return res.status(400).json({msg:'This journey is already completed.'});
    if(!trip.originCoords||!trip.destinationCoords)return res.status(400).json({msg:'This journey has no valid coordinates. Please create it again.'});
    if(!Array.isArray(trip.routeCoordinates)||trip.routeCoordinates.length<2){
      const route=await routeBetween(trip.originCoords,trip.destinationCoords);
      trip.routeCoordinates=route.coordinates;trip.routeDistanceMeters=route.distance;trip.routeDurationSeconds=route.duration;
    }
    trip.status='active';trip.monitoringStartedAt=new Date();trip.deviationStreak=0;trip.deviationDistanceMeters=0;trip.arrivalAlertedAt=undefined;const storedRadius=Number(trip.destinationAlertRadiusMeters);
    trip.destinationAlertRadiusMeters=Number.isFinite(storedRadius)&&storedRadius>=100&&storedRadius<=50000?storedRadius:1000;trip.safety={state:'normal',reminderCount:0};
    await trip.save();res.json(trip);
  }catch(err){console.error('Start trip error:',err);res.status(502).json({msg:err.message});}
});

router.post('/:id/location',auth,async(req,res)=>{
  try{
    const trip=await Trip.findOne({_id:req.params.id,userId:req.userId});if(!trip)return res.status(404).json({msg:'Journey not found.'});
    if(trip.status!=='active')return res.status(400).json({msg:'Journey monitoring is not active.'});
    const location=cleanCoords(req.body.location);const accuracy=Math.max(1,Number(req.body.accuracy)||50);
    if(!location)return res.status(400).json({msg:'Valid location is required.'});
    const route=trip.routeCoordinates||[];const deviation=minRouteDistance(location,route);const threshold=Math.max(250,accuracy*2.5);
    trip.lastLocation=location;trip.lastLocationAt=new Date();trip.lastLocationAccuracy=accuracy;trip.deviationDistanceMeters=Math.round(deviation);
    if(deviation>threshold){trip.deviationStreak=(trip.deviationStreak||0)+1;}else{trip.deviationStreak=0;if(trip.safety.state==='checking'){} }
    let incidentStarted=false;
    if(trip.deviationStreak>=3&&trip.safety.state==='normal'){
      trip.safety.state='checking';trip.safety.incidentStartedAt=new Date();trip.safety.reminderCount=0;trip.safety.nextReminderAt=new Date(Date.now()+30000);incidentStarted=true;
    }
    const storedRadius=Number(trip.destinationAlertRadiusMeters);
    const arrivalRadius=Number.isFinite(storedRadius)&&storedRadius>=100&&storedRadius<=50000?storedRadius:1000;
    const arrival=distance(location,trip.destinationCoords)<=arrivalRadius;
    const arrivalAlert=!trip.arrivalAlertedAt && arrival;
    if(arrivalAlert)trip.arrivalAlertedAt=new Date();
    await trip.save();
    res.json({ok:true,lastLocation:trip.lastLocation,deviationDistanceMeters:trip.deviationDistanceMeters,deviationDetected:deviation>threshold,incidentStarted,arrivalAlert,arrivalRadiusMeters:arrivalRadius,safety:trip.safety});
  }catch(err){res.status(500).json({error:err.message});}
});

router.post('/:id/safety/acknowledge',auth,async(req,res)=>{try{const trip=await Trip.findOne({_id:req.params.id,userId:req.userId});if(!trip)return res.status(404).json({msg:'Journey not found.'});trip.safety.state='normal';trip.safety.acknowledgedAt=new Date();trip.safety.reminderCount=0;trip.safety.nextReminderAt=undefined;trip.safety.lastReminderAt=undefined;trip.deviationStreak=0;await trip.save();res.json({msg:'Safety check acknowledged.',trip});}catch(err){res.status(500).json({error:err.message});}});

router.post('/:id/safety/escalate',auth,async(req,res)=>{try{const trip=await Trip.findOne({_id:req.params.id,userId:req.userId});if(!trip)return res.status(404).json({msg:'Journey not found.'});await escalateTrip(trip);res.json({msg:'Safety incident escalated.',trip});}catch(err){res.status(500).json({error:err.message});}});

async function escalateTrip(trip){
  trip.safety.state='escalated';trip.safety.escalatedAt=new Date();trip.safety.reminderCount=3;trip.safety.nextReminderAt=undefined;
  const user=await User.findById(trip.userId).select('name email phone emergencyContacts');
  const contacts=(user?.emergencyContacts||[]).filter(c=>c.email||c.phone);
  if(contacts.some(c=>c.email)&&process.env.SMTP_HOST&&process.env.SMTP_USER&&process.env.SMTP_PASS){
    try{
      const port=Number(process.env.SMTP_PORT||587);
      const transporter=nodemailer.createTransport({host:process.env.SMTP_HOST,port,secure:port===465,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}});
      const lastLocation=trip.lastLocation;
      const hasLocation=Boolean(lastLocation);
      const locationText=hasLocation?`${lastLocation.lat.toFixed(6)}, ${lastLocation.lng.toFixed(6)}`:'Location unavailable';
      const mapUrl=hasLocation?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lastLocation.lat},${lastLocation.lng}`)}`:null;
      const lastUpdated=trip.lastLocationAt?new Date(trip.lastLocationAt).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}):'Not available';
      const escalationTime=new Date().toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'});
      const accuracy=trip.lastLocationAccuracy?`${Math.round(trip.lastLocationAccuracy)} metres`:'Not available';
      const offset=Number.isFinite(Number(trip.deviationDistanceMeters))?`${Math.round(trip.deviationDistanceMeters)} metres`:'Not available';
      const mapLine=mapUrl?`Open the last known location on Google Maps: ${mapUrl}`:'A map link is unavailable because Travaio did not receive a valid GPS position.';
      const text=`TRAVAIO SAFETY ALERT\n\n${user?.name||'The traveler'} did not respond to three consecutive Travaio safety checks. Travaio has escalated the incident because their safety checks remained unanswered.\n\nJOURNEY\nFrom: ${trip.origin}\nTo: ${trip.destination}\n\nLAST KNOWN LOCATION\nCoordinates: ${locationText}\nGPS accuracy: ±${accuracy}\nLast GPS update: ${lastUpdated}\nMap: ${mapUrl||'Unavailable'}\n\nSAFETY DETAILS\nRoute deviation at last update: ${offset}\nEmergency escalation recorded: ${escalationTime}\n\nWHAT TO DO\nPlease try to contact ${user?.name||'the traveler'} and verify that they are safe. If you cannot reach them and you believe they may be in danger, follow your normal emergency procedure.\n\n${mapLine}\n\nThis alert was generated automatically by Travaio.`;
      const html=`<!doctype html><html><body style="margin:0;background:#f4f7f6;font-family:Arial,sans-serif;color:#172a2b"><div style="max-width:620px;margin:24px auto;background:#fff;border:1px solid #dbe5e2;border-radius:16px;overflow:hidden"><div style="padding:24px;background:#123c3d;color:#fff"><div style="font-size:13px;letter-spacing:1.4px;font-weight:700;color:#bfe7df">TRAVAIO SAFETY ALERT</div><h1 style="margin:8px 0 0;font-size:25px">${user?.name||'A traveler'} may need your attention</h1></div><div style="padding:24px"><p style="font-size:16px;line-height:1.6">Three consecutive Travaio safety checks were not acknowledged. The journey has been escalated to the emergency contact.</p><div style="background:#fff7e6;border:1px solid #f0d49a;border-radius:12px;padding:16px;margin:18px 0"><strong>Journey</strong><div style="margin-top:8px">${trip.origin} → ${trip.destination}</div></div><h3 style="margin-bottom:8px">Last known location</h3><div style="background:#f6f9f8;border-radius:12px;padding:16px;line-height:1.8"><div><strong>Coordinates:</strong> ${locationText}</div><div><strong>GPS accuracy:</strong> ±${accuracy}</div><div><strong>Last GPS update:</strong> ${lastUpdated}</div>${mapUrl?`<div style="margin-top:12px"><a href="${mapUrl}" style="display:inline-block;background:#087f78;color:#fff;text-decoration:none;padding:11px 16px;border-radius:8px;font-weight:700">View location on Google Maps</a></div>`:''}</div><h3 style="margin:22px 0 8px">Safety details</h3><ul style="line-height:1.8;padding-left:20px"><li>Route offset at the last update: ${offset}</li><li>Emergency escalation recorded: ${escalationTime}</li></ul><div style="margin-top:22px;padding:16px;background:#f4f7f6;border-radius:12px;line-height:1.6"><strong>Please try to contact ${user?.name||'the traveler'}.</strong><br/>Verify that they are safe. If you cannot reach them and you believe they may be in danger, follow your normal emergency procedure.</div><p style="margin-top:24px;font-size:12px;color:#687979">This alert was generated automatically by Travaio.</p></div></div></body></html>`;
      await transporter.sendMail({from:process.env.SMTP_FROM||process.env.SMTP_USER,to:contacts.filter(c=>c.email).map(c=>c.email).join(','),subject:`🚨 Travaio safety alert — ${trip.origin} → ${trip.destination}`,text,html});
      trip.safety.escalationNotifiedAt=new Date();
    }catch(err){console.error('Emergency email failed:',err.message);}
  }
  await trip.save();
}

async function processSafety(){
  const now=new Date();
  const trips=await Trip.find({'safety.state':'checking','safety.nextReminderAt':{$lte:now}});
  for(const trip of trips){
    if((trip.safety.reminderCount||0)<3){
      trip.safety.reminderCount+=1;
      trip.safety.lastReminderAt=now;
      trip.safety.nextReminderAt=new Date(now.getTime()+30000);
      await trip.save();
    }else await escalateTrip(trip);
  }
}
router.processSafety=processSafety;

module.exports=router;
