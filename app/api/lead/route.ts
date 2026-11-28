// Server-only module for lead handling
import { getDb } from "@/lib/db";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const FILE = path.join(process.cwd(), ".data", "store.json");

export async function GET(): Promise<NextResponse> {
  try {
    const db = await getDb();
    if (db) {
      const leads = await db.lead.findMany({
        orderBy: { visitedAt: "desc" },
      });
      return NextResponse.json(leads);
    }
    // Fallback to JSON file
    let leads: any[] = [];
    try {
      const data = JSON.parse(await fs.readFile(FILE, "utf8"));
      if (Array.isArray(data.leads)) leads = data.leads;
    } catch {}
    return NextResponse.json(leads);
  } catch (error) {
    console.error("[api/lead] Error fetching leads:", error);
    return NextResponse.json(
      { error: "Failed to fetch leads" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { email, name, phone, source, referralId } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const db = await getDb();

    if (db) {
      // Use Prisma
      const existingLead = await db.lead.findUnique({
        where: { email },
      });

      let lead;
      if (existingLead) {
        lead = await db.lead.update({
          where: { email },
          data: {
            name,
            phone,
            source: source || existingLead.source,
            referralId: referralId || existingLead.referralId,
            status: "contacted",
            visitedAt: new Date(),
          },
        });
      } else {
        lead = await db.lead.create({
          data: {
            email,
            name,
            phone,
            source: source || "direct",
            referralId,
            status: "new",
            visitedAt: new Date(),
          },
        });
      }
      return NextResponse.json(lead, { status: 201 });
    } else {
      // Fallback to JSON file storage
      let lead;
      // Read existing state
      let data: any = { bookings: [], blocked: [], messages: [], pricing: {}, leads: [] };
      try {
        const fileData = await fs.readFile(FILE, "utf8");
        data = JSON.parse(fileData);
        if (!Array.isArray(data.leads)) data.leads = [];
      } catch {}

      // Check if lead already exists
      const existingIndex = data.leads.findIndex((l: any) => l.email === email);

      if (existingIndex >= 0) {
        // Update existing
        data.leads[existingIndex] = {
          ...data.leads[existingIndex],
          name,
          phone,
          source: source || data.leads[existingIndex].source,
          referralId: referralId || data.leads[existingIndex].referralId,
          status: "contacted",
          visitedAt: new Date().toISOString(),
        };
      } else {
        // Create new
        const newLead = {
          id: randomUUID(),
          email,
          name,
          phone,
          source: source || "direct",
          referralId,
          status: "new",
          visitedAt: new Date().toISOString(),
          bookedAt: null,
          bookingId: null,
        };
        data.leads.push(newLead);
        lead = newLead;
      }

      // Save state
      await fs.mkdir(path.dirname(FILE), { recursive: true });
      await fs.writeFile(FILE, JSON.stringify(data, null, 2), "utf8");

      return NextResponse.json(lead, { status: 201 });
    }
  } catch (error) {
    console.error("[api/lead] Error creating lead:", error);
    return NextResponse.json(
      { error: "Failed to process lead" },
      { status: 500 }
    );
  }
}
