# Dev-Collab

Real‑time developer collaboration platform with AI‑powered code reviews.

***

## Features

- Real‑time room collaboration using Socket.io
- AI‑powered code reviews (OpenRouter free models)
- Monaco editor (VS Code engine) with syntax highlighting for 20+ languages
- Room access codes for private rooms
- Join any room by ID (with optional access code)
- Owner controls: edit room details, delete room, manage access code
- Auto‑detect programming language from pasted code
- Dark developer theme with responsive design
- JWT authentication and persistent MongoDB storage

***

### Usage
- Register a new user or log in.
- Create a room or join an existing room using its ID.
- Write code in the Monaco editor (language auto‑detected).
- Click Add Snippet – the snippet appears for everyone in the room.
- Click AI Review to get a detailed, educational code review.
- Room owners can edit room details or delete the room.

***
## Tech Stack

**Backend**

- Node.js
- Express.js
- MongoDB with Mongoose
- Socket.io
- JSON Web Tokens (JWT)
- bcryptjs

**Frontend**

- React.js
- Vite
- Tailwind CSS
- Monaco Editor
- Socket.io-client
- Axios

**AI Integration**

- OpenRouter API (free tier)

***

## Database Schema

**User Model**

| Field        | Type     | Required | Description           |
|--------------|----------|----------|-----------------------|
| name         | String   | Yes      | User's full name      |
| email        | String   | Yes      | Unique email address  |
| passwordHash | String   | Yes      | Hashed password       |
| createdAt    | Date     | Auto     | Timestamp             |

**Room Model**

| Field       | Type       | Required | Description                    |
|-------------|------------|----------|--------------------------------|
| title       | String     | Yes      | Room name                      |
| description | String     | No       | Room description               |
| ownerId     | ObjectId   | Yes      | Reference to the creator       |
| members     | [ObjectId] | Yes      | Array of user IDs who can access |
| accessCode  | String     | No       | Optional code for private room |
| createdAt   | Date       | Auto     | Timestamp                      |

**Snippet Model**

| Field      | Type     | Required | Description                    |
|------------|----------|----------|--------------------------------|
| roomId     | ObjectId | Yes      | Reference to the room          |
| authorId   | ObjectId | Yes      | Reference to the user          |
| title      | String   | Yes      | Snippet title                  |
| code       | String   | Yes      | The actual code content        |
| language   | String   | Yes      | Programming language           |
| createdAt  | Date     | Auto     | Timestamp                      |
| updatedAt  | Date     | Auto     | Timestamp                      |

***

## Setup Instructions

### Prerequisites

- Node.js (v18 or later)
- MongoDB (local installation or MongoDB Atlas)
- Git

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env   # edit with your values
npm run dev            # or node server.js
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```
***

### Environment Variables

PORT=5000
MONGODB_URI=mongodb://localhost:27017/devcollab
JWT_SECRET=your_super_secret_key
OPENROUTER_API_KEY=your_openrouter_api_key
***

### Project Structure
```
devcollab/
├── backend/
│   ├── config/          # Database connection
│   ├── controllers/     # Auth, room, AI logic
│   ├── middleware/      # JWT verification
│   ├── models/          # User, Room, Snippet
│   ├── routes/          # API endpoints
│   ├── .env.example
│   └── server.js
└── frontend/
    ├── src/
    │   ├── context/     # Auth and Socket providers
    │   ├── pages/       # Login, Register, Dashboard, Room
    │   ├── services/    # Axios setup
    │   ├── App.jsx
    │   └── index.css    # Tailwind + custom scrollbars
    ├── index.html
    └── package.json
```
***

### License

This project is licensed under the MIT License.

