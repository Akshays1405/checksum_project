import { test } from "@playwright/test";
import { KanbanMainPage } from "./pageObjects/kanbanPage/kanbanMainPage";


test('kanban subtask completion test', async ({ page }) => {

const kanban = new KanbanMainPage(page);

await page.goto("https://kanban-566d8.firebaseapp.com/");

await kanban.clickOnSubTask();

if (await kanban.areCardsAvailable()) {
  await kanban.clickNonCompletedTask();
  
  await kanban.verifySubtaskIsStrikedOff();
  
  await kanban.moveTaskToFirstColumn();
  
  await kanban.verifyTaskMovedToFirstColumn();
} else {
  console.error("Test skipped due to no cards being available on the board");
}
});