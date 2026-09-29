# Antimatter Boards

### A self-hosted plugin for managing boards within an Antimatter installation

Antimatter boards plugins is an open source, multilingual, self-hosted project management tool that's an alternative to Trello, Notion, and Asana.

## Try Antimatter Boards Plugin 

Access the latest releases of the antimatter boards plugin by downloading the `antimatter-plugin-focalboard.tar.gz` file from the releases in this repository: <https://github.com/antimatterchat/antimatter-plugin-boards/releases>. After downloading and installing the plugin in the System Console, select the menu in the top left corner and select **Boards**. 

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
enable [local mode](https://docs.antimatter.example/manage/mmctl-command-line-tool.html) to streamline deploying
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
