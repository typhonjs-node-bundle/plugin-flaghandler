import path                from 'path';
import os                  from 'os';

import PluginManager       from '@typhonjs-plugin/manager';
import { ErrorParser }     from '@typhonjs-utils/error-parser';

import FlagHandler         from '../system/handlers/flag/FlagHandler.js';
import MetaFileHandler     from '../system/handlers/file/MetaFileHandler.js';

import defaultLogLevel     from '../data/defaultLogLevel.js';

/**
 * Initializes a TyphonJS CLI with a plugin manager and eventbus and several default plugins.
 *
 * @param {object} options - options of the CLI action.
 *
 * @returns {Promise<void>}
 */
export default async function(options)
{
   try
   {
      globalThis.$$cli_name = options.config.bin;
      globalThis.$$cli_version = options.config.version;
      globalThis.$$cli_name_version = `${globalThis.$$cli_name} (${globalThis.$$cli_version})`;

      globalThis.$$errorParser = new ErrorParser();

      const logLevel = options.config?.debug === 1 ? 'debug' : defaultLogLevel;

      // Save base executing path immediately before anything else occurs w/ CLI / Oclif.
      globalThis.$$cli_baseCWD = globalThis.$$cli_origCWD = process.cwd();

      // A short version of CWD which has the relative path if CWD is the base or subdirectory otherwise absolute.
      globalThis.$$cli_logCWD = '.';

      // Save the global plugin manager
      globalThis.$$pluginManager = new PluginManager();

      // Save the global eventbus.
      globalThis.$$eventbus = globalThis.$$pluginManager.getEventbus();

      // Adds color logger plugin
      await globalThis.$$pluginManager.add({ name: '@typhonjs-utils/logger-color' });

      await globalThis.$$pluginManager.add({
         name: '@typhonjs-utils/error-parser',
         instance: globalThis.$$errorParser,
         options: {
            // Adds an exclusive filters which remove `@typhonjs-oclif/core` & `@oclif/core` from being the source of
            // a filtered error.
            filterConfigs: [{
               type: 'exclusive',
               name: '@typhonjs-oclif/core',
               filterString: '@typhonjs-oclif/core'
            }, {
               type: 'exclusive',
               name: '@oclif/core',
               filterString: '@oclif/core'
            }]
         }
      });

      // Set the initial starting log level.
      globalThis.$$eventbus.trigger('log:level:set', logLevel);

      globalThis.$$eventbus.trigger('log:debug', `TyphonJS CLI init hook running '${options.id}'.`);

      s_SET_VERSION();

      await globalThis.$$pluginManager.add({ name: '@typhonjs-utils/cosmiconfig' });

      await globalThis.$$pluginManager.add({ name: '@typhonjs-utils/package-json/plugin' });

      await globalThis.$$pluginManager.add({ name: '@typhonjs-utils/file-archive' });

      await globalThis.$$pluginManager.add({ name: '@typhonjs-utils/file-util' });

      await globalThis.$$pluginManager.add({ name: '@typhonjs-oclif/core/MetaFileHandler', instance: MetaFileHandler });

      await globalThis.$$pluginManager.add({ name: '@typhonjs-oclif/core/FlagHandler', instance: new FlagHandler() });
   }
   catch (error)
   {
      this.error(error);
   }
}

/**
 * Sets the global name and version number for the CLI in `globalThis.$$cli_name` & `globalThis.$$cli_version`. Also
 * provides a convenience name + package version string in `globalThis.$$cli_name_version`.
 */
function s_SET_VERSION()
{
   globalThis.$$cli_env_prefix = globalThis.$$cli_name.toUpperCase();

   const homeDir = os.homedir();

   globalThis.$$eventbus.trigger('log:debug',
    `setting environment variable prefix to '${globalThis.$$cli_env_prefix}'.`);

   // Set the log path to be <USER_HOME>/.<CLI bin name>/logs
   globalThis.$$cli_log_dir = `${homeDir}${path.sep}.${globalThis.$$cli_name}${path.sep}logs`;

   globalThis.$$eventbus.trigger('log:debug', `setting log directory to '${globalThis.$$cli_log_dir}'.`);
}
