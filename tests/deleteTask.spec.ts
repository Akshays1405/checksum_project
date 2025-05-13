import { test } from "@playwright/test";
import { KanbanMainPage } from "./pageObjects/kanbanPage/kanbanMainPage";
import { Helper } from "./pageObjects/utils/helper";

test('Delete a task from the first column', async ({ page }) => {
  const kanban = new KanbanMainPage(page);

  await page.goto("https://kanban-566d8.firebaseapp.com/");
  
  await kanban.deleteTaskAndVerify();
  
  console.log('Task deletion test completed successfully');
}); 