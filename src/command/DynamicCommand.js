import fs                  from 'fs';
import path                from 'path';

import { Command }         from '@oclif/core';
import dotenv              from 'dotenv';

import { NonFatalError }   from '@typhonjs-oclif/errors';

// TODO REMOVE
// import FileUtilMod         from 'typhonjs-file-util';
//
// const FileUtil = FileUtilMod.default;

/**
 * Provides default handling for TyphonJS dynamic command initialization of flags from Oclif plugins.
 */
class DynamicCommand extends Command
{
   /**
    * Performs any final steps before the command execution completes. This is useful for logging any data
    * in response to the `--metafile` flag.
    */
   async finalize()
   {
      // Write any log metafiles on finalize.
      if (typeof this._cliFlags.metafile === 'boolean' && this._cliFlags.metafile)
      {
         await globalThis.$$eventbus.triggerAsync('typhonjs:oclif:system:log:util:metafiles:write', this);
      }
   }

   /**
    * Returns the parsed data.
    *
    * @returns {{}}
    */
   get commandData()
   {
      return this._commandData;
   }

   /**
    * Returns the parsed CLI flags.
    *
    * @returns {{}}
    */
   get cliFlags()
   {
      return this._cliFlags;
   }

   /**
    * Loads all dynamic flags for this command after running any init hook.
    *
    * @param {Object}   CommandClass - The DynamicCommand subclass.
    *
    * @param {Object}   config - An Oclif config.
    *
    * @param {boolean}  [loadDefault=true] - A boolean indicating whether to load defaults or current environment
    *                                        variables.
    *
    * @returns {Promise<{}>}
    */
   static async loadDynamicFlags(CommandClass, config, loadDefault = true)
   {
      const initHook = CommandClass._initHook;
      if (typeof initHook === 'string')
      {
         // Run any custom init hook for all Oclif bundle plugins to load respective bundler plugins.
         await config.runHook(initHook, { id: this.id, flagsModule: '@oclif/core/lib/flags.js' });
      }

      let flags = {};

      const flagCommands = CommandClass._flagCommands;
      if (Array.isArray(flagCommands) && typeof globalThis.$$eventbus !== 'undefined')
      {
         // Dynamically load flags for the command from oclif-flaghandler.
         flags = globalThis.$$eventbus.triggerSync('typhonjs:oclif:system:flaghandler:get', { commands: flagCommands });
      }

      const defaultData = loadDefault ? null : void 0;

      // Sanitize default flags. Invoke any default functions taking the value provided.
      for (const v of Object.values(flags))
      {
         if (typeof v.default === 'function')
         {
            v.default = v.default(defaultData);

            if (Array.isArray(v.default) && v.default.length === 0) { delete v.default; }
            if (v.default === '') { delete v.default; }
         }
      }

      return flags;
   }

   /**
    * Attempts to load environment variables from a *.env file w/ `dotenv`. Many flags have defaults, but also can be
    * set with environment variables and this is a convenient way to load many different configurations.
    *
    * Note: If an environment file is loaded by `dotenv` the flags are parsed again below via
    * `this.parse(BuildCommand)`.
    *
    * @param {object}   existingFlags - parsed flags from command.
    *
    * @param {object}   CommandClass - The actual child command class.
    *
    * @returns {object} Either the existing flags if there is no .env file to load or the new flags after new
    * environment variables have been loaded.
    *
    * @private
    */
   async _loadEnvFile(existingFlags = {}, CommandClass)
   {
      let output = existingFlags;

      // Check to see if the `env` flag has been set; if so attempt to load the *.env file and parse the flags again.
      if (typeof existingFlags.env === 'string')
      {
         // By default the environment variables will always be stored in `./env`
         const envFilePath = `${globalThis.$$cli_baseCWD}${path.sep}env${path.sep}${existingFlags.env}.env`;

         const logEnvFilePath = `${globalThis.$$cli_logCWD}${path.sep}env${path.sep}${existingFlags.env}.env`;

         // Exit gracefully if the environment file could not be found.
         if (!fs.existsSync(envFilePath))
         {
            this.error(`Could not find specified environment file: \n'${logEnvFilePath}'`);
            this.exit(1);
         }
         else
         {
            globalThis.$$eventbus.trigger('log:verbose', `Loading environment variables from: \n${logEnvFilePath}`);

            // Potentially load environment variables from a *.env file.
            const env = dotenv.config({ path: envFilePath });
            if (env.error)
            {
               this.error(`An error occurred with 'dotenv' when loading environment file: \n${env.error.message}`);
               this.exit(1);
            }

            // Parse flags again after environment variables have been loaded.
            const { flags } = await this.parse(CommandClass);
            output = flags;
         }
      }

      return output;
   }

   /**
    * Performs all initialization, loading of flags from *.env file via dotenv and verification of flags.
    *
    * @param {object}   options - Options object.
    *
    * @param {string[]} options.commands - The actual command names.
    *
    * @param {string}   options.event - The event to fire with parsed flags to load command data.
    *
    * @return {object} Parsed and verified flags.
    *
    * @protected
    */
   async initialize(options)
   {
      const commands = Array.isArray(options.commands) ? options.commands : null;
      const event = typeof options.event === 'string' ? options.event : null;

      // Parse dynamic flags for all command names
      this._cliFlags = commands !== null ? await this._initializeFlags(commands) : {};

      // If an event path is provided then fire it off to load command data.
      if (event !== null)
      {
         this._commandData = await globalThis.$$eventbus.triggerAsync(event, this._cliFlags,
          globalThis.$$cli_baseCWD, globalThis.$$cli_origCWD);
      }

      // Handle noop / no operation flag / Exit out now!
      if (typeof this._cliFlags.noop === 'boolean' && this._cliFlags.noop)
      {
         // Write any log metafiles before handling noop flag.
         if (typeof this._cliFlags.metafile === 'boolean' && this._cliFlags.metafile)
         {
            await globalThis.$$eventbus.triggerAsync('typhonjs:oclif:system:log:util:metafiles:write', this);
            // TODO REMOVE
            // await this._writeMetafiles();
         }

         let results = `-----------------------------------\n`;
         results += `${globalThis.$$cli_name_version} running: '${this.id}' - `;

         // Attempt to get abbreviated noop description from command data.
         if (this._commandData && typeof this._commandData.toStringNoop === 'function')
         {
            results += this._commandData.toStringNoop();
         }

         results += `\n${this.toStringNoop()}`;

         results += `-----------------------------------`;

         throw new NonFatalError(results, 'info:raw');
      }
   }

   /**
    * Performs all initialization, loading of flags from *.env file via dotenv and verification of flags.
    *
    * @param {string[]} commands - The actual command names.
    *
    * @return {object} Parsed and verified flags.
    *
    * @private
    */
   async _initializeFlags(commands)
   {
      const CommandClass = this.constructor;

      const eventbus = globalThis.$$eventbus;

      // Dynamically load flags for the command from oclif-flaghandler.
      CommandClass.flags = eventbus.triggerSync('typhonjs:oclif:system:flaghandler:get', { commands });

      // Perform the first stage of parsing flags. This is
      let { flags } = await this.parse(CommandClass);

      // Notify that the current working directory is being changed and verify that the new directory exists.
      if (typeof flags.cwd === 'string' && flags.cwd !== '.')
      {
         const origCWD = globalThis.$$cli_baseCWD;
         const newCWD = flags.cwd;

         // Perform any initialization after initial flags have been loaded. Handle defining `cwd` and verify.
         globalThis.$$cli_baseCWD = path.resolve(globalThis.$$cli_origCWD, newCWD);

         // Only log absolute path if the CWD location is outside of the original path.
         globalThis.$$cli_logCWD = newCWD.startsWith(origCWD) ? path.relative(origCWD, newCWD) : newCWD;

         globalThis.$$eventbus.trigger('log:verbose',
          `New current working directory set: \n${globalThis.$$cli_logCWD}`);

         if (!fs.existsSync(globalThis.$$cli_baseCWD))
         {
            throw new NonFatalError(`New current working directory does not exist.`);
         }
      }

      // Attempt to parse any environment variables via dotenv if applicable and reload / update flags accordingly.
      flags = await this._loadEnvFile(flags, CommandClass);

      // Verify flags given any plugin provided verify functions in FlagHandler.
      eventbus.triggerSync('typhonjs:oclif:system:flaghandler:verify', { commands, flags });

      return flags;
   }

   /**
    * Provides the base method to be overridden to provide per command implementation details for noop flag.
    *
    * @returns {string}
    */
   toStringNoop()
   {
      return '';
   }

   // /**
   //  * Writes out a time stamped compressed file including the CLI config, CLI flags, CLI command data to users home
   //  * directory.
   //  *
   //  * @private
   //  */
   // async _writeMetafiles()
   // {
   //    const archiveDir = globalThis.$$cli_log_dir;
   //    const compressFormat = this.config.windows ? 'zip' : 'tar.gz';
   //
   //    const fileUtil = new FileUtil({ compressFormat, eventbus: globalThis.$$eventbus });
   //
   //    const date = new Date();
   //    const currentTime = date.getTime() - (date.getTimezoneOffset() * 60000);
   //
   //    const archiveFilename =
   //     `${archiveDir}${path.sep}logs_${(new Date(currentTime).toJSON().slice(0, 19))}`.replace(/:/g, '_');
   //
   //    globalThis.$$eventbus.trigger('log:info', `Writing metafile logs to: ${archiveFilename}.${compressFormat}`);
   //
   //    fileUtil.archiveCreate({ filePath: archiveFilename });
   //
   //    // Write out parsed package.json data.
   //    fileUtil.writeFile({
   //       fileData: JSON.stringify(this.config, null, 3),
   //       filePath: 'oclif.config.json'
   //    });
   //
   //    if (typeof this.cliFlags === 'object')
   //    {
   //       fileUtil.writeFile({
   //          fileData: JSON.stringify(this.cliFlags, null, 3),
   //          filePath: 'cli-flags.json'
   //       });
   //    }
   //
   //    if (typeof this.commandData === 'object')
   //    {
   //       fileUtil.writeFile({
   //          fileData: JSON.stringify(this.commandData, null, 3),
   //          filePath: `command-data.json`
   //       });
   //    }
   //
   //    return fileUtil.archiveFinalize();
   // }
}

DynamicCommand.metaFileData = [
   { key: 'config', filename: 'oclif.config.json' },
   { key: 'cliFlags', filename: 'cli-flags.json' },
   { key: 'commandData', filename: 'command-data.json' }
];

export default DynamicCommand;
