import fs                from 'fs';

import { NonFatalError } from '@typhonjs-oclif/errors';

import LoggerMod         from 'typhonjs-color-logger';
import PackageUtilMod    from 'typhonjs-package-util';

import { Errors }        from '@oclif/core';

const logger = LoggerMod.default;
const PackageUtil = PackageUtilMod.default;

/**
 *
 * @param {Error} error - Error to handle / log.
 * @returns {*}
 */
export default function errorHandler(error)
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

   let packageData = null;

   // Determine if error occurred in an NPM module. If so attempt to load to any associated
   // package.json for the detected NPM module and post a fatal log message noting as much.
   if (traceInfo)
   {
      packageData = s_FORMAT_FROM_TRACE(traceInfo.trace);
   }

   // Note: This will exclude any package that starts w/ @oclif from posting a detailed error message. Since this is
   // a catch all error handler for the whole CLI we'll only post detailed error messages for non Oclif packages
   // detected where a `package.json` file can be found.
   if (packageData !== null && typeof packageData === 'object' && typeof packageData.name === 'string' &&
      !packageData.name.startsWith('@oclif'))
   {
      s_PRINT_ERR_MESSAGE(packageData, error);
   }

   return Errors.handle(error);
}

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
   let packageInfo;

   if (Array.isArray(trace))
   {
      let modulePath = null;

      // Walk through the stack trace array of strings until the first entry that matches the five regex tests below.
      // This defines the module path to attempt to load any associated `package.json` file.
      for (let cntr = 0; cntr < trace.length; cntr++)
      {
         // Matches full path to local fvttdev package (match is group 1)
         let matches = (/^.*\((\/.*\/fvttdev\/)src/g).exec(`${trace[cntr]}`);
         modulePath = matches !== null && matches.length >= 1 ? matches[1] : void 0;
         if (typeof modulePath === 'string') { break; }

         // Matches full path to local linked typhonjs-oclif package (match is group 1)
         matches = (/^.*\((\/.*(\/typhonjs-oclif\/.*\/))src/g).exec(`${trace[cntr]}`);
         modulePath = matches !== null && matches.length >= 1 ? matches[1] : void 0;
         if (typeof modulePath === 'string') { break; }

         // Matches full path to local linked typhonjs-node-rollup package (match is group 1)
         matches = (/^.*\((\/.*(\/typhonjs-node-rollup\/.*\/))src/g).exec(`${trace[cntr]}`);
         modulePath = matches !== null && matches.length >= 1 ? matches[1] : void 0;
         if (typeof modulePath === 'string') { break; }

         // Matches full path to organization node module (match is group 1)
         matches = (/^.*\((\/.*(\/node_modules\/(@.*?)\/(.*?)\/))/g).exec(`${trace[cntr]}`);
         modulePath = matches !== null && matches.length >= 1 ? matches[1] : void 0;
         if (typeof modulePath === 'string') { break; }

         // Matches full path to non-organization node module (match is group 1)
         matches = (/^.*\((\/.*(\/node_modules\/(.*?)\/))/g).exec(`${trace[cntr]}`);
         modulePath = matches !== null && matches.length >= 1 ? matches[1] : void 0;
         if (typeof modulePath === 'string') { break; }
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

   return packageInfo;
}

/**
 * Prints an error message with `typhonjs-color-logger` including the package data info and error.
 *
 * @param {object}   packageData - Formatted `package.json` data.
 * @param {Error}    error - An uncaught error.
 */
function s_PRINT_ERR_MESSAGE(packageData, error)
{
   let packageMessage = '';

   if (typeof packageData === 'object')
   {
      const sep =
         '-----------------------------------------------------------------------------------------------\n';

      // Create a specific message if the module is detected as a TJSDoc module.

      /* eslint-disable prefer-template */

      if (packageData.bugs.url === 'https://github.com/typhonjs-fvtt/fvttdev/issues')
      {
         packageMessage = 'An uncaught fatal error has been detected with FVTTDev CLI.\n'
            + 'Please report this error to the issues forum after checking if a similar '
            + 'report already exists:\n' + sep;
      }
      else if (packageData.bugs.url === 'https://github.com/typhonjs-oclif/issues/issues' ||
         packageData.bugs.url === 'https://github.com/typhonjs-node-rollup/issues/issues')
      {
         packageMessage = 'An uncaught fatal error has been detected with a TyphonJS Oclif module.\n'
            + 'Please report this error to the issues forum after checking if a similar '
            + 'report already exists:\n' + sep;
      }
      else
      {
         packageMessage = 'An uncaught fatal error has been detected with an external module.\n'
            + 'This may be a valid runtime error, but consider reporting this error to any issues forum after '
            + 'checking if a similar report already exists:\n' + sep;
      }

      /* eslint-enable prefer-template */

      packageMessage += `${packageData.formattedMessage}\n${global.$$cli_name_version}`;

      // Log any uncaught errors as fatal.
      logger.fatal(packageMessage, sep, error, '\n');
   }
   else
   {
      // Log any uncaught errors as fatal.
      logger.fatal(`An unknown fatal error has occurred; ${global.$$cli_name_version}:`, error, '\n');
   }
}
