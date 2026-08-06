# MielBet

MielBet is een ludieke, besloten sportsbook-app voor een vrijgezellenweekend. Er wordt alleen met virtuele credits gespeeld. De app bevat geen echte betalingen, betaalprovider, cash-outflow of koppeling met echte gokbedrijven.

## Concept

De app heeft drie gescheiden modules:

- Dynamische weekendspellen: admins maken speltemplates, selecteren eigenschappen en gewichten, Miel stelt teams samen en de server berekent odds.
- Miels voetbalwedstrijd: admins beheren voetbalmarkten en odds, Miel combineert toegestane selecties in een betbuilder.
- Miel Smash: een originele virtuele 3x3 slotmachine met Miel-walletcredits, server-side spins, free spins, jackpots en een adminconfiguratie.

Alleen Miel kan inzetten en alleen Miel heeft een wallet. Bert en Jean zijn admins. Andere deelnemers zijn viewers en kunnen spelvoorstellen indienen.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui-stijl componenten in `components/ui`
- PostgreSQL
- Prisma ORM
- Zod
- React Hook Form
- HTTP-only sessiecookies
- bcrypt voor pincodes
- Vitest
- Playwright
- Netlify deployment

## Lokaal starten

```bash
cp .env.example .env
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Open daarna `http://localhost:3000`.

Heb je lokaal nog geen PostgreSQL draaien, dan gebruikt de login in development een demo-fallback. Kies `Bert`, `Jean` of `Miel` en gebruik pin `2525`. In productie is deze fallback uitgeschakeld, tenzij je expliciet `ALLOW_DEMO_LOGIN=true` zet.

## Environment Variables

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mielbet?schema=public"
SESSION_SECRET="minstens-32-karakters-lang"
SEED_PIN="2525"
LOGIN_RATE_LIMIT_WINDOW_SECONDS="60"
LOGIN_RATE_LIMIT_MAX_ATTEMPTS="8"
ALLOW_DEMO_LOGIN="false"
```

Gebruik in productie een lange willekeurige `SESSION_SECRET` en een expliciete `SEED_PIN`. Pincodes worden alleen gehasht opgeslagen en worden niet op productiepagina's of in normale logs getoond.

## Database

Het Prisma-schema staat in `prisma/schema.prisma`. De eerste migratie staat in `prisma/migrations/202608060001_initial_mielbet`. Slotmodellen staan in `prisma/migrations/202608060002_miel_smash_slot`. Het model maakt onderscheid tussen users, fysieke deelnemers, eigenschappen, templates, events, teams, odds, bets, football markets, betbuilders, slotconfiguraties, spins, jackpots, challenges, wallettransacties, spelvoorstellen en auditlogs.

Belangrijke regels:

- `ParticipantAttribute` gebruikt een samengestelde sleutel op `participantId` en `attributeId`.
- `GameTemplateAttribute` gebruikt een samengestelde sleutel en de applicatielaag valideert dat gewichten samen 1,00 zijn.
- `EventBet` gebruikt een unieke sleutel op `eventId` en `mielUserId`.
- `EventTeamMember` voorkomt dat een deelnemer binnen hetzelfde evenement in meerdere teams zit.

## Seeddata

`npm run db:seed` maakt Bert en Jean als `ADMIN`, Miel als `MIEL`, alle andere deelnemers als `VIEWER`, Miels wallet met 1.000 credits, eigenschappen, scores, vijf speltemplates, een touwtrekken 4v4-event, een voorbeeldvoetbalwedstrijd en een actieve Miel Smash-configuratie.

Voor lokale ontwikkeling kun je de tijdelijke pincode zetten via `SEED_PIN`. Zonder `SEED_PIN` gebruikt het seedscript lokaal `2525`; in productie weigert het script zonder expliciete `SEED_PIN`.

## Odds

De oddsservice staat in `lib/odds.ts`.

Voor elke deelnemer:

```text
participantGameScore = som(normalizedAttributeScore * attributeWeight)
```

Voor teams gebruikt MielBet het gemiddelde van de individuele scores:

```text
teamScore = gemiddelde participantGameScore
```

Daarna:

```text
adjustedStrength = teamScore ^ sensitivity
probability = adjustedStrength / som(adjustedStrength)
calculatedOdds = 1 / (probability * (1 + margin))
finalOdds = overriddenOdds ?? calculatedOdds
```

De standaardmarge is 10%, de standaardgevoeligheid is 1,20, minimum odd is 1,10 en maximum odd is standaard 15,00. Odds worden op twee decimalen afgerond. De oorspronkelijke `calculatedOdds` blijft bewaard wanneer een admin een override instelt.

## Eligibility

De centrale regels staan in `lib/eligibility.ts`.

- Teamspel: als Miel in Team A zit, mag hij alleen Team A kiezen.
- Individueel spel: als Miel deelneemt, mag hij alleen zichzelf kiezen.
- Spel zonder Miel: Miel mag vrij kiezen.
- Voetbal: manipuleerbare of negatieve persoonlijke selecties worden geblokkeerd wanneer Miel speelt.

De server mag nooit vertrouwen op saldo, odds, payout of eligibility vanuit de client. Kritieke acties moeten via Prisma-transacties lopen.

## Wallet

Alleen Miel heeft een wallet. Elke saldoverandering maakt een `WalletTransaction`. Inzetten, settlement en refunds moeten atomair gebeuren. Admincorrecties vereisen een reden en mogen het saldo niet negatief maken.

## Miel Smash

Miel Smash staat op `/slot`, live read-only op `/slot/live` en adminbeheer op `/admin/slot`.

- Originele Vegas- en jungle-geinspireerde slot, zonder bestaande casino-assets, merknamen of beschermde personages.
- Alleen gebruiker met rol `MIEL` kan spins uitvoeren. Admins beheren configuratie en zien statistieken, maar kiezen nooit een specifiek volgend resultaat.
- Credits zijn uitsluitend virtueel, hebben geen geldwaarde, kunnen niet gekocht worden en kunnen niet gecasht worden.
- De MVP gebruikt 3 rollen, 3 rijen, 5 paylines, inzetniveaus 5/10/25/50 credits, wild, scatter, bonuswiel, free spins, Miel Smash-features en MINI/MAJOR/MIELPOT-jackpots.
- Symbolen, gewichten, multipliers, paylines, inzetniveaus, featurefrequenties, bonuswielsegmenten, jackpots en maximumwinst zijn database-configureerbaar.
- Gepubliceerde configuraties worden niet destructief aangepast. Admins maken een conceptversie en publiceren die als nieuwe actieve versie.
- Iedere spin krijgt een idempotency key met unieke constraint op gebruiker plus key, zodat retries geen dubbele inzet of dubbele uitbetaling veroorzaken.
- De browser berekent geen winst en wijzigt geen wallet. Randomness, grid, features, bonuswiel, jackpots en walletmutaties gebeuren server-side in Prisma-transacties.
- Spinresultaten bewaren initialGrid, finalGrid, paylines, base/scatter/feature/bonus/jackpotwin, uncappedWin, finalWin, saldo voor/na en free spins.
- Free spins zitten in aparte sessies. De oorspronkelijke inzet blijft vast; free spins trekken geen inzet af.
- Maximumwinst wordt per spin gecapt op `maxWinMultiplier * stake`; `uncappedWin` blijft bewaard voor adminstatistieken.
- Reduced motion wordt ondersteund via browservoorkeur en een handmatige instelling: volledige animaties, beperkt of overslaan.
- Audio staat bewust als UI-toggle/fallback klaar, maar er zijn nog geen echte audiobestanden meegeleverd. Gebruik alleen originele of licentievrije audio.
- Placeholderassets voor de Miel-gorilla staan onder `public/slot/miel-gorilla/*/placeholder.svg` en kunnen later vervangen worden door Rive, Lottie, sprites of transparante WebM.

Simulatie zonder wallet- of databasewijzigingen:

```bash
npm run slot:simulate -- --spins=100000 --seed=12345 --stake=10
```

De simulatie gebruikt reproduceerbare test-randomness met seed. Productiespins gebruiken cryptografisch veilige randomness vanuit de serverruntime. De initiële seed streeft naar ongeveer 90% tot 95% theoretische RTP, maar de effectieve RTP moet via simulatie en configuratietuning bevestigd worden.

## Betbuilder

De betbuilderlogica staat in `lib/football.ts`.

```text
rawCombinedOdds = product(selection.finalOdds)
calculatedOdds = rawCombinedOdds * correctionFactor
finalOdds = overriddenOdds ?? calculatedOdds
```

De MVP ondersteunt incompatibele combinaties, afhankelijke combinaties als metadata, correctiefactor, adminoverride en settlementregels voor WON, LOST en VOID selecties.

## Tests

```bash
npm run typecheck
npm run lint
npm run test
npm run test:e2e
```

De huidige tests dekken authenticatiehelpers, rolbeveiliging, weekendodds, Miel-eligibility, voetbalbetbuilder, settlement en walletregels.
Slottests dekken de pure engine voor raster/paylines, wilds, scatters, idempotencygevoelige servercontracten via de datalaag waar mogelijk, maximumwinst en reproduceerbare simulatie.

## Netlify

Netlify ondersteunt moderne Next.js App Router-projecten met SSR en Server Actions via de OpenNext adapter. De repository bevat `netlify.toml` met:

```toml
[build]
  command = "npm run build:netlify"
  publish = ".next"
```

Zet minstens `DATABASE_URL`, `SESSION_SECRET` en `SEED_PIN` in Netlify Environment Variables. `build:netlify` voert `prisma migrate deploy` uit voor `next build` zodra `DATABASE_URL` een echte Postgres connection string bevat. Als `DATABASE_URL` nog ontbreekt of nog een placeholder is, wordt migratie overgeslagen zodat een eerste UI-deploy niet blokkeert; login/databaseflows werken dan pas na het instellen van de echte databasevariabele.

Gebruik voor deze codebase een Postgres-database met een Prisma-compatibele `DATABASE_URL`. De kleinste ingreep is Netlify Database of een andere managed Postgres gebruiken en de connection string als `DATABASE_URL` zetten. Laat `ALLOW_DEMO_LOGIN` leeg of `false` in productie.

Gebruik `netlify.env.example` als veilige template en `docs/netlify-env.md` als checklist voor scopes en contexts. Zet echte secrets via Netlify UI of CLI, niet in `netlify.toml`.

Seeddata wordt bewust niet automatisch tijdens elke Netlify build gedraaid. Run na de eerste migratie eenmalig:

```bash
SEED_PIN="jouw-productie-pin" npm run db:seed
```

Doe dat tegen dezelfde productie-`DATABASE_URL`, bijvoorbeeld via Netlify CLI/env of vanuit een veilige lokale shell.

Heb je de bestaande database al eerder geseed en wil je alleen Miel Smash toevoegen na deze migratie, gebruik dan:

```bash
npm run db:seed:slot
```

## Bekende MVP-beperkingen

- De UI toont op veel pagina's demo-data, terwijl de Prisma-modellen en server actions klaarstaan voor echte databaseflows.
- Admin CRUD-schermen zijn overzichtspagina's; volledige create/edit-formulieren zijn de volgende stap.
- Login rate limiting is in-memory en moet in productie vervangen worden door een gedeelde store.
- Settlementacties zijn als pure services en datamodel aanwezig; volledige admin settlement-serveractions moeten nog gekoppeld worden aan de UI.
- Miel Smash heeft originele SVG-placeholderart en geen echte audio-assets. Definitieve artwork/audio kan later via dezelfde assetpaden of animatie-adapter worden vervangen.

## Volgende uitbreidingen

- Volledige admin CRUD voor deelnemers, eigenschappen, templates, events en voetbalmarkten.
- Echte team-builder met drag/drop of compacte mobiele selectors.
- Atomische Prisma-transacties voor plaatsing en settlement via server actions.
- Auditlogfilters en export.
- Netlify productiepipeline met database-migratiestap.
