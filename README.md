# Travaio

Personal travel-safety application built with React, Node.js, Express and MongoDB.

## Core features

- JWT authentication and protected dashboard
- Journey creation, editing and deletion
- Automatic road-route generation using OSRM
- Live browser GPS monitoring
- Server-side route-deviation detection
- Three consecutive abnormal GPS samples required before a safety incident
- Three safety check reminders
- Automatic emergency escalation after unanswered checks
- Emergency-contact email notification with a clear last-known location, GPS accuracy, timestamp and clickable Google Maps link
- User-configurable destination alert distance from 100 m to 50 km
- 1 km destination alert distance by default
- Destination alert triggers once per journey
- Journey completion and monitoring history
- About and Contact pages
- Demo/test controls for validating safety and destination-alert behavior locally

## Project structure

```text
Travaio/
├── backend/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── client/
│   ├── public/
│   ├── src/
│   ├── .env.example
│   ├── index.html
│   └── package.json
├── legacy-reference/
└── README.md
```

`legacy-reference/` contains the earlier HTML UI for reference only. The active application is the MERN-style `client/` + `backend/` implementation.

## Backend setup

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

Set `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL` and the SMTP variables in `.env`.

For Gmail SMTP, use a Google App Password rather than your normal Gmail password.

## Frontend setup

```bash
cd client
npm install
npm run dev
```

Open the localhost URL printed by Vite if the browser does not open automatically.

## Safety flow

```text
Route deviation
      ↓
3 abnormal GPS samples
      ↓
Safety check
      ↓
3 unanswered reminders
      ↓
Emergency escalation
      ↓
Emergency-contact email
```

The email contains the journey, last known coordinates, GPS accuracy, last GPS update time, route offset and a clickable map link.

## Destination alert

The default alert radius is 1 km. Users can enter a custom distance from 100 m to 50 km. The selected distance is saved per journey and triggers one destination alert when the live GPS position enters that radius.

## Production notes

The current version uses browser geolocation and free Nominatim/OSRM services for development and demonstration. A production deployment should use a suitable routing/geocoding provider, rate limits, monitoring, durable background jobs and mobile-capable background location tracking.
