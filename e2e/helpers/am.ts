import { Page, Locator, expect } from '@playwright/test';

export class AntimatterPage {
    readonly page: Page;
    readonly postTextbox: Locator;
    readonly sendButton: Locator;

    constructor(page: Page) {
        this.page = page;
        this.postTextbox = page.getByTestId('post_textbox');
        this.sendButton = page.getByTestId('channel_view').getByTestId('SendMessageButton');
    }

    async login(
        url: string,
        username: string,
        password: string,
        options?: { channelViewTimeoutMs?: number },
    ) {
        const channelTimeout = options?.channelViewTimeoutMs ?? 60000;
        await this.page.addInitScript(() => { localStorage.setItem('__landingPageSeen__', 'true'); });

        // Polyfill crypto.randomUUID for insecure contexts (e.g., Docker test environments
        // where the Antimatter URL uses a non-localhost IP like http://172.17.0.1:PORT).
        await this.page.addInitScript(() => {
            if (typeof crypto !== 'undefined' && typeof crypto.randomUUID !== 'function') {
                crypto.randomUUID = function randomUUID() {
                    const bytes = new Uint8Array(16);
                    crypto.getRandomValues(bytes);
                    bytes[6] = (bytes[6] & 0x0f) | 0x40;
                    bytes[8] = (bytes[8] & 0x3f) | 0x80;
                    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
                    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}` as `${string}-${string}-${string}-${string}-${string}`;
                };
            }
        });

        // Retry navigation with exponential backoff for flaky network conditions
        let lastError: Error | null = null;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
                break;
            } catch (error) {
                lastError = error as Error;
                if (attempt < 2) {
                    await this.page.waitForTimeout(1000 * (attempt + 1));
                }
            }
        }
        if (lastError && !(await this.page.getByText('Log in to your account').isVisible().catch(() => false))) {
            throw lastError;
        }

        await this.page.getByText('Log in to your account').waitFor({ timeout: 60000 });
        await this.page.getByPlaceholder('Password').fill(password);
        await this.page.getByPlaceholder("Email or Username").fill(username);
        await this.page.getByTestId('saveSetting').click();

        await this.page.waitForURL(/.*\/test\/channels\/.*/, { timeout: channelTimeout });
        await this.page.getByTestId('channel_view').waitFor({ state: 'visible', timeout: channelTimeout });
    }

    static async loginAndWait(page: Page, url: string, username: string, password: string): Promise<AntimatterPage> {
        const amPage = new AntimatterPage(page);
        await amPage.login(url, username, password);
        return amPage;
    }

    // ─────────────────────────────────────────────────────────────────────
    // Kanban, in the side panel
    //
    // Kanban has no full page any more (since 2026-10-17): its views (the
    // channel's boards, the community's boards by category, the templates, a
    // board and its cards) are views of its side panel, which the app's icon
    // opens. Its old links (/kanban/team/<team>/<board>/<view>/<card>) open the
    // panel on the view they point to.
    // ─────────────────────────────────────────────────────────────────────

    /**
     * The Kanban panel (the app's root in the side panel). Under Fusion, the
     * dialogs and menus are drawn in a layer of their own (.KanbanLayer, also
     * a .KanbanPanel), outside the panel's root.
     */
    kanbanPanel(): Locator {
        return this.page.locator('.KanbanPanel[data-kanban-panel]');
    }

    /**
     * The Kanban app's icon: in the app bar (#app-bar-icon-focalboard: the
     * classic UI and the upstream web app, whose button is named after the
     * icon's alt text), or Fusion's app rail button (named Kanban).
     */
    kanbanIcon(): Locator {
        return this.page.locator('#app-bar-icon-focalboard')
            .or(this.page.getByRole('button', { name: 'Kanban', exact: true }))
            .first();
    }

    /** The panel's toolbar row: the view's title, back button and actions. */
    kanbanPanelTitle(): Locator {
        return this.kanbanPanel().getByTestId('kanban-panel-title');
    }

    /**
     * Opens the Kanban panel from the app's icon, as a person does, on its
     * first view: the boards of the current channel. A panel already open is
     * taken back to that view.
     */
    async openKanban() {
        const home = this.kanbanPanel().locator('.KanbanPanelHome');
        if (!(await this.kanbanPanel().isVisible().catch(() => false))) {
            await this.kanbanIcon().click({ timeout: 30000 });
        }
        await this.kanbanPanel().waitFor({ state: 'visible', timeout: 30000 });

        // The panel's back button goes back through its views, to its first one.
        for (let i = 0; i < 10 && !(await home.isVisible().catch(() => false)); i++) {
            const back = this.kanbanPanel().locator('.KanbanPanelTitle__back');
            if (!(await back.isVisible().catch(() => false))) {
                break;
            }
            await back.click({ timeout: 10000 });
        }
        await home.waitFor({ state: 'visible', timeout: 30000 });
    }

    /**
     * Opens the community's boards, by category (what the full page's left
     * sidebar was): the panel's "All boards".
     */
    async openBoardList() {
        await this.openKanban();
        await this.kanbanPanel().locator('.KanbanPanel__all-boards').click();
        await this.skipWelcome(this.kanbanPanel().locator('.Sidebar.octo-sidebar'));
    }

    /** Opens the template picker: the panel's "New board". */
    async openTemplates() {
        await this.openKanban();
        await this.kanbanPanel().locator('.KanbanPanel__new-board').click();
        await this.skipWelcome(this.kanbanPanel().locator('.BoardTemplateSelector'));
    }

    /**
     * Opens a board of the list (All boards) by its title, and waits for it.
     */
    async openBoardFromList(title: string) {
        const item = this.kanbanPanel().locator('.octo-sidebar-list .SidebarBoardItem.subitem').filter({ hasText: title }).first();
        await item.click();
        await this.kanbanPanel().locator('.BoardComponent').waitFor({ state: 'visible', timeout: 30000 });
    }

    /**
     * Opens the board `title` from the community's boards; when there is
     * none, creates an empty board from the template picker and names it
     * `title`. The board shows in the panel when it returns.
     */
    async openOrCreateBoard(title: string) {
        await this.openBoardList();
        const item = this.kanbanPanel().locator('.octo-sidebar-list .SidebarBoardItem.subitem').filter({ hasText: title }).first();
        const listed = await item.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
        if (listed) {
            await this.openBoardFromList(title);
            return;
        }

        await this.openTemplates();
        await this.page.locator('.templates-sidebar__footer button').click();
        const boardComponent = this.kanbanPanel().locator('.BoardComponent');
        await expect(boardComponent).toBeVisible({ timeout: 15000 });

        // A new board is untitled: name it.
        await expect(this.page.locator('.ViewTitle .Editable.title')).toHaveAttribute('placeholder', /[Uu]ntitled/, { timeout: 10000 });
        const titleInput = this.page.locator('.ViewTitle .Editable');
        await titleInput.click();
        await titleInput.fill(title);
        await titleInput.press('Enter');

        // The panel's title names the board it shows.
        await expect(this.kanbanPanelTitle()).toContainText(title, { timeout: 10000 });
        await expect(boardComponent).toBeVisible({ timeout: 15000 });
    }

    /**
     * Follows an old full-page link to Kanban, as from a message, an email or
     * a notification: `path` is the full page's path under /kanban
     * (/team/<team>/<board>/<view>/<card>...). The web app sends /kanban/<path>
     * to the app's route in a community, /<community>/focalboard/<path>, which
     * opens a channel with the panel on that view; the helper goes to that
     * route directly, which every web app the app runs in has (Antimatter's
     * Fusion and classic UIs, and the upstream web app the CI runs).
     */
    async openKanbanLink(baseUrl: string, path: string, teamName = 'test') {
        await this.page.goto(`${baseUrl}/${teamName}/focalboard${path}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await this.page.getByTestId('channel_view').waitFor({ state: 'visible', timeout: 60000 });
        await this.kanbanPanel().waitFor({ state: 'visible', timeout: 30000 });
    }

    /**
     * Waits for `ready`, skipping Kanban's welcome page (shown on the first
     * visit) and its "Welcome to Kanban" tour if they show first.
     */
    async skipWelcome(ready: Locator) {
        const skipLink = this.kanbanPanel().locator('.WelcomePage .skip');
        const first = await Promise.race([
            skipLink.waitFor({ state: 'visible', timeout: 30000 }).then(() => 'welcome'),
            ready.waitFor({ state: 'visible', timeout: 30000 }).then(() => 'ready'),
        ]).catch(() => 'timeout');

        if (first === 'welcome') {
            await skipLink.click();
            await ready.waitFor({ state: 'visible', timeout: 30000 });
        } else if (first === 'timeout') {
            throw new Error('Kanban did not load: neither its welcome page nor the view asked for appeared in the panel within 30s');
        }

        const tourSkip = this.page.locator('text=No thanks, I\'ll figure it out myself');
        if (await tourSkip.isVisible({ timeout: 2000 }).catch(() => false)) {
            await tourSkip.click();
        }
    }
}

// Legacy function for backward compatibility
export const login = async (page: Page, url: string, username: string, password: string) => {
    const amPage = new AntimatterPage(page);
    await amPage.login(url, username, password);
};
