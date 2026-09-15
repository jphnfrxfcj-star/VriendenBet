# Weekendspellen toevoegen

Ga naar **Beheer → Weekendspellen**.

1. Vul de spelnaam en het aantal spelers **per team** in. De app maakt altijd twee teams aan: bij 3 spelers per team wordt het 3 tegen 3.
2. Klik **Spel toevoegen**. Je gaat meteen naar de spelerskeuze.
3. Kies de spelers en klik **Teams opslaan**. De odds worden automatisch berekend.
4. Ga terug naar spelbeheer en klik **Open voor inzetten**.
5. Na het spel kies je de winnaar bij **Winnaar kiezen of spel annuleren**. Geplaatste weddenschappen worden dan afgehandeld.

Teamnamen, spelregels, startmoment en parameters zijn optioneel. Zonder een parameterkeuze tellen alle actieve parameters even zwaar mee. Met een selectie tellen alleen de gekozen parameters mee, eveneens even zwaar.

Bestaande conceptspellen krijgen de knop **Spel klaarzetten**. Die maakt ontbrekende teams aan en opent de spelerskeuze. Bestaande teams, deelnemers en weddenschappen blijven behouden.

Een apart speltype aanmaken is niet meer nodig. De app bewaart de instellingen per nieuw spel met het bestaande datamodel; er is hiervoor geen extra databasemigratie nodig.
