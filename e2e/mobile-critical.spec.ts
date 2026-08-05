import { expect, test } from '@playwright/test'

test('mobiele kernnavigatie toont sportsbook flows', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'MielBet' })).toBeVisible()
  await page.locator('a[href="/weekendspellen"]:visible').first().click()
  await expect(page.getByRole('heading', { name: 'Dynamische weekendspellen' })).toBeVisible()
  await page.locator('a[href="/match"]:visible').first().click()
  await expect(page.getByRole('heading', { name: 'Miels laatste match' })).toBeVisible()
})
