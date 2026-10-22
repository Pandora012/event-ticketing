import { test, expect, chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const password = 'Eventify-browser-2026!';
const localDate = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
async function accessible(page) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(
    result.violations.map((x) => ({
      id: x.id,
      nodes: x.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
    })),
  ).toEqual([]);
}
async function register(page, name, email, role = 'USER') {
  await page.goto('/register');
  await page.getByLabel('Your name').fill(name);
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('I’m here to').selectOption(role);
  await page.getByRole('button', { name: 'Create my account' }).click();
  await expect(page).toHaveURL(role === 'ORGANIZER' ? /\/dashboard$/ : /\/events$/);
}
test('editorial discovery, real image assets, filters, mobile navigation, and accessibility', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'The shape of next' })).toBeVisible();
  await page.locator('img').evaluateAll((images) => Promise.all(images.map((img) => img.decode())));
  expect(await page.locator('.feature-art img').getAttribute('src')).toBe('/art/design.svg');
  await accessible(page);
  await page.screenshot({ path: 'docs/screenshots/home-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'docs/screenshots/home-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Discover events' })
    .click();
  await expect(page.getByRole('heading', { name: 'Go where you’re curious.' })).toBeVisible();
  await page.getByLabel('Search events').fill('listening');
  await expect(page.locator('.event-card')).toHaveCount(1);
  await expect(page.locator('.event-card')).toContainText('After hours');
  await page.getByLabel('Search events').fill('');
  await page.getByLabel('Filter by category').selectOption('Food');
  await expect(page.locator('.event-card')).toHaveCount(1);
  await expect(page.locator('.event-card')).toContainText('A place at the table');
  await page.getByLabel('Search events').fill('not-a-real-event');
  await expect(page.getByRole('heading', { name: 'Nothing on this frequency.' })).toBeVisible();
  await accessible(page);
  await page.goto('/login');
  await accessible(page);
  expect(errors).toEqual([]);
});
test('organizer creates and edits an event; guest registers; manual check-in succeeds once', async ({
  browser,
  page,
}) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await register(page, 'Browser Host', 'browser-host@test.local', 'ORGANIZER');
  await page.getByRole('link', { name: 'Create event', exact: true }).click();
  await page.getByLabel('Event title').fill('A fictional browser gathering');
  await page.getByLabel('Event title').blur();
  await page
    .getByLabel('About the event')
    .fill(
      'A fictional gathering to verify the complete registration and ticket experience. Everyone is welcome.',
    );
  await page.getByLabel('Starts', { exact: true }).fill(localDate(new Date(Date.now() + 3600000)));
  await page.getByLabel('Ends', { exact: true }).fill(localDate(new Date(Date.now() + 10800000)));
  await page.getByLabel('Venue & city').fill('Fictional Studio, Jakarta');
  await page.getByLabel('Number of places').fill('12');
  await page.getByLabel('Visibility').selectOption('PUBLISHED');
  await accessible(page);
  await page.getByRole('button', { name: 'Save event', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/events$/);
  const row = page.getByRole('row').filter({ hasText: 'A fictional browser gathering' });
  await expect(row).toContainText('Published');
  await row.getByRole('link', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Number of places').fill('15');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(row).toContainText('0 / 15');
  const guestContext = await browser.newContext({
    baseURL: 'http://localhost:3100',
    viewport: { width: 390, height: 844 },
  });
  const guest = await guestContext.newPage();
  await register(guest, 'Browser Guest', 'browser-guest@test.local');
  await guest.getByLabel('Search events').fill('fictional browser');
  await guest
    .getByRole('heading', { name: 'A fictional browser gathering' })
    .getByRole('link')
    .click();
  await expect(guest.getByText('15 of 15 places remaining')).toBeVisible();
  await guest.getByRole('button', { name: 'Save my place' }).click();
  await expect(guest).toHaveURL(/\/my-tickets\/[a-f0-9-]+$/);
  await expect(guest.getByRole('heading', { name: 'A fictional browser gathering' })).toBeVisible();
  await expect(guest.getByRole('img', { name: /Your admission QR code/ })).toBeVisible();
  await accessible(guest);
  expect(await guest.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await guest.screenshot({ path: 'docs/screenshots/ticket-mobile.png', fullPage: true });
  await guest.getByText('Camera not working? Use your manual code.').click();
  const token = await guest.getByLabel('Private validation code').inputValue();
  expect(token).toMatch(/^ev1\./);
  await guest.reload();
  await expect(guest.getByRole('heading', { name: 'A fictional browser gathering' })).toBeVisible();
  await page.getByRole('link', { name: 'Guests', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Browser Guest' })).toContainText(
    'Not arrived',
  );
  await page.getByRole('link', { name: 'Open check-in' }).click();
  await expect(page.getByLabel('Choose your event')).not.toHaveValue('');
  await accessible(page);
  await page.getByRole('button', { name: 'Start camera', exact: true }).click();
  await expect(
    page.getByText(
      'Camera unavailable. Allow camera access over HTTPS or use the manual code below.',
    ),
  ).toBeVisible();
  await page.getByLabel('Private ticket code').fill(token);
  await page.getByRole('button', { name: 'Validate & check in' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome in, Browser Guest.' })).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/check-in-desktop.png', fullPage: true });
  await page.getByLabel('Private ticket code').fill(token);
  await page.getByRole('button', { name: 'Validate & check in' }).click();
  await expect(page.getByRole('heading', { name: 'Already through the door.' })).toBeVisible();
  await page.getByRole('link', { name: 'Overview', exact: true }).click();
  await expect(page.locator('.stat').filter({ hasText: 'Checked-in guests' })).toContainText('01');
  await accessible(page);
  await page.screenshot({ path: 'docs/screenshots/dashboard-desktop.png', fullPage: true });
  await guest.getByRole('button', { name: 'Refresh status' }).click();
  await expect(guest.locator('.badge')).toHaveText('Checked in');
  await guest.goto('/dashboard');
  await expect(guest.getByRole('heading', { name: 'Organizer access required.' })).toBeVisible();
  expect(errors).toEqual([]);
  await guestContext.close();
});
test('private routes redirect, login validation and persisted sessions work, logout protects tickets', async ({
  page,
}) => {
  await page.goto('/my-tickets');
  await expect(page).toHaveURL(/\/login\?next=/);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByText('Enter a valid email address.')).toBeVisible();
  await page.getByLabel('Email address').fill('guest@eventify.local');
  await page.getByLabel('Password', { exact: true }).fill('Eventify-demo-2026!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/my-tickets$/);
  await expect(page.locator('.ticket-card')).toHaveCount(3);
  await page.reload();
  await expect(page.locator('.ticket-card')).toHaveCount(3);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL('/');
  await page.goto('/my-tickets');
  await expect(page).toHaveURL(/\/login\?next=/);
});

test('camera scanner decodes a real QR payload and checks in using a synthetic camera stream', async ({
  request,
}) => {
  const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { default: QRCode } = await import('qrcode');
  const csrf = (await (await request.get('/api/auth/csrf')).json()).data.token;
  const response = await request.post('/api/auth/login', {
    headers: { Origin: 'http://localhost:3100', 'X-CSRF-Token': csrf },
    data: { email: 'guest@eventify.local', password: 'Eventify-demo-2026!' },
  });
  expect(response.status()).toBe(200);
  const registrations = (await (await request.get('/api/registrations/me')).json()).data;
  const registration = registrations.find((x) => x.event.slug === 'the-shape-of-next');
  const ticket = (await (await request.get(`/api/tickets/${registration.ticket.id}`)).json()).data;
  const directory = await mkdtemp(join(tmpdir(), 'eventify-camera-'));
  const video = join(directory, 'qr.y4m');
  const qr = QRCode.create(ticket.token, { errorCorrectionLevel: 'M' });
  const width = 640,
    height = 480,
    scale = 5;
  const y = Buffer.alloc(width * height, 235);
  const uv = Buffer.alloc((width * height) / 2, 128);
  const left = Math.floor((width - qr.modules.size * scale) / 2);
  const top = Math.floor((height - qr.modules.size * scale) / 2);
  for (let row = 0; row < qr.modules.size; row++)
    for (let col = 0; col < qr.modules.size; col++)
      if (qr.modules.get(row, col))
        for (let dy = 0; dy < scale; dy++)
          for (let dx = 0; dx < scale; dx++)
            y[(top + row * scale + dy) * width + left + col * scale + dx] = 16;
  await writeFile(
    video,
    Buffer.concat([
      Buffer.from(`YUV4MPEG2 W${width} H${height} F5:1 Ip A1:1 C420jpeg\n`),
      ...Array.from({ length: 5 }, () => Buffer.concat([Buffer.from('FRAME\n'), y, uv])),
    ]),
  );
  const browser = await chromium.launch({
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {}),
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
      `--use-file-for-fake-video-capture=${video}`,
    ],
  });
  try {
    const context = await browser.newContext({
      baseURL: 'http://localhost:3100',
      permissions: ['camera'],
      viewport: { width: 1440, height: 1000 },
    });
    const page = await context.newPage();
    await page.goto('/login');
    await page.getByLabel('Email address').fill('host@eventify.local');
    await page.getByLabel('Password', { exact: true }).fill('Eventify-demo-2026!');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto(`/dashboard/check-in?event=${registration.eventId}`);
    await page.getByRole('button', { name: 'Start camera', exact: true }).click();
    try {
      await expect(page.getByRole('heading', { name: 'Welcome in, Alex Morgan.' })).toBeVisible({
        timeout: 12000,
      });
    } catch (error) {
      await page.screenshot({ path: '/tmp/eventify-camera-debug.png' });
      console.log(
        await page.locator('video').evaluateAll((items) =>
          items.map((v) => ({
            width: v.videoWidth,
            height: v.videoHeight,
            clientWidth: v.clientWidth,
            clientHeight: v.clientHeight,
            ready: v.readyState,
          })),
        ),
      );
      throw error;
    }
    await expect(page.getByRole('button', { name: 'Start camera', exact: true })).toBeVisible();
  } finally {
    await browser.close();
    await rm(directory, { recursive: true, force: true });
  }
});
