-- Fixed-window attempt counters backing login and signup throttling.
CREATE TABLE "rate_limit_counters" (
    "key" VARCHAR(320) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "reset_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limit_counters_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "rate_limit_counters_reset_at_idx" ON "rate_limit_counters"("reset_at");
