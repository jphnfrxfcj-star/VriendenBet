# Spellen en aanvragen

Ga naar **Beheer → Spellen en aanvragen**. Hier staan nieuwe spellen, openstaande aanvragen en het spellenoverzicht samen.

## Zelf een spel toevoegen

1. Vul de spelnaam, het aantal teams en spelers **per team** in. Twee teams met één speler is 1 tegen 1; met drie spelers is het 3 tegen 3.
2. Klik **Spel toevoegen**. De teams worden meteen aangemaakt en je gaat naar de spelerskeuze.
3. Kies de spelers en klik **Teams opslaan**. De odds worden automatisch berekend.
4. Ga terug naar spelbeheer en klik **Open voor inzetten**.
5. Na het spel kies je de winnaar bij **Winnaar kiezen of spel annuleren**.

Teamnamen, spelregels, startmoment en parameters zijn optioneel. Zonder parameterkeuze tellen alle actieve parameters even zwaar mee. Er hoeft geen template te worden aangemaakt of gekozen; instellingen worden per spel bewaard met het bestaande datamodel.

## Aanvragen beoordelen

Iedereen kan zonder login een spel aanvragen met naam, teams en spelers per team. Omschrijving, regels en parameters zijn optioneel. Bij een ingelogde aanvraag wordt de gebruiker getoond; anders staat de aanvraag als anoniem in het beheer.

Onder **Spelaanvragen** controleert de beheerder de aantallen en klikt **Goedkeuren en spel toevoegen**. De aanvraag wordt meteen een spel in zowel het beheer als het publieke overzicht. Een afgewezen aanvraag maakt geen spel aan. Afgehandelde aanvragen blijven terug te vinden, inclusief een link naar het spel.

Herhaald goedkeuren maakt geen tweede spel: de koppeling is uniek in de database. Oudere aanvragen met status Goedgekeurd maar zonder gekoppeld spel staan nog bij de te verwerken aanvragen.

De oude beheerpagina's voor templates en voorstellen verwijzen naar het centrale overzicht.

## Aantal spelers wijzigen

Bij bestaande spellen kunnen admins **Spelers per team** wijzigen in het beheer of op de spelpagina. De wijziging geldt alleen voor dit spel. Gekozen spelers blijven behouden; pas de teams zo nodig aan en sla ze opnieuw op. Oude odds worden gewist. Na een geplaatste inzet of zodra het spel gestart is, staat het aantal vast.

## Uitrollen

Voer de Prisma-migratie `202609150003_suggestion_event` uit vóór gebruik (`npm run db:deploy` met DATABASE_URL ingesteld). De Netlify-build doet dit automatisch. De migratie voegt een optionele, unieke koppeling tussen een aanvraag en het aangemaakte spel toe; bestaande spellen blijven behouden.
