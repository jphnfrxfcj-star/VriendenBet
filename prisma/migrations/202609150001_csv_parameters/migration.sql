-- Preserve existing scores and template references when renaming the old label.
UPDATE "Attribute"
SET "name" = 'Lucky factor', "updatedAt" = CURRENT_TIMESTAMP
WHERE "name" = 'geluk'
  AND NOT EXISTS (SELECT 1 FROM "Attribute" WHERE "name" = 'Lucky factor');

-- Add the CSV's rating parameters without overwriting existing configuration.
INSERT INTO "Attribute" ("id", "name", "minValue", "maxValue", "isActive", "createdAt", "updatedAt")
SELECT 'csv-miel-parameter-' || ordinal, name, 1, 10, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
  (1, 'kracht'),
  (2, 'uithouding'),
  (3, 'behendigheid'),
  (4, 'IQ'),
  (5, 'EQ'),
  (6, 'bereidheid om te neuken'),
  (7, 'balgevoel'),
  (8, 'communicatie'),
  (9, 'testosteron'),
  (10, 'fijne motoriek'),
  (11, 'lenigheid'),
  (12, 'Lucky factor'),
  (13, 'alcoholbestendigheid')
) AS parameters(ordinal, name)
ON CONFLICT ("name") DO NOTHING;
