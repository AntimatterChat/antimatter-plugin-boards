import { test, expect, type Page } from '@playwright/test';

import RunContainer from 'helpers/plugincontainer';
import AntimatterContainer from 'helpers/amcontainer';
import { AntimatterPage } from 'helpers/am';
import { createBoardViaApi, getBoardMeta } from 'helpers/boards';

const username = 'regularuser';
const password = 'regularuser';

let antimatter: AntimatterContainer;

test.beforeAll(async () => {
    test.setTimeout(300000);
    antimatter = await RunContainer();
});

test.afterAll(async () => {
    await antimatter?.stop();
});

test.describe('Board Management', () => {
    test.describe.configure({ timeout: 300000 });

    async function setupBoard(page: Page, username: string, password: string, boardTitle: string): Promise<void> {
        const amPage = new AntimatterPage(page);
        await amPage.login(antimatter.url(), username, password);
        await page.getByTestId('channel_view').waitFor({ state: 'visible', timeout: 30000 });
        await amPage.openBoardList();

        const boardComponent = page.locator('.BoardComponent');
        const sidebarItem = page.locator('.octo-sidebar-list .SidebarBoardItem.subitem').filter({ hasText: boardTitle });

        // If the board is already in the community's boards, open it from there.
        if (await sidebarItem.first().waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false)) {
            await amPage.openBoardFromList(boardTitle);
        } else {
            // Create via API and follow the board's link — the template picker
            // creates untitled boards, which this helper doesn't need.
            const userClient = await antimatter.getClient(username, password);
            const userToken = (userClient as any).token as string;
            const boardId = await createBoardViaApi(antimatter, boardTitle, userToken);
            const { teamId, viewId } = await getBoardMeta(antimatter, boardId, userToken);
            await amPage.openKanbanLink(antimatter.url(), `/team/${teamId}/${boardId}/${viewId}`);
        }

        await expect(boardComponent).toBeVisible({ timeout: 15000 });
    }

    test('new board has default title placeholder', async ({ page }) => {
        const amPage = new AntimatterPage(page);
        await amPage.login(antimatter.url(), username, password);
        await page.getByTestId('channel_view').waitFor({ state: 'visible', timeout: 30000 });
        await amPage.openTemplates();

        await page.locator('.templates-sidebar__footer button').click();
        await expect(page.locator('.BoardComponent')).toBeVisible({ timeout: 15000 });

        // The board title input should show the "Untitled board" placeholder when empty
        await expect(page.locator('.ViewTitle .Editable.title')).toHaveAttribute('placeholder', /[Uu]ntitled/, { timeout: 10000 });
    });

    test('can rename a board', async ({ page }) => {
        await setupBoard(page, username, password, 'Test Board');
        const amPage = new AntimatterPage(page);

        // Click the board title to make it editable
        const titleLocator = page.locator('.ViewTitle .Editable');
        await titleLocator.click();
        await titleLocator.fill('My Renamed Board');

        // Commit the rename by pressing Enter
        await titleLocator.press('Enter');

        // The panel's title, then the community's boards, show the new name
        await expect(amPage.kanbanPanelTitle()).toContainText('My Renamed Board', { timeout: 10000 });
        await amPage.openBoardList();
        await expect(page.locator('.octo-sidebar-list')).toContainText('My Renamed Board', { timeout: 10000 });
    });

    test('renamed board title persists after navigation', async ({ page }) => {
        await setupBoard(page, username, password, 'Test Board');
        const amPage = new AntimatterPage(page);

        // Rename the board
        const titleLocator = page.locator('.ViewTitle .Editable');
        await titleLocator.click();
        await titleLocator.fill('Persistent Board');
        await titleLocator.press('Enter');

        await expect(amPage.kanbanPanelTitle()).toContainText('Persistent Board', { timeout: 10000 });

        // Navigate away by reloading the main Antimatter channel, then open Kanban again
        await page.goto(antimatter.url());
        await page.getByTestId('channel_view').waitFor({ state: 'visible', timeout: 30000 });
        await new AntimatterPage(page).openBoardList();

        // The renamed board should still be listed
        await expect(page.locator('.octo-sidebar-list')).toContainText('Persistent Board', { timeout: 15000 });
    });

    test('multiple boards appear in the board list', async ({ page }) => {
        const amPage = new AntimatterPage(page);
        await amPage.login(antimatter.url(), 'admin', 'admin');
        await page.getByTestId('channel_view').waitFor({ state: 'visible', timeout: 30000 });

        // Create first board and name it
        await amPage.openOrCreateBoard('First Board');
        await amPage.openBoardList();
        const sidebarList = page.locator('.octo-sidebar-list');
        await expect(sidebarList).toContainText('First Board', { timeout: 10000 });

        // Create second board via API (the Add Board Dropdown is unreliable due to React event timing)
        const adminClient = await antimatter.getAdminClient();
        const token = (adminClient as any).token as string;
        await createBoardViaApi(antimatter, 'Second Board', token);

        // WebSocket push updates the open list automatically; both boards should be listed
        await expect(sidebarList).toContainText('First Board', { timeout: 15000 });
        await expect(sidebarList).toContainText('Second Board', { timeout: 15000 });
    });
});
