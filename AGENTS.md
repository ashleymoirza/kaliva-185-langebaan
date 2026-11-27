Agentic AI Accommodation Platform - SDLC Agent SOP

Universal Guidelines

Agentic Workflows: All AI-driven tasks (e.g., Dynamic Pricing, Guest Inquiry Resolution, Maintenance Dispatch) must run on the local Ollama instance before suggesting changes to the codebase or live environment.
Local-Only AI: Use Ollama exclusively. No cloud LLMs (e.g., OpenAI, Anthropic) are permitted for inference to ensure data privacy and low latency.
Performance First: Optimize for <2s response time for guest-facing queries and <5s for backend processing. High throughput is critical for peak booking seasons.
Security: No hardcoded secrets. Use environment variables for all database credentials, payment gateway keys (e.g., PayFast/Yoco/Ozow), and API tokens. Sanitize all user inputs to prevent SQLi and XSS.
Bite-Sized Delivery: Break tasks into small, shippable chunks (e.g., "Guest Review Sentiment Analysis" as a standalone module).
Async First: Prefer asynchronous operations for heavy AI computations (e.g., generating weekly occupancy reports, processing image uploads for listings).
VPS Details - Hosting:  VPS AMD EPYC Servers IP Address: 105.29.227.42 | Password: Jesuslovesyou@07
Provider: Local South African VPS
IP Address: [REDACTED - Securely Injected via CI/CD Secrets]
Credentials: Managed via HashiCorp Vault or Docker Secrets (never shared in plain text).
Ollama Model: The local Ollama instance hosts a quantized model (e.g., llama3:8b or mistral:7b) optimized for hospitality-specific tasks. This model is used for all automation agents.
Reasoning Budget: Set reasoning tokens to low for all agent calls to minimize tokenization costs and latency. Only high-complexity architectural decisions may use moderate reasoning.


Stage 1: Planning & Requirements Analyst

Handled by: Product Manager / Hospitality Domain Expert
Skill Path: skills/planning/prompt.md
Role: Defines the "Seamless Langebaan Stay" value proposition. Identifies target personas (e.g., weekend families, long-term remote workers, festival attendees). Maps out booking flow features: real-time availability, deposit handling, and local experience add-ons (e.g., boat rentals, fishing charters).

Stage 2: Design & Architecture

Handled by: Software Architect / UI/UX Designer
Skill Path: skills/architect/prompt.md
Role: Designs a mobile-first, high-conversion booking interface. Architect the real-time calendar sync (iCal compatibility with Airbnb/Booking.com) and the host dashboard for managing Kaliva 185’s specific unit types (e.g., Family Unit, Studio). Ensure WCAG 2.1 AA compliance for accessibility.

Stage 3: Development (Coding)

Handled by: Backend Engineer, Frontend Architect
Skill Path: skills/backend/prompt.md & skills/frontend/prompt.md
Role:

Backend: Builds the core booking engine, payment integration (Stripe/PayFast), and user authentication. Implements the database schema for reservations, guests, and payments.
Frontend: Develops the React/Vue.js client portal with real-time availability checks, interactive map of Langebaan, and secure payment checkout.

AI Integration: Embeds the Ollama client for guest-facing chatbots and internal sentiment analysis.

Stage 4: Automation Engineering
Handled by: Automation Engineer
Skill Path: skills/automation/prompt.md
Role: Creates agentic workflows powered by local Ollama:

Guest Inquiry Agent: Answers FAQs about check-in, parking, and local attractions using retrieved data from the knowledge base.

Dynamic Pricing Agent: Analyzes local event calendars (e.g., Langebaan Festival) and historical occupancy to suggest price adjustments.

Maintenance Dispatcher: Parses guest maintenance requests via email/chat, classifies urgency, and creates tickets in the property management system.
Review Response Agent: Drafts personalized responses to guest reviews based on sentiment analysis.

Stage 5: Testing & Quality Assurance (QA)
Handled by: QA Engineer
Skill Path: skills/qa/prompt.md
Role:

Tests booking flow end-to-end (guest to confirmation).
Validates AI agent accuracy (e.g., does the pricing agent suggest reasonable rates?).
Conducts load testing to ensure the system handles concurrent bookings during peak sales.
Security audit: Penetration test for payment data leaks and SQL injection vulnerabilities.

Stage 6: Deployment
Handled by: DevOps Engineer
Skill Path: skills/devops/prompt.md
Role:

Deploys the application to the secure VPS using Docker Compose.
Configures Nginx as a reverse proxy with SSL/TLS encryption.
Sets up automated backups for the PostgreSQL database.
Ensures the Ollama service is running with optimized GPU/CPU allocation for low-latency inference.
Implements CI/CD pipelines for automated testing and deployment.

Stage 7: Maintenance & Monitoring
Handled by: DevOps Engineer / Developer
Skill Path: skills/devops/prompt.md
Role:

Monitors system health (CPU, RAM, Disk) and Ollama inference latency.
Tracks booking conversion rates and guest satisfaction scores.
Manages model updates for the local Ollama instance.
Handles incident response for downed services or payment gateway failures.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
