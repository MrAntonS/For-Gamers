# Gamer Nexus

![Gamer Nexus Banner](screenshots/banner.png)

[![Deployment Status](https://img.shields.io/badge/Deployment-Live-brightgreen)](http://129.158.206.217/deals/hardware)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tech Stack: Fullstack](https://img.shields.io/badge/Tech-React%20%7C%20Flask%20%7C%20Postgres-blueviolet)](https://github.com/MrAntonS/For-Gamers)

**Gamer Nexus** is a state-of-the-art ecommerce hub designed specifically for gaming enthusiasts. By aggregating real-time data from **Steam** and **eBay**, it offers a unified platform to discover the best deals on both games and hardware. Featuring a neon-cyberpunk aesthetic and powerful comparison tools, Gamer Nexus helps you build your dream setup for less.

### 🚀 [Live Demo](http://129.158.206.217/deals/games)

---

## ✨ Key Features

### 🎮 **Smart Game Deals**
- **Real-time Steam Integration**: Automatically fetches and verifies game prices, historical lows, and active discounts.
- **Advanced Filtering**: Filter by genre, review score, release year, and discount percentage.
- **Deal Verification**: Automated background workers ensure all displayed deals are active and valid.

### 🖥️ **Hardware Marketplace**
- **eBay Power Search**: Aggregates listings for GPUs, CPUs, RAM, and more directly from eBay.
- **Smart Grouping**: Intelligently groups similar listings to show you the best price for specific models (e.g., "RTX 3080").
- **Condition Analysis**: Automatically filters and tags items based on condition (New, Used, Refurbished).

### 🛠️ **MinMax Build Optimizer**
- **Performance Analysis**: Select the games you want to play.
- **AI Recommendations**: Our algorithm calculates the *minimum* hardware specs required to run your selected library at optimal settings and finds the best deals for those specific components.
- **Cost Efficiency**: Don't overpay for hardware you don't need.

### 🎨 **Immersive UI/UX**
- **Cyberpunk Design**: A fully responsive, dark-mode interface with neon accents.
- **Interactive Elements**: Smooth animations powered by Framer Motion.
- **Instant Search**: Fast, responsive search for both games and hardware.

---

## 📸 Visual Tour

### Home Page
![Home Page](screenshots/home_page.png)
*The landing page featuring trending deals and quick navigation.*

### Game Deals
![Game Deals](screenshots/game_deals.png)
*Browse thousands of Steam games with powerful filters.*

### Hardware Deals
![Hardware Deals](screenshots/hardware_deals.png)
*Find the best prices on components with our smart aggregation.*

### MinMax Builder
![MinMax Builder](screenshots/minmax_builder.png)
*Select your games and let usage algorithms build your PC.*
![MinMax Builder Selected](screenshots/minmax_builder_2.png)

---

## 🏗️ Technology Stack

| Area | Technologies |
|------|--------------|
| **Frontend** | React 19, Vite, Tailwind CSS v4, Framer Motion, React Router |
| **Backend** | Python 3.11, Flask, SQLAlchemy, Marshmallow |
| **Database** | PostgreSQL (Production), SQLite (Dev), Redis (Caching) |
| **External APIs** | eBay Buy API, Steam Web API, CheapShark API |
| **DevOps** | Docker, Docker Compose, Nginx, GitHub Actions, Oracle Cloud |

---

## 🛠️ Getting Started

Follow these instructions to set up the project locally.

### Prerequisites
- Node.js 20+
- Python 3.11+
- Docker & Docker Compose (optional)
- eBay Developer Account (for hardware API)

### 1. Clone the Repository
```bash
git clone https://github.com/MrAntonS/For-Gamers.git
cd For-Gamers
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
# Windows
.\venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
```

**Configuration (.env)**
Create a `.env` file in the `backend/` directory:
```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/gamernexus
# Or leave blank to use local SQLite

# Security
SECRET_KEY=your_development_secret_key

# External APIs
STEAM_API_KEY=your_steam_key
EBAY_CLIENT_ID=your_ebay_client_id
EBAY_CLIENT_SECRET=your_ebay_client_secret
EBAY_API_ENV=sandbox  # or 'production'
```

**Run Server**
```bash
python app.py
# Server runs on http://localhost:5000
```

### 3. Frontend Setup
```bash
cd frontend
npm install

# Create .env
echo "VITE_API_URL=http://localhost:5000/api" > .env

# Run Dev Server
npm run dev
# App runs on http://localhost:5173
```

---

## 🚢 Deployment

This project uses a fully automated **CI/CD pipeline** via GitHub Actions.

### Pipeline Workflow (`.github/workflows/cd.yml`)
1.  **Trigger**: Push to `main` branch.
2.  **Build**: Docker images are built for Frontend and Backend.
3.  **Transfer**: Images and configuration files are securely verified and transferred to the Oracle Cloud VM.
4.  **Deploy**:
    -   Existing containers are stopped gracefully.
    -   Database migrations are applied.
    -   New containers are spun up using `docker-compose.prod.yml`.
    -   Nginx handles reverse proxying.
5.  **Health Check**: A script verifies the endpoints are live (200 OK) before marking the deployment as success.

### Manual Deployment
You can manually deploy using Docker Compose locally:
```bash
docker compose -f docker-compose.yml up --build
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:
1.  Fork the repository.
2.  Create a feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<p align="center">
  Built for Gamers by <a href="https://github.com/MrAntonS">MrAntonS</a>
</p>
