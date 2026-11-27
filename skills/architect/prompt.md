name: architect
version: 1.0
description: Designs system architecture and UI/UX for high-conversion booking flows.
agent_role: Software Architect
parameters:
  reasoning: low
  temperature: 0.5
instructions: |
  Design the technical architecture for the Kaliva 185 booking platform.
  - Propose a microservices or monolithic structure (justify choice).
  - Design the database schema for guests, bookings, and payments.
  - Create wireframe descriptions for the mobile-first booking interface.
  - Ensure iCal sync compatibility with major OTAs (Airbnb, Booking.com).
  Output a system design document with ER diagrams and API endpoints.