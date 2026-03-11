# 🚀 FutureOS — AI Future Planning Platform

> *"If I make this decision today, what could my life look like in 2035?"*

FutureOS is an AI-powered platform that helps students and early professionals explore their future by simulating career paths, analyzing skill gaps, predicting industry trends, and generating personalized learning roadmaps — all the way to **2035**.

---

## 📌 Table of Contents

- [About the Project](#about-the-project)
- [Features](#features)
- [Trend Swipe — Tinder for Career Trends](#-trend-swipe--tinder-for-career-trends-new)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [API Endpoints](#api-endpoints)
- [Getting Started](#getting-started)
- [MVP Scope](#mvp-scope-hackathon)
- [Contributing](#contributing)
- [License](#license)

---

## About the Project

Students and early professionals often struggle to understand:
- Which careers will exist in the future
- What skills they should start learning today
- How their decisions now affect their life in 2035

**FutureOS** solves this by combining **AI simulations, career forecasting, and life planning** in one platform. Users get personalized future scenarios, a skill gap radar, an interactive chatbot that lets them talk to their "future self", and a GPS-style roadmap to their goals.

---

## Features

### 👤 1. User Profile
Users input their education, current skills, interests, career goals, risk tolerance, and preferred lifestyle. This data powers all AI personalization across the platform.

---

### 🔮 2. AI Future Simulator
Generates multiple future career scenarios based on your profile.

| Scenario | Role | Salary Potential | Key Skills |
|----------|------|-----------------|------------|
| 1 | AI Engineer | High | ML, AI Systems Design |
| 2 | Startup Founder | Very High | Leadership, Product, Risk |
| 3 | Climate Engineer | Medium-High | Sustainability, Engineering |

Each scenario includes career path, salary estimate, required skills, and lifestyle impact.

---

### 🤖 3. Future Self Chatbot
Chat directly with your **AI-simulated future self from 2035**.

**Example:**
> **You:** Should I focus on AI or cybersecurity?
>
> **Future Self (2035):** By 2035, AI security became one of the most critical fields. Combining both gave me a massive edge — I'd start with AI foundations and layer in security by year 3.

---

### 📡 4. Skill Gap Radar
Compares your current skills with future job market requirements.

```
Current Skills     →   Missing Skills         →   Recommended
Python                 AI Agents                  LangChain
Data Structures        AI Safety                  Vector DBs
SQL                    Human-AI Collaboration     Prompt Engineering
```

---

### 📈 5. Career Trend Dashboard
Visual dashboard showing careers that are **growing**, **stable**, or **declining** by 2035.

**Growing:** AI Safety Engineer · Climate Engineer · Robotics Technician
**Declining:** Data Entry · Manual Bookkeeping · Basic QA Testing

---

### 🗺️ 6. Life GPS — Career Roadmap
A step-by-step timeline from today to 2035. If you deviate, the system recalculates and suggests a new path — just like a GPS.

```
2025 → Build Python skills
2026 → First ML project
2027 → Contribute to open source AI
2029 → Masters in AI / Deep specialization
2032 → Senior AI Engineer
2035 → AI Research Lead / Founder
```

---

### 🎮 7. Career Reality Simulator
Simulate **a full day in your target career** before committing to it.

**AI Engineer Day:**
- 🌅 Morning → Standup + model review
- ☀️ Afternoon → Training & fine-tuning models
- 🌙 Evening → Debugging pipeline + documentation

---

### ⚖️ 8. Decision Impact Analyzer
Compare two life choices side by side with AI-generated pros, cons, and long-term impact scores.

| | Study Abroad | Start a Startup |
|-|-------------|----------------|
| **Pros** | Higher salary, global network | High reward, full autonomy |
| **Cons** | High cost, time away | High risk, unstable income |
| **2035 Impact** | +Senior roles faster | +Founder equity potential |

---

## 🔥 Trend Swipe — Tinder for Career Trends *(New!)*

> **Swipe right on careers you're interested in. Swipe left on ones that don't excite you. Let AI build your future from your instincts.**

**Trend Swipe** is a Tinder-style card swiping experience for discovering emerging career trends and technologies. Instead of scrolling through boring lists, users swipe through dynamic career/trend cards and the AI learns their preferences in real time.

### How It Works

1. **A card appears** — showing a career trend, emerging technology, or future job role (e.g., *"AI Ethicist"*, *"Neuro-UX Designer"*, *"Space Logistics Engineer"*)
2. **User swipes:**
   - ➡️ **Right** = Interested / Excited
   - ⬅️ **Left** = Not for me
   - ⬆️ **Up** = Super interested (rare, weighted heavily)
3. **After 10–20 swipes**, the AI generates:
   - A **personalized trend report** based on interests
   - An updated **Future Simulator** seeded from swipe data
   - A **"Your Trend DNA"** profile (e.g., *"You're drawn to human-tech intersection roles"*)

### Card Contents (Each Trend Card Shows)

```
┌─────────────────────────────┐
│  🤖  AI Ethicist            │
│  📈  Growth: +340% by 2035  │
│  💰  Avg Salary: $145K      │
│  🔥  Trending in: Tech, Law │
│  🧠  Skills: Philosophy,    │
│       AI, Policy            │
└─────────────────────────────┘
```

### Why It's Powerful
- **Zero friction onboarding** — users express preferences without filling forms
- **Engagement loop** — addictive swiping keeps users discovering trends
- **Cold start solver** — feeds early preference data into the AI engine before a full profile is set up
- **Daily refresh** — new trend cards drop every day based on real-world signals

### Tech Behind It
- Cards sourced from **live job market APIs + LLM trend synthesis**
- Swipe data stored and used to **fine-tune user embeddings**
- Integrates directly with the **Skill Gap Radar** and **Life GPS**

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js, Tailwind CSS, Framer Motion |
| **Charts** | Recharts / Chart.js |
| **Swipe UI** | React Spring + custom gesture handlers |
| **Backend** | FastAPI or Node.js (Express) |
| **AI / LLM** | OpenAI API / Claude API + Embeddings |
| **Vector DB** | Pinecone / Weaviate |
| **Database** | PostgreSQL |
| **Auth** | NextAuth / Clerk |

---

## System Architecture

```
User Browser
     │
     ▼
[ Next.js Frontend ]
     │
     ▼
[ FastAPI / Node.js Backend ]
     │         │
     ▼         ▼
[ AI Engine ] [ PostgreSQL + Vector DB ]
     │
     ▼
[ LLM APIs + Embedding Models ]
```

**Data Flow:**
1. User enters profile / swipes trends
2. Backend sends data to AI engine
3. AI generates predictions & scenarios
4. Results stored in DB
5. Frontend displays personalized insights

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/profile` | Create/update user profile |
| `POST` | `/simulate` | Generate future career scenarios |
| `POST` | `/skill-gap` | Analyze current vs future skill gaps |
| `POST` | `/chat` | Future self chatbot conversation |
| `GET` | `/trends` | Fetch career trend data |
| `GET` | `/roadmap` | Generate personalized roadmap |
| `GET` | `/swipe/cards` | Get trend swipe cards |
| `POST` | `/swipe` | Submit swipe result (right/left/up) |
| `GET` | `/swipe/profile` | Get user's Trend DNA profile |

---

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.10+ (if using FastAPI backend)
- PostgreSQL
- OpenAI / Anthropic API key

### Installation

```bash
# Clone the repo
git clone https://github.com/your-username/futureos.git
cd futureos

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Add your API keys to .env

# Run the frontend
npm run dev

# Run the backend
uvicorn main:app --reload
```

### Environment Variables

```env
OPENAI_API_KEY=your_key_here
DATABASE_URL=postgresql://user:password@localhost/futureos
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## MVP Scope (Hackathon)

For the hackathon, we're shipping:

- [x] User profile form
- [x] AI future simulation (3 scenarios)
- [x] Skill gap analysis
- [x] Future self chatbot
- [x] Basic roadmap timeline
- [x] **Trend Swipe** (new feature — core differentiator)

---

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you'd like to change.

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">
  <strong>Built with ❤️ for the future — FutureOS 2025</strong><br/>
  <em>Your decisions today. Your life in 2035.</em>
</div>
