import fs                from 'fs';
import path              from 'path';
import os                from 'os';

import Events            from 'backbone-esnext-events';
import PluginManager     from 'typhonjs-plugin-manager';

import FileUtil          from '../file/FileUtil.js';

import FlagHandler       from '../flags/FlagHandler.js';

// TODO CHANGE TO 'info' LOG LEVEL FOR DEFAULT
const s_DEFAULT_LOG_LEVEL = 'debug';

/**
 * Creates a plugin manager instance.
 * Attaches the backbone-esnext eventbus to `process`.
 *
 * @param {object} opts - options of the CLI action.
 *
 * @returns {Promise<void>}
 */
export default async function(opts)
{
   try
   {
      // Save base executing path immediately before anything else occurs w/ CLI / Oclif.
      globalThis.$$bundler_baseCWD = globalThis.$$bundler_origCWD = process.cwd();

      // A short version of CWD which has the relative path if CWD is the base or subdirectory otherwise absolute.
      globalThis.$$bundler_logCWD = '.';

//TODO
      // Defines the CLI prefix to add before environment variable flag identifiers.
      globalThis.$$flag_env_prefix = 'CLI';

      // Save the global eventbus.
      globalThis.$$eventbus = new Events();

      // Save the global plugin manager
      globalThis.$$pluginManager = new PluginManager({ eventbus: globalThis.$$eventbus });

      // Adds color logger plugin
      globalThis.$$pluginManager.add(
         {
            name: 'typhonjs-color-logger',
            options: {
               // Adds an exclusive filter which removes `FlagHandler` from stack trace / being a source of an error.
//TODO
               filterConfigs: [
                  {
                     type: 'exclusive',
                     name: 'FlagHandler',
                     filterString: '@typhonjs-node-bundle/oclif-commons/src/util/FlagHandler.js'
                  },
                  {
                     type: 'exclusive',
                     name: '@babel',
                     filterString: '@babel'
                  }
               ],
               showInfo: false
            }
         });

      // Set the initial starting log level.
      globalThis.$$eventbus.trigger('log:level:set', s_DEFAULT_LOG_LEVEL);

      globalThis.$$eventbus.trigger('log:debug', `TyphonJS CLI init hook running '${opts.id}'.`);

      s_SET_VERSION();

      globalThis.$$pluginManager.add({ name: '@typhonjs-oclif/core/FileUtil', instance: FileUtil });

      globalThis.$$pluginManager.add({ name: '@typhonjs-oclif/core/FlagHandler', instance: new FlagHandler() });


//TODO
//      globalThis.$$pluginManager.add({ name: '@typhonjs-fvtt/fvttrepo', instance: FVTTRepo });
//      globalThis.$$pluginManager.add({ name: '@typhonjs-node-rollup/rollup-runner', instance: new RollupRunner() });

   }
   catch (error)
   {
      this.error(error);
   }
}

/**
 * Sets the global name and version number for `fvttdev` in `globalThis.$$cli_name` & `globalThis.$$cli_version`. Also
 * provides a convenience name + package version string in `globalThis.$$cli_name_version`.
 */
function s_SET_VERSION()
{
   globalThis.$$cli_name = 'unknown';

   const homeDir = os.homedir();

   // Set the log path to be <USER_HOME>/.fvttdev/logs
   globalThis.$$cli_log_dir = `${homeDir}${path.sep}.${globalThis.$$cli_name}${path.sep}logs`;

   globalThis.$$eventbus.trigger('log:debug',
    `setting 'globalThis.$$cli_log_dir' to '${globalThis.$$cli_log_dir}'.`);

   // Retrieve the local package path to pull the version number for `fvttdev`
   const packagePath = FileUtil.getURLDirpath(import.meta.url, '../../../../../package.json');

   try
   {
      // require(packagePath);
      const packageObj = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));

      if (packageObj)
      {
         globalThis.$$cli_name = packageObj.name;
         globalThis.$$cli_version = packageObj.version;
         globalThis.$$cli_name_version = `${packageObj.name} (${packageObj.version})`;

         globalThis.$$flag_env_prefix = packageObj.name.toUpperCase();

         globalThis.$$eventbus.trigger('log:debug',
          `setting 'globalThis.$$flag_env_prefix' to '${globalThis.$$flag_env_prefix}'.`);
      }
   }
   catch (err) { /* nop */ }
}
