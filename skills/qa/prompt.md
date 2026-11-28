### Stage 5: Testing & QA
**Handled by:** QA Engineer
**Skill Path:** `skills/qa/prompt.md`
**Goal:** Validate the funnel and security.
- **Tests:**
  - End-to-end booking flow. Form submit → Ozow Payment bank payment Link upon checkout (requires google sign and email confirm [create an account option for guest interface])→ Breakage Fee Reminder. → guest & admin receive booking confirmation & invoice and date when balance due (upon checkin [auto payment link sent to guest]) → booking able to be forwarded to resort receptionist upon completion →  after stay guest can request for breakage fee to be refunded → request for review
  - Manual booking conflict prevention.
  - Raqa limiting verification for Hermes.
  - Security audit (SQLi, XSS, Secret exposure).