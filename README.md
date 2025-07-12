# 🛠️ Skill Swap Platform

**Problem Statement Selected:** Skill Swap Platform  
**Team Name:** Creaters  
**Contact Email:** [amiteshguptatest@gmail.com](mailto:amiteshguptatest@gmail.com)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

## 🌟 Overview

A modern web application that enables users to list their skills and request skill exchanges with others. Built with React, TypeScript, Node.js, and SQLite.

## ✨ Features

- 🔐 User authentication (Signup/Login)
- 👤 User profiles with skill listings
- 🔍 Search and filter users by skills
- 💬 In-app messaging system
- ⭐ Rating and review system
- 🎨 Responsive design for all devices
- 🚀 Real-time notifications
- 👨‍💻 Admin dashboard for user management

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- npm (comes with Node.js)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Odoo_team_creaters-main
   ```

2. **Install dependencies**
   ```bash
   # Install frontend dependencies
   npm install
   
   # Install backend dependencies
   cd server
   npm install
   cd ..
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   # Server
   PORT=3001
   JWT_SECRET=your_jwt_secret_key_here
   NODE_ENV=development
   
   # Database (SQLite)
   DATABASE_URL=file:./dev.db
   ```

4. **Set up the database**
   ```bash
   cd server
   npx prisma migrate dev --name init
   cd ..
   ```

5. **Create an admin user**
   ```bash
   cd server
   npm run admin:make
   # Follow the prompts to create an admin user
   cd ..
   ```

6. **Start the development servers**
   ```bash
   # Start both frontend and backend
   npm run dev
   ```

7. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

## 🛠 Tech Stack

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- Framer Motion (animations)
- React Router (navigation)
- Axios (HTTP client)

### Backend
- Node.js with Express
- TypeScript
- SQLite with Prisma ORM
- JWT Authentication
- WebSocket for real-time features

## 📂 Project Structure

```
Odoo_team_creaters-main/
├── src/                    # Frontend source code
│   ├── components/         # Reusable UI components
│   ├── pages/              # Page components
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Utility functions
│   └── App.tsx             # Main application component
│
├── server/                 # Backend source code
│   ├── src/
│   │   ├── controllers/    # Request handlers
│   │   ├── middleware/     # Express middleware
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   └── utils/          # Utility functions
│   └── prisma/             # Database schema and migrations
│
├── public/                 # Static files
└── package.json            # Frontend dependencies
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- [Amitesh Gupta](mailto:amiteshguptatest@gmail.com)

## 🙏 Acknowledgments

- [Odoo](https://www.odoo.com/) for the opportunity
- All open-source libraries used in this project

---

<div align="center">
  Made with ❤️ by Team Creaters
</div>
