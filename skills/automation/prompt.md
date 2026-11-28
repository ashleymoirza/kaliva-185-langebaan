### Stage 4: Automation Engineering
**Handled by:** Automation Engineer
**Skill Path:** `skills/automation/prompt.md`
**Goal:** Create agentic workflows using local Ollama.
- **Workflows:**
  1. **Lead Nurturing:** Form submit → Ozow Payment bank payment Link upon checkout (requires google sign and email confirm [create an account option for guest interface])→ Breakage Fee Reminder. → guest & admin receive booking confirmation & invoice and date when balance due (upon checkin [auto payment link sent to guest]) → booking able to be forwarded to resort receptionist upon completion →  after stay guest can request for breakage fee to be refunded → request for review
  2. **Payment Confirmation:** Ozow Webhook → Update DB → Send Confirmation Email.
  3. **Admin Assistant (New):** Local chatbot inside Admin Dashboard. It can:
     - Suggest tasks (e.g., "Add manual booking for [Name]").
     - Audit the site for errors.
     - Ask for user confirmation before making changes.
- **Constraint:** Use smallest Ollama model. Rate limit agent calls.
