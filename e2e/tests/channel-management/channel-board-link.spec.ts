// Copyright (c) 2023-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import { test, expect } from '@playwright/test';

import RunContainer from 'helpers/plugincontainer';
import AntimatterContainer from 'helpers/amcontainer';
import { AntimatterPage } from 'helpers/am';
import { createBoardViaApi } from 'helpers/boards';

const adminUser = 'admin';
const adminPass = 'admin';

let antimatter: AntimatterContainer;

test.beforeAll(async () => {
    test.setTimeout(300000);
    antimatter = await RunContainer();
});

test.afterAll(async () => {
    await antimatter?.stop();
});

// ─────────────────────────────────────────────────────────────────────────────
// API Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Open the Kanban side panel from the app's icon: it shows the channel's boards. */
async function openBoardsRHS(page: import('@playwright/test').Page): Promise<void> {
    await new AntimatterPage(page).openKanban();
    await expect(page.locator('.KanbanPanel .RHSChannelBoards')).toBeVisible({ timeout: 15000 });
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Channel-Board Linking', () => {
    test.describe.configure({ timeout: 300000 });

    test('RHS shows empty state when no boards are linked', async ({ page }) => {
        const amPage = new AntimatterPage(page);
        await amPage.login(antimatter.url(), adminUser, adminPass);
        await page.getByTestId('channel_view').waitFor({ state: 'visible', timeout: 30000 });

        await openBoardsRHS(page);

        await expect(page.locator('.RHSChannelBoards.empty')).toBeVisible({ timeout: 15000 });
        await expect(page.locator('.RHSChannelBoards.empty h2')).toContainText('No boards in');
    });

    test('can link a board to a channel via RHS and see it listed', async ({ page }) => {
        const adminClient = await antimatter.getAdminClient();
        const token = adminClient.getToken();
        const boardTitle = `RHS Link Test ${Date.now()}`;

        // Create a board to link
        await createBoardViaApi(antimatter, boardTitle, token);

        const amPage = new AntimatterPage(page);
        await amPage.login(antimatter.url(), adminUser, adminPass);
        await page.getByTestId('channel_view').waitFor({ state: 'visible', timeout: 30000 });

        // Open the Boards RHS panel
        await openBoardsRHS(page);

        // Click the "Add boards to..." button in the empty state
        await expect(page.locator('.RHSChannelBoards.empty')).toBeVisible({ timeout: 15000 });
        await page.locator('.RHSChannelBoards.empty button').click();

        // BoardSelector dialog should appear
        await expect(page.locator('.BoardSelector')).toBeVisible({ timeout: 15000 });

        // Search for the board
        await page.locator('.BoardSelector input.searchQuery').fill(boardTitle);

        // Wait for search results
        const boardItem = page.locator('.BoardSelectorItem').filter({ hasText: boardTitle });
        await expect(boardItem).toBeVisible({ timeout: 10000 });

        // Click "Add" on the matching result
        await boardItem.locator('button').filter({ hasText: 'Add' }).click();

        // Confirmation dialog
        await expect(page.locator('.confirmation-dialog-box')).toBeVisible({ timeout: 10000 });
        await page.getByRole('button', { name: 'Yes, add board' }).click();

        // Board should now appear in the RHS list
        await expect(page.locator('.RHSChannelBoards .rhs-boards-list')).toBeVisible({ timeout: 15000 });
        await expect(
            page.locator('.RHSChannelBoards .rhs-boards-list .RHSChannelBoardItem')
                .filter({ hasText: boardTitle }),
        ).toBeVisible({ timeout: 10000 });
    });

    test('can unlink a board from a channel via RHS options menu', async ({ page }) => {
        const adminClient = await antimatter.getAdminClient();
        const token = adminClient.getToken();
        const boardTitle = `RHS Unlink Test ${Date.now()}`;

        // Create a board to link
        await createBoardViaApi(antimatter, boardTitle, token);

        const amPage = new AntimatterPage(page);
        await amPage.login(antimatter.url(), adminUser, adminPass);
        await page.getByTestId('channel_view').waitFor({ state: 'visible', timeout: 30000 });

        // Open the Boards RHS panel
        await openBoardsRHS(page);

        // Link the board first
        const linkEmptyBtn = page.locator('.RHSChannelBoards.empty button');
        const addBtn = page.locator('.rhs-boards-header button', { hasText: 'Add' });

        // Prefer the empty-state button; fall back to the Add button if already linked boards exist
        const linkBtn = (await linkEmptyBtn.isVisible({ timeout: 3000 }).catch(() => false))
            ? linkEmptyBtn
            : addBtn;
        await linkBtn.click();

        await expect(page.locator('.BoardSelector')).toBeVisible({ timeout: 15000 });
        await page.locator('.BoardSelector input.searchQuery').fill(boardTitle);

        const boardItem = page.locator('.BoardSelectorItem').filter({ hasText: boardTitle });
        await expect(boardItem).toBeVisible({ timeout: 10000 });
        await boardItem.locator('button').filter({ hasText: 'Add' }).click();

        await expect(page.locator('.confirmation-dialog-box')).toBeVisible({ timeout: 10000 });
        await page.getByRole('button', { name: 'Yes, add board' }).click();

        // Wait for board to appear in the list
        const boardListItem = page.locator('.RHSChannelBoardItem').filter({ hasText: boardTitle });
        await expect(boardListItem).toBeVisible({ timeout: 15000 });

        // Hover to reveal the options menu, then click "Remove board".
        // The MenuWrapper renders menu actions as direct buttons (not .MenuItem wrappers),
        // so target the button by its accessible name.
        await boardListItem.hover();
        await boardListItem.locator('.MenuWrapper button.IconButton').click();
        await page.getByRole('button', { name: 'Remove board' }).click();

        // After unlink the board should no longer appear
        await expect(boardListItem).not.toBeVisible({ timeout: 10000 });
    });
});
