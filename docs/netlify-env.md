# Netlify Environment Variables

Netlify supports environment variables through the UI, CLI/API, and `netlify.toml`.
For this project, use the Netlify UI or CLI/API for secrets. Do not put real secret
values in `netlify.toml`, because config-file values are stored in the repository
and do not provide the same scope controls as Netlify-managed site variables.

## Required Variables

| Key | Context | Scope | Notes |
| --- | --- | --- | --- |
| `DATABASE_URL` | Production | Builds + Functions | Required by Prisma during `prisma migrate deploy` and at runtime for server queries. If missing, the Netlify build skips migrations and database login will not work yet. |
| `SESSION_SECRET` | Production | Functions | Required for signed HTTP-only session cookies. Must be at least 32 characters. |
| `SEED_PIN` | Production | Builds | Required when running the seed script against production. Use Functions scope only if `ALLOW_DEMO_LOGIN=true`. |
| `LOGIN_RATE_LIMIT_WINDOW_SECONDS` | Production | Functions | Optional. Defaults to `60`. |
| `LOGIN_RATE_LIMIT_MAX_ATTEMPTS` | Production | Functions | Optional. Defaults to `8`. |
| `ALLOW_DEMO_LOGIN` | Production | Functions | Optional. Leave unset or `false` in production. |

For Deploy Previews, use a separate preview database or omit `DATABASE_URL` if the
preview does not need login/database flows. Do not point previews at production data.

## Template

Use `netlify.env.example` as the safe template. Create a local ignored file:

```bash
cp netlify.env.example netlify.env
```

Fill in real values locally, then import them with the Netlify CLI if desired:

```bash
netlify env:import netlify.env
```

You can also paste the keys manually in Netlify:

Project configuration -> Environment variables.

## Production Seed

The Netlify build runs migrations through `npm run build:netlify`, but it does not
seed users automatically. After the first database setup, run the seed once against
the production database:

```bash
DATABASE_URL="postgresql://..." SEED_PIN="your-private-pin" npm run db:seed
```

After that, Bert, Jean and Miel can log in with the chosen production pin.
