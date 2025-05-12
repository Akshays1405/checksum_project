import { test } from "@playwright/test";
import { KanbanMainPage } from "./pageObjects/kanbanPage/kanbanMainPage";
import { Helper } from "./pageObjects/utils/helper";


test('get started link', async ({ page }) => {

const kanban = new KanbanMainPage(page);
const helper = new Helper(page)

await page.goto("https://kanban-566d8.firebaseapp.com/");

await helper.sleep(3);

await kanban.print();

await kanban.clickOnSubTask();
await helper.sleep(5);

if (await kanban.areCardsAvailable()) {
  await kanban.clickNonCompletedTask();
  await helper.sleep(2);
  
  await kanban.verifySubtaskIsStrikedOff();
  await helper.sleep(3);
  
  await kanban.moveTaskToFirstColumn();
  await helper.sleep(5);
  
  await kanban.verifyTaskMovedToFirstColumn();
} else {
  console.log("Test skipped due to no cards being available on the board");
}
});