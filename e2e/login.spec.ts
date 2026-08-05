import { expect, test } from '@playwright/test'

test('development login werkt met demo-fallback wanneer Postgres niet draait', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Naam').selectOption('Bert')
  await page.getByLabel('Pincode').fill('2525')
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page.getByRole('heading', { name: 'Admin dashboard' })).toBeVisible()
})
