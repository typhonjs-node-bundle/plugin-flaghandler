import path          from 'path';

import FileUtilMod   from 'typhonjs-file-util';

const FileUtil = FileUtilMod.default;

/**
 * Provides a few utility functions to walk the local file tree.
 */
export default class LogUtil
{
   /**
    * Writes out a time stamped compressed file including the CLI config, CLI flags, CLI command data to users home
    * directory.
    *
    * @private
    */
   static async writeMetafiles(command)
   {
console.log(`!!!!LogUtil - writeMetaFiles - command.constructor.metaFileData:\n${JSON.stringify(command.constructor._metaFileData, null, 3)}`);

      const archiveDir = globalThis.$$cli_log_dir;
      const compressFormat = command.config.windows ? 'zip' : 'tar.gz';

      const fileUtil = new FileUtil({ compressFormat, eventbus: globalThis.$$eventbus });

      const date = new Date();
      const currentTime = date.getTime() - (date.getTimezoneOffset() * 60000);

      const archiveFilename =
       `${archiveDir}${path.sep}logs_${(new Date(currentTime).toJSON().slice(0, 19))}`.replace(/:/g, '_');

      globalThis.$$eventbus.trigger('log:info', `Writing metafile logs to: ${archiveFilename}.${compressFormat}`);

      fileUtil.archiveCreate({ filePath: archiveFilename });

      // Write out parsed package.json data.
      fileUtil.writeFile({
         fileData: JSON.stringify(command.config, null, 3),
         filePath: 'oclif.config.json'
      });

      if (typeof command.cliFlags === 'object')
      {
         fileUtil.writeFile({
            fileData: JSON.stringify(command.cliFlags, null, 3),
            filePath: 'cli-flags.json'
         });
      }

      if (typeof command.commandData === 'object')
      {
         fileUtil.writeFile({
            fileData: JSON.stringify(command.commandData, null, 3),
            filePath: `command-data.json`
         });
      }

      return fileUtil.archiveFinalize();
   }

   /**
    * Wires up LogUtil on the plugin eventbus.
    *
    * @param {PluginEvent} ev - The plugin event.
    *
    * @see https://www.npmjs.com/package/typhonjs-plugin-manager
    *
    * @ignore
    */
   static onPluginLoad(ev)
   {
      ev.eventbus.on(`typhonjs:oclif:system:log:util:metafiles:write`, LogUtil.writeMetafiles, LogUtil);
   }
}
