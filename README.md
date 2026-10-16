# Antimatter Kanban

### A self-hosted plugin for managing kanban boards within an Antimatter installation

Antimatter Kanban (formerly Antimatter Boards, a fork of Mattermost Boards / Focalboard) is an open source, multilingual, self-hosted project management tool that's an alternative to Trello, Notion, and Asana. It's called Kanban in Antimatter so it isn't confused with the Whiteboard's boards; its plugin id is still `focalboard`, and its pages still live under `/boards`.

## Documentation

See the [user guide](https://antimatter.chat/docs/users/apps.html#kanban) and the
[admin guide](https://antimatter.chat/docs/admins/apps.html#kanban-notes) on
[antimatter.chat/docs](https://antimatter.chat/docs/).

## Try the Antimatter Kanban plugin

Access the latest releases of the antimatter boards plugin by downloading the `antimatter-plugin-focalboard.tar.gz` file from the releases in this repository: <https://github.com/antimatterchat/antimatter-plugin-boards/releases>. After downloading and installing the plugin in the System Console, select the menu in the top left corner and select **Kanban**. 

### Getting started

Clone the Antimatter server into a sibling directory.

You also want to have the environment variable `AM_DEBUG"true"` set, otherwise the plugin
will be compiled for Linux, Windows, and Darwin ARM64 and x64 architecture every single time. Setting
the `AM_DEBUG` to `true` makes the plugin compile and build only for the OS and architecture
you are building on. (The legacy `MM_DEBUG` name is still accepted.)

In your Antimatter configuration file, ensure that `PluginSettings.EnableUploads` is set to `true`, and `FileSettings.MaxFileSize` is
set to a large enough value to accept the plugin bundle (eg `256000000`).

### Installing Dependencies 

```sh
cd ./webapp
npm install
```

### Building the plugin

Run the following command in the plugin repository to prepare a compiled, distributable plugin ZIP file:

```bash
make dist
```

After a successful build, a `.tar.gz` file in the `/dist` folder will be created which can be uploaded to Antimatter. To avoid having to manually install your plugin, deploy your plugin using one of the following options.

##### Building in Dev Mode

Set the following environment variables to true before running `make dist`-

1. AM_DEBUG

### Deploying with Local Mode

If your Antimatter server is running locally, you can
enable [local mode](https://antimatter.chat/docs/admins/configuration.html#amctl) to streamline deploying
your plugin. Edit your server configuration as follows:

```
{
    "ServiceSettings": {
        ...
        "EnableLocalMode": true,
        "LocalModeSocketLocation": "/var/tmp/mattermost_local.socket"
     }
}
```

and then deploy your plugin:

```bash
make deploy
```

If developing a plugin with a web app, watch for changes and deploy those automatically:

```bash
export MM_SERVICESETTINGS_SITEURL=http://localhost:8065
make watch-plugin
```

## How to Release

To trigger a release, follow these steps:

1. **For Patch Release:** Run the following command:
    ```
    make patch
    ```
   This will release a patch change.

2. **For Minor Release:** Run the following command:
    ```
    make minor
    ```
   This will release a minor change.

3. **For Major Release:** Run the following command:
    ```
    make major
    ```
   This will release a major change.

4. **For Patch Release Candidate (RC):** Run the following command:
    ```
    make patch-rc
    ```
   This will release a patch release candidate.

5. **For Minor Release Candidate (RC):** Run the following command:
    ```
    make minor-rc
    ```
   This will release a minor release candidate.

6. **For Major Release Candidate (RC):** Run the following command:
    ```
    make major-rc
    ```
   This will release a major release candidate.


### Unit testing

Before checking in commits, run `make ci`, which is similar to the `.gitlab-ci.yml` workflow and includes:

* **Server unit tests**: `make server-test`
* **Web app ESLint**: `cd webapp; npm run check`
* **Web app unit tests**: `cd webapp; npm run test`

## Feedback and support

Found a bug in the Boards plugin, or missing a feature? Please [open an
issue](https://github.com/AntimatterChat/community/issues/new/choose) in the [Antimatter community
repository](https://github.com/AntimatterChat/community), where the feedback for every part of
Antimatter is gathered. Questions and ideas are welcome in its
[Discussions](https://github.com/AntimatterChat/community/discussions). Please report security
problems privately, as explained in the [security
policy](https://github.com/AntimatterChat/.github/blob/main/SECURITY.md).
