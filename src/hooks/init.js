import path                from 'path';
import os                  from 'os';

import Events              from 'backbone-esnext-events';
import errorParser         from '@typhonjs-node-utils/error-parser';
import PackageUtil         from '@typhonjs-node-utils/package-util';
import PluginManager       from 'typhonjs-plugin-manager';

import FileUtil            from '../file/FileUtil.js';
import LogUtil             from '../file/LogUtil.js';

import FlagHandler         from '../flags/FlagHandler.js';

const s_DEFAULT_LOG_LEVEL = 'info';

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

      const logLevel = options.config?.debug === 1 ? 'debug' : s_DEFAULT_LOG_LEVEL;

      // Save base executing path immediately before anything else occurs w/ CLI / Oclif.
      globalThis.$$cli_baseCWD = globalThis.$$cli_origCWD = process.cwd();

      // A short version of CWD which has the relative path if CWD is the base or subdirectory otherwise absolute.
      globalThis.$$cli_logCWD = '.';

      // Save the global eventbus.
      globalThis.$$eventbus = new Events();

      // Save the global plugin manager
      globalThis.$$pluginManager = new PluginManager({ eventbus: globalThis.$$eventbus });

      // Adds color logger plugin
      globalThis.$$pluginManager.add({ name: 'typhonjs-color-logger', options: { showInfo: false } });

      globalThis.$$pluginManager.add({
         name: '@typhonjs-node-utils/error-parser',
         instance: errorParser,
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

      globalThis.$$pluginManager.add({ name: '@typhonjs-node-utils/package-util', instance: PackageUtil });

      globalThis.$$pluginManager.add({ name: '@typhonjs-oclif/core/FileUtil', instance: FileUtil });

      globalThis.$$pluginManager.add({ name: '@typhonjs-oclif/core/LogUtil', instance: LogUtil });

      globalThis.$$pluginManager.add({ name: '@typhonjs-oclif/core/FlagHandler', instance: new FlagHandler() });
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
