import { z } from "zod";

/** Version-independent validators (regex rather than z.email(), which moved in Zod 4). */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const isoDate = z.string().trim().regex(ISO_DATE, "Use the format YYYY-MM-DD");
export const emailField = z.string().trim().toLowerCase().regex(EMAIL, "Enter a valid email address");

export const bookingSchema = z
  .object({
    unitSlug: z.string().trim().min(1, "Select an apartment"),
    checkIn: isoDate,
    checkOut: isoDate,
    guests: z.coerce.number().int().min(1, "At least one guest").max(10, "Maximum 10 guests"),
    name: z.string().trim().min(2, "Please enter your name").max(120),
    email: emailField,
    phone: z.string().trim().min(6, "Enter a contact number").max(40),
    requests: z.string().trim().max(1000).optional().default(""),
    referral: z.string().trim().max(300).optional().default(""),
    paymentMethod: z.enum(["payfast", "stripe", "ozow", "enquiry"]).optional().default("enquiry"),
    acceptTerms: z
      .boolean()
      .refine((v) => v === true, "Please accept the terms and house rules"),
  })
  .refine((d) => d.checkOut > d.checkIn, {
    message: "Check-out must be after check-in",
    path: ["checkOut"],
  });

export type BookingInput = z.infer<typeof bookingSchema>;

export const availabilityQuerySchema = z.object({
  unitSlug: z.string().trim().min(1),
  from: isoDate.optional(),
  to: isoDate.optional(),
});

export const quoteQuerySchema = z
  .object({
    unitSlug: z.string().trim().min(1),
    checkIn: isoDate,
    checkOut: isoDate,
    guests: z.coerce.number().int().min(1).max(10).optional().default(2),
  })
  .refine((d) => d.checkOut > d.checkIn, {
    message: "Check-out must be after check-in",
    path: ["checkOut"],
  });

export const loginSchema = z.object({
  email: z.string().trim().min(3).max(200),
  password: z.string().min(1).max(200),
  next: z.string().max(300).optional().default("/admin"),
});

export const pricingOverrideSchema = z.object({
  depositPercent: z.coerce.number().min(0).max(100).optional(),
  highSeasonMonths: z.array(z.coerce.number().int().min(1).max(12)).max(12).optional(),
  weekendSurcharge: z.coerce.number().min(0).max(2).optional(),
  minNightsLow: z.coerce.number().int().min(1).max(30).optional(),
  minNightsPeak: z.coerce.number().int().min(1).max(30).optional(),
  lastMinuteDays: z.coerce.number().int().min(0).max(90).optional(),
  lastMinuteDiscount: z.coerce.number().min(0).max(0.9).optional(),
  cleaningFeeCents: z.coerce.number().int().min(0).optional(),
  peakMultiplier: z.coerce.number().min(0.5).max(5).optional(),
  roomPrices: z
    .record(
      z.string(),
      z.object({
        lowCents: z.coerce.number().int().min(0).max(10000000),
        highCents: z.coerce.number().int().min(0).max(10000000),
      }),
    )
    .optional(),
});

export const blockDatesSchema = z
  .object({
    unitSlug: z.string().trim().min(1),
    from: isoDate,
    to: isoDate,
    reason: z.string().trim().max(200).optional().default("Blocked by admin"),
  })
  .refine((d) => d.to >= d.from, { message: "End date must be on/after start date", path: ["to"] });

/** Flatten Zod issues into a { field: message } map for form display. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}


export const propertySchema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9-]{1,60}$/, "Use lowercase letters, numbers and hyphens"),
  name: z.string().trim().min(2, "Enter a name").max(120),
  tagline: z.string().trim().max(160).optional().default(""),
  location: z.string().trim().max(160).optional().default(""),
  description: z.string().trim().max(4000).optional().default(""),
  images: z.array(z.string().trim().max(500)).max(30).optional().default([]),
  amenities: z.array(z.string().trim().max(60)).max(30).optional().default([]),
  featured: z.boolean().optional().default(false),
  active: z.boolean().optional().default(true),
});
