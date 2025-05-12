import { Page, Locator, expect } from "@playwright/test";
import { Helper } from "../utils/helper";

export class KanbanMainPage {
  page: Page;
  taskName: string = '';
  clickedSubtaskText: string = '';
  maxRefreshAttempts = 5; 
  initialCardCount: number = 0;
  deletedTaskName: string = '';

  constructor(page: Page) {
    this.page = page;
  }

  async allHeading() {
    return await this.page.locator('[class="text-medium-grey font-bold text-xs uppercase"]').allInnerTexts()
  }

  async getAllSubtasks() {
    return (await this.page.locator('[class="bg-white dark:bg-dark-grey rounded-lg p-1"] label').allInnerTexts()).map(i => i.trim())
  }

  async getStrikedTasks() {
     return (await this.page.locator('[class="bg-white dark:bg-dark-grey rounded-lg p-1"] .line-through').allTextContents()).map(i => i.trim())
  }

  async firstTaskColumn() {
    return this.page.locator('[class="flex flex-col gap-5"]').first()
  }

  async getNotCompletedTasks() {
    const allSubtasks = await this.getAllSubtasks()
    const allStrickedTasks = await this.getStrikedTasks()
    return allSubtasks.filter(i => !allStrickedTasks.includes(i))
  }

  async getFirstColumnText() {
    const allHeading = await this.allHeading()
    const lastText = allHeading[0].trim()
    const firstColText =  lastText.match(/^([A-Z]+)\s*\(\s*(\d+)\s*\)/)
    if(!firstColText) {
      throw new Error('first text is Null!!!')
    }
    return firstColText[1]
  }

  async getNumberOfTasksOnFirstColumn() {
    const allHeading = await this.allHeading()
    const lastText = allHeading[0].trim()
    const firstColText =  lastText.match(/^([A-Z]+)\s*\(\s*(\d+)\s*\)/)
    if(!firstColText) {
      throw new Error('first text is Null!!!')
    }
    return Number(firstColText[2])
  }

  async print() {
    console.log(await this.getFirstColumnText())
    console.log(await this.getNumberOfTasksOnFirstColumn())
    console.log("strick man->", await this.getStrikedTasks())
    console.log("strick man->", await this.getAllSubtasks())
    console.log('non com task', await this.getNotCompletedTasks())
  }

  /**
   * Check if any cards are available on the board
   * @returns Boolean indicating if cards are available
   */
  async areCardsAvailable() {
    const cards = this.page.locator('//p[@class="text-xs text-medium-grey font-bold select-none"]').nth(1);
    const count = await cards.count();
    console.log(`Found ${count} cards on the board`);
    return count > 0;
  }

  /**
   * Refresh page until cards are visible or max attempts reached
   * @returns Boolean indicating success
   */
  async ensureCardsAreAvailable(helper: Helper) {
    for (let attempt = 0; attempt < this.maxRefreshAttempts; attempt++) {
      console.log(`Checking for cards - attempt ${attempt + 1}`);
      
      if (await this.areCardsAvailable()) {
        console.log('Cards are available on the board');
        return true;
      }
      
      console.log('No cards found, refreshing the page');
      await this.page.reload();
      await helper.sleep(3); 
    }
    
    console.log(`No cards found after ${this.maxRefreshAttempts} attempts`);
    const hasCards = await this.areCardsAvailable();
    expect(hasCards).toBe(true);
    return false;
  }

  async clickOnSubTask() {
    const helper = new Helper(this.page);
    const cardsAvailable = await this.ensureCardsAreAvailable(helper);
    if (!cardsAvailable) {
      console.log('Cannot proceed with clickOnSubTask as no cards are available');
      return;
    }
    
    const elements = this.page.locator('//p[@class="text-xs text-medium-grey font-bold select-none"]');
    const count = await elements.count();
    const startIndex = await this.getNumberOfTasksOnFirstColumn();
    console.log('count', count);

    for (let i = startIndex; i < count; i++) {
      const text = await elements.nth(i).innerText();
      console.log('text', text);
      const match = text.match(/(\d+)\s+of\s+(\d+)\s+substasks/i);
      console.log('match', match);

      if (match) {
        const completed = parseInt(match[1], 10);
        const total = parseInt(match[2], 10);
        console.log(completed, total);

        if (completed < total) {
          const firstIncompleteLocator = elements.nth(i);
          console.log(`Found: ${text}`);
          await firstIncompleteLocator.click(); 
          break;
        }
      }
    }
  }

  async clickNonCompletedTask() {
    const nonCompletedTasks = await this.getNotCompletedTasks();
    
    this.clickedSubtaskText = nonCompletedTasks[0];
    console.log(`Going to click subtask: ${this.clickedSubtaskText}`);
    
    await this.page.getByText(this.clickedSubtaskText).click();
    
    const taskNameElement = this.page.locator('[class="text-black dark:text-white font-bold text-lg"]');
    this.taskName = await taskNameElement.textContent() || '';
    console.log(`Task name from modal: ${this.taskName}`);
  }

  async moveTaskToFirstColumn() {
    const firstColumnText = await this.getFirstColumnText()
    const taskDropdown = this.page.locator('[class="bg-white dark:bg-dark-grey rounded-lg p-1"]').locator('[tabindex="1"]').last()
    await taskDropdown.click()
    await this.page.waitForTimeout(1000)
    await this.page.getByText(firstColumnText).last().click()
    await this.page.mouse.click(0, 0)  
  }

  async verifyTaskMovedToFirstColumn() {
    const firstColumn = this.page.locator('[class="flex flex-col gap-5"]').first()
    
    const taskElements = firstColumn.locator('[class="text-black dark:text-white font-bold group-hover:text-main-purple select-none"]');
    const count = await taskElements.count();
    
    let found = false;
    for (let i = 0; i < count; i++) {
      const text = await taskElements.nth(i).textContent() || '';
      if (text.trim() === this.taskName.trim()) {
        console.log(`Found task "${this.taskName}" in the first column!`);
        found = true;
        
        expect(text.trim()).toBe(this.taskName.trim());
        break;
      }
    }
    
    if (!found) {
      console.log(`Could not find task "${this.taskName}" in the first column`);
      expect(found).toBe(true); 
    }
    
    return found;
  }

  async verifySubtaskIsStrikedOff() {
    const strikedTasks = await this.getStrikedTasks();
    console.log(`Striked tasks: ${JSON.stringify(strikedTasks)}`);
    console.log(`Looking for subtask: ${this.clickedSubtaskText}`);
    
    const isSubtaskStriked = strikedTasks.some(task => 
      task.trim() === this.clickedSubtaskText.trim()
    );
    
    console.log(`Is subtask striked: ${isSubtaskStriked}`);
    expect(isSubtaskStriked).toBe(true);
    
    return isSubtaskStriked;
  }


 
  async getCardCountInFirstColumn() {
    const firstColumn = await this.firstTaskColumn();
    const cards = firstColumn.locator('[class="group flex flex-col bg-white dark:bg-dark-grey p-4 rounded-lg cursor-pointer shadow-task max-w-[280px]"]');
    const count = await cards.count();
    console.log(`Found ${count} cards in the first column`);
    return count;
  }


  async ensureCardsInFirstColumn(helper: Helper) {
    for (let attempt = 0; attempt < this.maxRefreshAttempts; attempt++) {
      const count = await this.getCardCountInFirstColumn();
      if (count > 0) {
        console.log('Cards found in the first column');
        return true;
      }
      
      console.log('No cards found in first column, refreshing the page');
      await this.page.reload();
      await helper.sleep(3);
    }
    
    const hasCards = await this.getCardCountInFirstColumn() > 0;
    expect(hasCards).toBe(true);
    return hasCards;
  }


  async clickCardInFirstColumn() {
    const helper = new Helper(this.page);
    await this.ensureCardsInFirstColumn(helper);
    
    this.initialCardCount = await this.getCardCountInFirstColumn();
    console.log(`Initial card count: ${this.initialCardCount}`);
    
    const firstColumn = await this.firstTaskColumn();
    const cards = firstColumn.locator('[class="group flex flex-col bg-white dark:bg-dark-grey p-4 rounded-lg cursor-pointer shadow-task max-w-[280px]"]');
    await cards.first().click();
    
    const taskNameElement = this.page.locator('[class="text-black dark:text-white font-bold text-lg"]');
    this.deletedTaskName = await taskNameElement.textContent() || '';
    console.log(`Selected task for deletion: ${this.deletedTaskName}`);
  }

  
  async clickEllipsisAndDeleteTask() {
    const ellipsisButton = this.page.locator('[class="group cursor-pointer relative"]').last();
    await ellipsisButton.click();
    await this.page.waitForTimeout(500);
    
    const deleteButton = this.page.locator('[class="text-red text-xs font-bold w-full p-4"]').last();
    await deleteButton.click();
    await this.page.waitForTimeout(500);
    
    const confirmDeleteButton = this.page.locator('[class="text-white font-bold text-sm py-2.5 px-4 w-full rounded-3xl bg-red hover:bg-red-light"]');
    await confirmDeleteButton.click();
    await this.page.waitForTimeout(1000);
  }


  async verifyCardCountDecreasedAfterDeletion() {
    const currentCardCount = await this.getCardCountInFirstColumn();
    console.log(`Current card count: ${currentCardCount}, Initial card count: ${this.initialCardCount}`);
    
    expect(currentCardCount).toBeLessThan(this.initialCardCount);
    
    console.log(`Successfully deleted task "${this.deletedTaskName}"`);
    console.log(`Card count decreased from ${this.initialCardCount} to ${currentCardCount}`);
    
    return currentCardCount < this.initialCardCount;
  }

  async deleteTaskAndVerify() {
    await this.clickCardInFirstColumn();
    await this.page.waitForTimeout(1000);
    
    await this.clickEllipsisAndDeleteTask();
    
    return await this.verifyCardCountDecreasedAfterDeletion();
  }
}