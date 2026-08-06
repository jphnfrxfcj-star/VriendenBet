import { spawnSync } from 'node:child_process'

const fallbackDatabaseUrl = 'postgresql://placeholder:placeholder@localhost:5432/mielbet?schema=public'
const databaseUrl = process.env.DATABASE_URL
const hasRealDatabaseUrl =
  typeof databaseUrl === 'string' &&
  /^(postgresql|postgres):\/\//.test(databaseUrl) &&
  !databaseUrl.includes('PASTE_YOUR_POSTGRES_CONNECTION_STRING_HERE') &&
  !databaseUrl.includes('USER:PASSWORD@HOST')

const env = {
  ...process.env,
  DATABASE_URL: hasRealDatabaseUrl ? databaseUrl : fallbackDatabaseUrl,
}

run('npx', ['prisma', 'generate'], env)

if (hasRealDatabaseUrl) {
  run('npx', ['prisma', 'migrate', 'deploy'], env)
} else {
  console.warn(
    'Skipping `prisma migrate deploy` because DATABASE_URL is not configured with a real Postgres connection string.',
  )
}

run('npx', ['next', 'build'], env)

function run(command, args, env) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env,
    shell: false,
  })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}
