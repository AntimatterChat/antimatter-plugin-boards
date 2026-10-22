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
    test('Kanban opens in the side panel after login', async ({ page }) => {
        const amPage = await AntimatterPage.loginAndWait(page, antimatter.url(), Users.regularUser.username, Users.regularUser.password);

        // The app's icon opens the panel on the channel's boards: none yet.
        await amPage.openKanban();
        await expect(amPage.kanbanPanel().locator('.RHSChannelBoards.empty')).toBeVisible({ timeout: 15000 });

        // All boards lists the community's boards, by category.
        await amPage.openBoardList();
        await expect(amPage.kanbanPanel().locator('.Sidebar.octo-sidebar')).toBeVisible({ timeout: 15000 });
    });

    test('can create an empty board', async ({ page }) => {
        const amPage = await AntimatterPage.loginAndWait(page, antimatter.url(), Users.regularUser.username, Users.regularUser.password);

        // "New board" opens the template picker; "Create empty board" is in its sidebar's footer.
        await amPage.openTemplates();
        await page.locator('.templates-sidebar__footer button').click();

        // After creation the board editor should be visible
        await expect(page.locator('.BoardComponent')).toBeVisible({ timeout: 15000 });
    });

    test('new board appears in the board list', async ({ page }) => {
        const amPage = await AntimatterPage.loginAndWait(page, antimatter.url(), Users.admin.username, Users.admin.password);

        await amPage.openTemplates();
        await page.locator('.templates-sidebar__footer button').click();
        await expect(page.locator('.BoardComponent')).toBeVisible({ timeout: 15000 });

        // The community's boards list the new board
        await amPage.openBoardList();
        await expect(page.locator('.octo-sidebar-list .SidebarBoardItem.subitem').first()).toBeVisible({ timeout: 15000 });
    });
});
