CREATE TABLE "BookingCalendarEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingGroupId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "startValue" TEXT NOT NULL,
    "endValue" TEXT NOT NULL,
    "dateOnly" BOOLEAN NOT NULL DEFAULT false,
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "colorId" TEXT NOT NULL,
    "notionTaskType" TEXT,
    "transparency" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_CREATE',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastErrorCode" TEXT,
    "lastAttemptAt" DATETIME,
    "lastVerifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BookingCalendarEvent_bookingGroupId_fkey"
      FOREIGN KEY ("bookingGroupId") REFERENCES "BookingGroup" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "BookingCalendarEvent_eventId_key"
ON "BookingCalendarEvent"("eventId");

CREATE INDEX "BookingCalendarEvent_bookingGroupId_idx"
ON "BookingCalendarEvent"("bookingGroupId");

CREATE INDEX "BookingCalendarEvent_status_lastAttemptAt_idx"
ON "BookingCalendarEvent"("status", "lastAttemptAt");

CREATE INDEX "BookingCalendarEvent_status_lastVerifiedAt_idx"
ON "BookingCalendarEvent"("status", "lastVerifiedAt");
