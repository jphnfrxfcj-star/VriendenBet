# Deelnemers en scores via CSV

Open **Beheer → Deelnemers en scores** en kies de CSV bij **Deelnemers en scores importeren**.

1. Koppel elke CSV-naam aan een bestaande deelnemer of kies **Nieuwe deelnemer aanmaken**. Volledige namen en unieke bijnamen worden automatisch gekoppeld, ook bij omgekeerde naamvolgorde. Verkorte namen kies je zelf om dubbele deelnemers te voorkomen.
2. Controleer de scores. Komma- en puntdecimalen werken. Waarden buiten 0–10 en vrije tekst moet je corrigeren of leegmaken. Lege velden worden overgeslagen.
3. Bestaande scores en shirtmaten blijven standaard behouden. Vink **Bestaande scores en shirtmaten overschrijven** aan als de CSV deze moet vervangen. Bij de scores zie je de huidige waarde.
4. Klik **Deelnemers importeren**. De app slaat alles in één transactie op en toont hoeveel scores zijn opgeslagen of behouden.

Het Google Forms-bestand `Vrijgezellen Miel.csv` wordt rechtstreeks ondersteund: 16 deelnemers, 13 parameters. De waarden `1 meer dan lievens`, `-5` en `5?` vragen om controle. De app raadt geen vervangende score.

Een gedeeltelijke CSV met `Naam` en één of meer bekende parameterkolommen werkt ook. Zowel komma's als puntkomma's worden ondersteund, tot 200 deelnemers en 200 kB. Alleen namen, shirtmaten en ratingparameters worden ingelezen; dit maakt geen accounts aan en past geen wallets aan.

## Beheer

- Deelnemers en gebruikers zijn doorzoekbaar. Open alleen de persoon die je wilt aanpassen.
- Scores staan bij deelnemers en worden per persoon samen opgeslagen.
- Spelgewichten worden per speltype samen opgeslagen.
- Formulieren tonen voortgang en resultaat. Bij een fout blijft de invoer staan.
- Nieuwe deelnemers, accounts, parameters, speltypes en voetbalonderdelen staan in uitklapbare formulieren.

## Uitrollen

Voer de Prisma-migraties uit voordat je de nieuwe versie gebruikt (`npm run db:deploy` met de databaseverbinding ingesteld). De Netlify-build voert dit al automatisch uit wanneer `DATABASE_URL` is ingesteld. De nieuwe migratie zet scores om naar `DOUBLE PRECISION`, zodat bijvoorbeeld `2,5` behouden blijft. De import voegt ontbrekende parameters zelf toe en verruimt bestaande schalen wanneer een geïmporteerde score dat nodig maakt.

De bestaande demo-seed is niet bedoeld als import: deze kan scores opnieuw met demowaarden invullen. Gebruik de upload voor echte deelnemersgegevens.
