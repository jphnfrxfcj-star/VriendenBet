import { expect, test } from '@playwright/test'

test('development login werkt met demo-fallback wanneer Postgres niet draait', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Naam').selectOption('Bert')
  await page.getByLabel('Pincode').fill('2525')
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page.getByRole('heading', { name: 'Admin dashboard' })).toBeVisible()
})

test('Miel kan ploegen aanpassen voor een weekendspel', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Naam').selectOption('Miel')
  await page.getByLabel('Pincode').fill('2525')
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page.getByRole('heading', { name: 'MielBet' })).toBeVisible()

  await page.goto('/weekendspellen/touwtrekken-4v4')
  await expect(page.getByRole('heading', { name: 'Team-builder actief' })).toBeVisible()
  await page.getByLabel('Bert verwijderen uit Team Groen').click()
  await page
    .locator('div')
    .filter({ has: page.getByRole('heading', { name: 'Team Groen' }) })
    .getByRole('button', { name: 'Jan Kestens' })
    .first()
    .click()

  await expect(page.getByText('Jan Kestens').first()).toBeVisible()
  await expect(page.getByText('Live scores en odds')).toBeVisible()
})
