import fs                  from 'fs';

import { NonFatalError }   from '@typhonjs-oclif/errors';

import LoggerMod           from 'typhonjs-color-logger';
import PackageUtilMod      from 'typhonjs-package-util';

const logger = LoggerMod.default;
const PackageUtil = PackageUtilMod.default;

const s_DEFAULT_MESSAGE = 'An uncaught fatal error has been detected with an external module.\n' +
 'This may be a valid runtime error, but consider reporting this error to any issues forum after ' +
  'checking if a similar report already exists:';

const s_DEFAULT_MATCH = [
   {
      name: 'org-npm-module',
      regex: /^.*\((\/.*(\/node_modules\/(@.*?)\/(.*?)\/))/g,
      message: s_DEFAULT_MESSAGE
   },
   {
      name: 'npm-module',
      regex: /^.*\((\/.*(\/node_modules\/(.*?)\/))/g,
      message: s_DEFAULT_MESSAGE
   }
];

/**
 */
export class ErrorHandler
{
   /**
    */
   constructor()
   {
      this._match = [];
   }

   /**
    * @param {object} match - A potential error match.
    * @param {string} match.name - Name of match.
    * @param {RegExp} match.regex - Regular expression to match.
    * @param {string} match.message - A message to display for this match.
    */
   addMatch(match = {})
   {
      if (typeof match !== 'object') { throw new TypeError(`'match' is not an 'object'.`); }
      if (typeof match.name !== 'string') { throw new TypeError(`'match.name' is not a 'string'.`); }
      if (!(match.regex instanceof RegExp)) { throw new TypeError(`'match.regex' is not a 'RegExp'.`); }
      if (typeof match.message !== 'string') { throw new TypeError(`'match.message' is not a 'string'.`); }

      if (this._match.find((element) => element.name === match.name))
      {
         global.$$eventbus.trigger('log:debug',
          `ErrorHandler.addMatch - already have a match entry with name: ${match.name}`);
      }
      else
      {
         this._match.push(match);
      }
   }

   /**
    * @param {Error} error - Error to handle / log.
    *
    * @param {Errors} Errors - @oclif/core Errors instance.
    *
    * @returns {void}
    */
   handle(error, Errors)
   {
      // Given a magic boolean variable assigned to an error skip printing out a fatal error.
      if (error instanceof NonFatalError || (typeof error.$$error_fatal === 'boolean' && !error.$$error_fatal))
      {
         const logEvent = typeof error.$$logEvent === 'string' ? error.$$logEvent : 'log:error';
         const errorCode = Number.isInteger(error.$$errorCode) ? error.$$errorCode : 1;

         // log error message unless the log event is `log:trace`.
         global.$$eventbus.trigger(logEvent, logEvent !== 'log:trace' ? error.message : error);

         return Errors.handle(new Errors.ExitError(errorCode));
      }

      // Acquire trace info from 'typhonjs-color-logger'
      const traceInfo = logger.getTraceInfo(error);

      let matchData = null;

      // Determine if error occurred in an NPM module. If so attempt to load to any associated
      // package.json for the detected NPM module and post a fatal log message noting as much.
      if (traceInfo)
      {
         matchData = s_FORMAT_FROM_TRACE(traceInfo.trace);
      }

      // Note: This will exclude any package that starts w/ @oclif from posting a detailed error message. Since this is
      // a catch all error handler for the whole CLI we'll only post detailed error messages for non Oclif packages
      // detected where a `package.json` file can be found.
      if (matchData !== null)
      {
         s_PRINT_ERR_MESSAGE(matchData, error);
      }

      return Errors.handle(error);
   }

   /**
    * Wires up ErrorHandler on the plugin eventbus.
    *
    * @param {PluginEvent} ev - The plugin event.
    *
    * @see https://www.npmjs.com/package/typhonjs-plugin-manager
    *
    * @ignore
    */
   onPluginLoad(ev)
   {
      ev.eventbus.on(`typhonjs:oclif:system:error:handler:match:add`, this.addMatch, this);
   }
}

export default new ErrorHandler();

/**
 * Attempts to load the first package.json found in the stack trace as the source of the offending error and returns
 * a formatted object of the loaded `package.json`.
 *
 * @param {Array} trace - The stack trace formatted from `typhonjs-color-logger`.
 *
 * @returns {object|undefined}   The formatted `package.json` if found from stack trace.
 */
function s_FORMAT_FROM_TRACE(trace)
{
   let packageInfo = null;
   let foundMatch = null;

   if (Array.isArray(trace))
   {
      let modulePath = null;

      // Walk through the stack trace array of strings until the first entry that matches the five regex tests below.
      // This defines the module path to attempt to load any associated `package.json` file.
      for (const entry of trace)
      {
         if (modulePath !== null) { break; }

         for (const match of this._match)
         {
            const matches = match.exec(entry);
            modulePath = matches !== null && matches.length >= 1 ? matches[1] : void 0;
            if (typeof modulePath === 'string') { foundMatch = match; break; }
         }

         for (const match of s_DEFAULT_MATCH)
         {
            const matches = match.exec(entry);
            modulePath = matches !== null && matches.length >= 1 ? matches[1] : void 0;
            if (typeof modulePath === 'string') { foundMatch = match; break; }
         }
      }

      if (typeof modulePath === 'string')
      {
         try
         {
            const packageObj = JSON.parse(fs.readFileSync(`${modulePath}package.json`, 'utf8'));

            packageInfo = PackageUtil.format(packageObj);
         }
         catch (packageErr) { /* nop */ }
      }
   }

   return {
      packageInfo,
      match: foundMatch
   };
}

/**
 * Prints an error message with `typhonjs-color-logger` including the package data info and error.
 *
 * @param {object}   matchData - Data object potentially containing packageInfo and match data.
 * @param {object}   matchData.packageInfo - Formatted `package.json` data.
 * @param {object}   matchData.match - The associated match
 *
 * @param {Error}    error - An uncaught error.
 */
function s_PRINT_ERR_MESSAGE(matchData, error)
{
   let message = '';

   // Create a specific message if the module matches.
   if (matchData.packageInfo !== null)
   {
      const sep =
         '-----------------------------------------------------------------------------------------------\n';

      message = matchData.match !== null ? `${matchData.match.message}\n${sep}` : `s_DEFAULT_MESSAGE\n${sep}`;

      message += `${matchData.packageInfo.formattedMessage}\n${global.$$cli_name_version}`;

      // Log any uncaught errors as fatal.
      logger.fatal(message, sep, error, '\n');
   }
   else
   {
      // Log any uncaught errors as fatal.
      logger.fatal(`An unknown fatal error has occurred; ${global.$$cli_name_version}:`, error, '\n');
   }
}
