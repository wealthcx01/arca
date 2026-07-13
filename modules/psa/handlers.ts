import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { getDb } from "../../db";
import { createId } from "../../src/lib/nanoid";
import { certVerifications } from "../portfolio/schema";

export const psaRouter = new Hono();

const PSA_API_BASE = "https://api.psacard.com/publicapi/cert/GetByCertNumber";
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface PsaResponse {
  PSACert: {
    CertNumber: string;
    Grade: string;
    CardName: string;
    Year: string;
    Brand: string;
    Variety: string;
    Population: number;
  };
}

/**
 * GET /api/psa/verify/:certNumber
 * Verify a PSA cert number. Uses cache (30-day TTL).
 */
psaRouter.get("/verify/:certNumber", async (c) => {
  const certNumber = c.req.param("certNumber");

  if (!certNumber || certNumber.length < 5) {
    return c.json({ error: "Invalid cert number" }, 400);
  }

  const db = getDb();

  // Check cache
  const cached = db
    .select()
    .from(certVerifications)
    .where(eq(certVerifications.cert_number, certNumber))
    .get();

  if (cached) {
    const age = Date.now() - new Date(cached.verified_at).getTime();
    if (age < CACHE_TTL_MS) {
      return c.json({
        ...cached,
        from_cache: true,
      });
    }
  }

  // Call PSA API
  try {
    const response = await fetch(`${PSA_API_BASE}/${certNumber}`, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        // Not found — cache the negative result
        const id = cached?.id ?? createId();
        if (cached) {
          db.update(certVerifications)
            .set({
              status: "not_found",
              verified_at: new Date(),
            })
            .where(eq(certVerifications.id, cached.id))
            .run();
        } else {
          db.insert(certVerifications)
            .values({
              id,
              cert_number: certNumber,
              grading_company: "PSA",
              status: "not_found",
              verified_at: new Date(),
            })
            .run();
        }

        return c.json({
          cert_number: certNumber,
          status: "not_found",
          message: "Certificate number not found in PSA database",
        });
      }

      if (response.status === 429) {
        return c.json(
          {
            error: "Daily PSA API limit reached (100 calls). Try again tomorrow.",
            status: "rate_limited",
          },
          429,
        );
      }

      return c.json(
        {
          error: `PSA API error: ${response.status}`,
          status: "error",
        },
        502,
      );
    }

    const data = (await response.json()) as PsaResponse;
    const cert = data.PSACert;

    // Upsert cache
    const id = cached?.id ?? createId();
    const values = {
      cert_number: certNumber,
      grading_company: "PSA",
      card_name: cert.CardName || null,
      grade: cert.Grade || null,
      year: cert.Year || null,
      brand: cert.Brand || null,
      variety: cert.Variety || null,
      population: cert.Population ?? null,
      status: "verified" as const,
      raw_response: JSON.stringify(data),
      verified_at: new Date(),
    };

    if (cached) {
      db.update(certVerifications).set(values).where(eq(certVerifications.id, cached.id)).run();
    } else {
      db.insert(certVerifications)
        .values({ id, ...values })
        .run();
    }

    return c.json({
      cert_number: certNumber,
      grading_company: "PSA",
      card_name: cert.CardName,
      grade: cert.Grade,
      year: cert.Year,
      brand: cert.Brand,
      variety: cert.Variety,
      population: cert.Population,
      status: "verified",
      from_cache: false,
    });
  } catch (err) {
    console.error("PSA API error:", err);
    return c.json(
      {
        error: "Failed to verify cert number",
        status: "error",
      },
      502,
    );
  }
});

/**
 * GET /api/psa/status/:certNumber
 * Get cached verification status without calling API.
 */
psaRouter.get("/status/:certNumber", (c) => {
  const certNumber = c.req.param("certNumber");
  const db = getDb();

  const cached = db
    .select()
    .from(certVerifications)
    .where(eq(certVerifications.cert_number, certNumber))
    .get();

  if (!cached) {
    return c.json({ status: "unverified", cert_number: certNumber });
  }

  return c.json(cached);
});
