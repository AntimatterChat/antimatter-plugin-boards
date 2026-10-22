import * as fs from 'fs';
import * as path from 'path';

import AntimatterContainer from './amcontainer';

const RunContainer = async (): Promise<AntimatterContainer> => {
  const distPath = path.join(__dirname, "../../dist/");
  const matches = fs.readdirSync(distPath).filter(f => f.endsWith(".tar.gz"));
  if (matches.length > 1) {
    for (const match of matches) {
      fs.unlinkSync(path.join(distPath, match));
    }
    throw new Error(`Multiple tar.gz files found in ${distPath}: ${matches.join(", ")} — all removed. Run 'make dist' to rebuild.`);
  }
  if (matches.length === 0) {
    throw new Error(`No tar.gz file found in ${distPath}. Run 'make dist' to build.`);
  }
  const filename = path.join(distPath, matches[0]);

  const antimatter = await new AntimatterContainer()
    .withPlugin(filename, "focalboard")
    .start();

  await antimatter.createUser("regularuser@sample.com", "regularuser", "regularuser");
  await antimatter.addUserToTeam("regularuser", "test");
  await antimatter.createUser("seconduser@sample.com", "seconduser", "seconduser");
  await antimatter.addUserToTeam("seconduser", "test");

  // Skip the web app's tours and onboarding for every user: their overlays sit over the app bar, where the
  // tests open Kanban's side panel.
  const users: Array<[string, string]> = [["regularuser", "regularuser"], ["seconduser", "seconduser"], [antimatter.username, antimatter.password]];
  for (const [username, password] of users) {
    const client = await antimatter.getClient(username, password)
    const user = await client.getMe()
    await client.savePreferences(user.id, [
      {user_id: user.id, category: 'tutorial_step', name: user.id, value: '999'},
      {user_id: user.id, category: 'onboarding_task_list', name: 'onboarding_task_list_show', value: 'false'},
      {user_id: user.id, category: 'onboarding_task_list', name: 'onboarding_task_list_open', value: 'false'},
      {
        user_id: user.id,
        category: 'drafts',
        name: 'drafts_tour_tip_showed',
        value: JSON.stringify({drafts_tour_tip_showed: true}),
      },
      {user_id: user.id, category: 'crt_thread_pane_step', name: user.id, value: '999'},
    ]);
  }

  const adminClient = await antimatter.getAdminClient()
  await adminClient.completeSetup({
    organization: "test",
    install_plugins: [],
  });

  return antimatter;
}

export default RunContainer
