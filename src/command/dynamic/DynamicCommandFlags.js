import fs                  from 'fs';
import path                from 'path';

import { Flags }           from '@oclif/core';

import { NonFatalError }   from '@typhonjs-oclif/errors';

import defaultLogLevel     from '../../data/defaultLogLevel.js';

/**
 * Defines standard CLI command flags.
 */
export default class DynamicCommandFlags
{
   /**
    * Defines standard flags shared across multiple commands.
    *
    * Added flags include:
    * `--cwd`       -      - Use an alternative working directory.      - default: `'.'`     - env: {prefix}_CWD
    * `--env`       - `-e` - Name of *.env file to load from `./env`.
    * `--loglevel`  -      - Sets log level.                            - default: `'info'`  - env: {prefix}_LOG_LEVEL
    * `--metafile`  -      - Archives CLI runtime metafiles.            - default: `false`  -
    * `--no-color`  -      - Output and log with no color.              - default: `false`   -
    * `--noop`      -      - Prints essential bundling info and exits.  - default: `false`   -
    *
    * @returns {object} Standard flags
    */
   static get flags()
   {
      const envVarPrefix = globalThis.$$cli_env_prefix;

      return {
         'cwd': Flags.string({
            'description': 'Use an alternative working directory.',
            'default': function(context)
            {
               const envVars = context === null ? {} : process.env;
               const envVar = `${envVarPrefix}_CWD`;

               if (typeof envVars[envVar] === 'string') { return envVars[envVar]; }

               return '.';
            }
         }),

         'env': Flags.string({ 'char': 'e', 'description': 'Name of *.env file to load from `./env`.' }),

         'loglevel': Flags.string({
            'description': 'Sets log level (off, fatal, error, warn, info, verbose, debug, trace, all).',
            'default': function(context)
            {
               const envVars = context === null ? {} : process.env;
               const envVar = `${envVarPrefix}_LOG_LEVEL`;

               if (typeof envVars[envVar] === 'string') { return envVars[envVar]; }

               return defaultLogLevel;
            }
         }),

         'metafile': Flags.boolean({
            'description': `Archives CLI runtime metafiles in: ${globalThis.$$cli_log_dir}.`,
            'default': false
         }),

         'no-color': Flags.boolean({
            'description': 'Output and log with no color.',
            'default': function(context)
            {
               const envVars = context === null ? {} : process.env;
               const envVar = `${envVarPrefix}_NO_COLOR`;

               return typeof envVars[envVar] === 'string';
            }
         }),

         'noop': Flags.boolean({
            'description': 'Prints info on any FVTT module / system detected and exits w/ no operation.',
            'default': false
         })
      };
   }

   /**
    * Verifies loaded flag data.
    *
    * @param {object}   flags - loaded flags.
    */
   static verify(flags)
   {
      if (typeof flags.loglevel === 'string')
      {
         const logLevels = ['off', 'fatal', 'error', 'warn', 'info', 'verbose', 'debug', 'trace', 'all'];

         // Log a warning if requested log level is unknown.
         if (!logLevels.includes(flags.loglevel))
         {
            globalThis.$$eventbus.trigger('log:warn', `Unknown log level: '${flags.loglevel}'.`);
         }
         else
         {
            globalThis.$$eventbus.trigger('log:level:set', flags.loglevel);
         }
      }

      // Notify that the current working directory is being changed and verify that the new directory exists.
      if (typeof flags.cwd === 'string' && flags.cwd !== '.')
      {
         // Perform any initialization after initial flags have been loaded. Handle defining `cwd` and verify.
         const origCWD = globalThis.$$cli_baseCWD;
         const newCWD = path.resolve(globalThis.$$cli_origCWD, flags.cwd);

         if (newCWD !== globalThis.$$cli_baseCWD)
         {
            globalThis.$$cli_baseCWD = newCWD;

            // Only log absolute path if the CWD location is outside of the original path.
            globalThis.$$cli_logCWD = newCWD.startsWith(origCWD) ? path.relative(origCWD, newCWD) : newCWD;

            globalThis.$$eventbus.trigger('log:verbose',
               `New current working directory set: \n${globalThis.$$cli_logCWD}`);

            if (!fs.existsSync(globalThis.$$cli_baseCWD))
            {
               throw new NonFatalError(`New current working directory does not exist.`);
            }
         }
      }
   }
}
