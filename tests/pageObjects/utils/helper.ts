import { Page } from "@playwright/test"

export class Helper {
    page: Page
    constructor(page: Page) {
        this.page = page
    }

    async sleep(time: number) {
        await this.page.waitForTimeout(1000 * time)
    }
}