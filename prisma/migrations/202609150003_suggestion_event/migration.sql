ALTER TABLE "Event" ADD COLUMN "sourceSuggestionId" TEXT;
CREATE UNIQUE INDEX "Event_sourceSuggestionId_key" ON "Event"("sourceSuggestionId");
ALTER TABLE "Event" ADD CONSTRAINT "Event_sourceSuggestionId_fkey" FOREIGN KEY ("sourceSuggestionId") REFERENCES "GameSuggestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
