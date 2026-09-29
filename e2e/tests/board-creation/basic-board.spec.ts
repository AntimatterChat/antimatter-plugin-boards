import { test, expect } from '@playwright/test';

import RunContainer from 'helpers/plugincontainer';
import AntimatterContainer from 'helpers/amcontainer';
import { AntimatterPage } from 'helpers/am';
import { Users } from 'helpers/users';

let antimatter: AntimatterContainer;

test.beforeAll(async () => {
    test.setTimeout(300000);
    antimatter = await RunContainer();
});

test.afterAll(async () => {
    await antimatter.stop();
});

test.describe('Board Creation', () => {
    test('boards product is accessible after login', async ({ page }) => {
        const amPage = await AntimatterPage.loginAndWait(page, antimatter.url(), Users.regularUser.username, Users.regularUser.password);

        await amPage.navigateToBoardsFromUrl(antimatter.url());

        // The template selector is the empty state when no boards exist
        await expect(page.locator('.BoardTemplateSelector')).toBeVisible({ timeout: 15000 });
    });

    test('can create an empty board', async ({ page }) => {
        const amPage = await AntimatterPage.loginAndWait(page, antimatter.url(), Users.regularUser.username, Users.regularUser.password);

        await amPage.navigateToBoardsFromUrl(antimatter.url());

        // When no boards exist the template selector is already shown as the empty state.
        // The "Create empty board" button lives in the sidebar footer of the template selector.
        await expect(page.locator('.BoardTemplateSelector')).toBeVisible({ timeout: 15000 });
        await page.locator('.templates-sidebar__footer button').click();

        // After creation the board editor should be visible
        await expect(page.locator('.BoardComponent')).toBeVisible({ timeout: 15000 });
    });

    test('new board appears in the sidebar', async ({ page }) => {
        const amPage = await AntimatterPage.loginAndWait(page, antimatter.url(), Users.admin.username, Users.admin.password);

        await amPage.navigateToBoardsFromUrl(antimatter.url());

        await expect(page.locator('.BoardTemplateSelector')).toBeVisible({ timeout: 15000 });
        await page.locator('.templates-sidebar__footer button').click();

        // After creation the sidebar should list the new board
        await expect(page.locator('.octo-sidebar-list .octo-sidebar-item').first()).toBeVisible({ timeout: 15000 });
    });
});
