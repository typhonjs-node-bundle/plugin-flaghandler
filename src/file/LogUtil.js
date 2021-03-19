import path             from 'path';

// eslint-disable-next-line
import * as Interfaces  from '@oclif/core/lib/interfaces/index.js';

import FileUtilMod      from 'typhonjs-file-util';

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
    * @param {Interfaces.Command} command - The Oclif command instance to log.
    *
    * @returns {Promise<void>} Returns a promise which resolves when archive is finalized.
    * @private
    */
   static async writeMetafiles(command)
   {
      // Validate _metaFileData
      const metaFileData = command.constructor._metaFileData;

      if (!Array.isArray(metaFileData))
      {
         globalThis.$$eventbus.trigger('log:warn',
          'Could not write metafile logs as <CommandClass>._metaFileData is not defined / an array.');
         return;
      }

      // No data to write.
      if (metaFileData.length === 0)
      {
         return;
      }

      const archiveDir = globalThis.$$cli_log_dir;
      const compressFormat = command.config.windows ? 'zip' : 'tar.gz';

      const fileUtil = new FileUtil({ compressFormat, eventbus: globalThis.$$eventbus });

      const date = new Date();
      const currentTime = date.getTime() - (date.getTimezoneOffset() * 60000);

      const archiveFilename =
       `${archiveDir}${path.sep}logs_${(new Date(currentTime).toJSON().slice(0, 19))}`.replace(/:/g, '_');

      globalThis.$$eventbus.trigger('log:info', `Writing metafile logs to: ${archiveFilename}.${compressFormat}`);

      fileUtil.archiveCreate({ filePath: archiveFilename });

      for (let cntr = 0; cntr < metaFileData.length; cntr++)
      {
         const data = metaFileData[cntr];

         if (typeof data !== 'object')
         {
            globalThis.$$eventbus.trigger('log:warn',
             `Skipping <CommandClass>._metaFileData index ${cntr} as it is not an object.`);
            continue;
         }

         if (typeof data.key !== 'string' || typeof data.filename !== 'string')
         {
            globalThis.$$eventbus.trigger('log:warn',
             `Skipping <CommandClass>._metaFileData index ${cntr} as it is missing 'key' or 'filename'.`);
            continue;
         }

         if (typeof command[data.key] === 'undefined')
         {
            globalThis.$$eventbus.trigger('log:warn',
             `Skipping <CommandClass>._metaFileData index ${cntr} as key '${data.key}' not found in command.`);
            continue;
         }

         // Write out data for given key and filename.
         fileUtil.writeFile({
            fileData: JSON.stringify(command[data.key], null, 3),
            filePath: data.filename
         });
      }

      return fileUtil.archiveFinalize();
   }

   /**
    * Wires up LogUtil on the plugin eventbus.
    *
    * @param {object} ev - PluginEvent - The plugin event.
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
