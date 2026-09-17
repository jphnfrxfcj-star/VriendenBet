import { expect, test } from '@playwright/test'

test('mobiel menu maakt spelaanvragen bereikbaar zonder login', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Meer', exact: true }).click()
  const menu = page.getByRole('dialog')
  await expect(menu).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(menu).not.toBeVisible()
  await page.getByRole('button', { name: 'Meer', exact: true }).click()
  await menu.getByRole('link', { name: 'Spel aanvragen' }).click()
  await expect(page).toHaveURL(/\/spel-voorstellen$/)
  await expect(menu).not.toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360)
})

test('mobiele kernnavigatie toont sportsbook flows', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'MielBet' })).toBeVisible()
  await page.locator('a[href="/weekendspellen"]:visible').first().click()
  await expect(page.getByRole('heading', { name: 'Weekendspellen', exact: true })).toBeVisible()
  await page.locator('a[href="/match"]:visible').first().click()
  await expect(page.getByRole('heading', { name: 'Miels laatste match' })).toBeVisible()
  await page.locator('a[href="/slot"]:visible').first().click()
  await expect(page.getByRole('heading', { name: 'Miel Smash' })).toBeVisible()
})
