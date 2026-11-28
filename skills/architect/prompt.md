### Stage 2: Design & Architecture
**Handled by:** Software Architect
**Skill Path:** `skills/architect/prompt.md`
**Goal:** Design the "Luxury Coastal" VPS-only system flow.
- **Focus:** Mobile-first, high-conversion landing page on VPS (102.202.194.37).
- **System:** Single VPS running full stack via Docker Compose + systemd.
- **Architecture:**
  - **VPS (102.202.194.37 public, 172.16.4.154 internal):** Runs everything — PostgreSQL 16, Redis 7, Next.js (standalone) via systemd, Nginx reverse proxy, Ollama container.
  - **Next.js:** Built as `output: 'standalone'` (not static export). API routes work natively.
  - **Ollama:** Containerized in Docker Compose, model `llama3.2:3b` (or `tinyllama` for lower RAM). Used only for Admin Assistant chatbot & lead nurturing workflows.
  - **Integration:** Next.js app calls Ollama at `http://ollama:11434` (internal Docker network). No external API bridge needed.
- **AI Model:** `llama3.2:3b` preferred (better quality, fits 8GB RAM). Fallback: `tinyllama`. Constraint: Ollama container limited to 4GB RAM / 2 CPUs.
- **Constraint:** All external API calls (Ozow, Email) rate-limited to <20/min from Next.js app. Internal Ollama calls unlimited.
- **Data Flow:**
  1. User visits `https://kaliva185.duckdns.org` (Nginx → Next.js on :3000)
  2. Form submissions → Next.js API routes → PostgreSQL + Ozow payment link
  3. AI chatbot requests → Next.js → Ollama container (internal) → response
  4. Admin dashboard → manual bookings block dates in PostgreSQL → prevents double-booking
  5. Background worker (BullMQ/Redis) handles email triggers, breakage fee reminders

**Key Deliverables:**
- VPS: Docker Compose stack (postgres, redis, ollama, nginx) + systemd services for Next.js staging/production
- Next.js: `output: 'standalone'` in next.config.js, builds to `.next/standalone/`
- Deploy: Local `npm run build` → `./scripts/deploy.sh production` on VPS
- Ollama: `docker-compose exec ollama ollama pull llama3.2:3b`
- Fallback: If Ollama unavailable, AI features degrade gracefully (try/catch in automation code)
