[README.md](https://github.com/user-attachments/files/23997622/README.md)
# Safety Observer Pro

A comprehensive full-stack safety observation tracking application for Saudi Safety Group (Aramco CAT Project).

## Features

### Core Modules
- **Observations** - Track safety observations with risk levels, photos, and corrective actions
- **Permits** - Manage work permits (Hot Work, Confined Space, Excavation, etc.)
- **Heavy Equipment** - Track equipment with TPS/INS inspection dates
- **Toolbox Talks** - Record daily safety meetings with attendance

### Gamification System
- Points for safety activities (Observations: 10pts, Permits: 8pts, TBT: 12pts)
- Level progression: Bronze → Silver → Gold → Platinum
- Monthly leaderboard
- Employee of the Month
- Daily challenges with photo evidence

### Safety Tools
- Heat Stress Calculator
- Wind Speed Safety Limits
- Risk Assessment Matrix
- Training Matrix
- Life Saving Rules Checklist

### Additional Features
- Emergency contacts with click-to-call
- Safety responsibilities reference
- Document library (TBT, JSA, CSM)
- Multi-user authentication
- Admin panel for news and user management
- Dark/Light mode

## Quick Start

```bash
# Install dependencies
npm install

# Start the server
npm start

# Open browser to http://localhost:5000
```

## Default Login

- **Employee ID**: `ADMIN001`
- **Password**: `admin123`

## Environment Variables

Create a `.env` file (see `.env.example`):

```
PORT=5000
JWT_SECRET=your-secret-key-here
```

## Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: SQLite (better-sqlite3)
- **Frontend**: Vanilla JavaScript, CSS3
- **Authentication**: JWT with bcrypt

## Project Structure

```
├── server/
│   ├── index.js      # Express server
│   ├── database.js   # SQLite schema & connection
│   ├── auth.js       # Authentication routes
│   └── routes.js     # API endpoints
├── public/
│   ├── index.html    # Main HTML
│   ├── css/styles.css
│   └── js/app.js     # Frontend logic
├── uploads/          # Photo uploads
├── data/             # SQLite database
└── package.json
```

## Color Code System

Monthly rotating scaffold inspection colors:
- **January, May, September** → Yellow
- **February, June, October** → Red  
- **March, July, November** → Blue
- **April, August, December** → Green

## Credits

- **Developer**: Abdulrahman Alanazi [8222802]
- **Supervisor**: Abdullah Alkaluf [8230855]
- **Organization**: Saudi Safety Group (CAT Project)
- **Contact**: Catproject404@gmail.com

## License

MIT License
