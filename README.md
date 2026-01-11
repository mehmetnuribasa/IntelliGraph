# IntelliGraph 🧠

**IntelliGraph** is a next-generation academic collaboration platform powered by **AI** and **Graph Database** technologies. It connects researchers, projects, and funding opportunities through semantic understanding and intelligent relationship mapping.

> **Status**: Active Development  
> **Tech Stack**: Next.js 16, Neo4j, Google Gemini AI, Tailwind CSS v4

---

## 🚀 Key Features

### 🤖 AI-Powered Research Assistant
- **Semantic Search**: Uses **Google Gemini** embeddings to find semantically similar projects and calls, not just keyword matches.
- **Intelligent Recommendations**: Matching algorithms to suggest relevant funding calls for specific research projects.
- **Chat Interface**: Interact with the platform to query the knowledge graph (powered by `gemini-2.5-flash`).

### 🕸️ Graph-Based Knowledge Network
- **Neo4j Integration**: All data (Academics, Projects, Calls, Institutions) is stored as nodes and relationships.
- **Visual Exploration**: Interactive graph visualizations using `react-force-graph-2d` to explore connections.
- **Complex Queries**: efficient traversal of relationships (e.g., "Find friends of collaborators who work on AI").

### 👤 Comprehensive User Management
- **Role-Based Access**: Academic, Funding Manager, Admin roles.
- **Secure Authentication**: JWT-based session management with `bcryptjs` password hashing.
- **Profile Management**: 
  - Update Personal Info & Academic Title.
  - Change Password (with complexity checks).
  - **Safe Account Deletion**: Smart cleanup of user nodes and relationships.
- **Dashboard**: personalized view of your projects and recommended opportunities.

### 💼 Project & Funding Management
- **Project Portfolio**: Academics can create and manage their research portfolio.
- **Funding Calls**: Institutions can post and manage grant opportunities.
- **Matching System**: Automatically calculating alignment between Projects and Calls.

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **State**: React Context API
- **Visualization**: `react-force-graph-2d`

### Backend
- **Runtime**: Next.js API Routes (Serverless)
- **Database**: [Neo4j](https://neo4j.com/) (Graph DB)
- **AI Model**: [Google Gemini](https://ai.google.dev/) (`gemini-2.5-flash`, `text-embedding-004`)
- **Auth**: `jsonwebtoken`, `jose`, `bcryptjs`

---

## ⚙️ Installation & Setup

### Prerequisites
- **Node.js**: v18 or later
- **Neo4j Database**: Desktop, Docker, or Aura (Cloud)
- **Google AI Studio Key**: For Gemini API access

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/intelligraph.git
cd intelligraph/my-app
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory with the following variables:

```env
# Neo4j Configuration
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_password

# Authentication (JWT)
ACCESS_TOKEN_SECRET=your_complex_access_string_here
REFRESH_TOKEN_SECRET=your_complex_refresh_string_here

# AI Services
GEMINI_API_KEY=your_google_gemini_api_key
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 📂 Project Structure

```
my-app/
├── app/
│   ├── api/                 # Backend API Routes
│   │   ├── academics/       # User management (Login, Profile, Register, etc.)
│   │   ├── calls/           # Funding Calls CRUD
│   │   ├── projects/        # Projects CRUD
│   │   ├── research-assistant/ # AI/Gemini Integration endpoint
│   │   └── graph/           # Graph data endpoints
│   ├── components/          # Reusable UI Components
│   ├── contexts/            # React Contexts (AuthContext)
│   ├── dashboard/           # User Dashboard
│   ├── login/               # Login Page
│   ├── register/            # Registration Page
│   └── settings/            # User Settings (Password, Delete Account)
├── lib/
│   ├── neo4j.ts             # Database Driver Configuration
│   └── api.ts               # Axios Instance Configuration
└── public/                  # Static assets
```

## 🔒 API Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| **POST** | `/api/academics/login` | Authenticate user & get token |
| **POST** | `/api/academics/register` | Create a new academic account |
| **GET** | `/api/academics/profile` | Get current user details |
| **PUT** | `/api/academics/profile` | Update profile info |
| **DELETE** | `/api/academics/account` | Permanently delete account |
| **POST** | `/api/research-assistant` | AI semantic search & chat |

---

## 🤝 Contributing

Contributions are welcome! Please fork the repository and create a pull request for any features or bug fixes.

---

## 📄 License

This project is licensed under the MIT License.
