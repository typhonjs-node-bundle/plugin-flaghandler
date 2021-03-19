import { NonFatalError }   from '@typhonjs-oclif/errors';

import LoggerMod           from 'typhonjs-color-logger';
import PackageUtil         from '@typhonjs-node-utils/package-util';

import errorParser         from '@typhonjs-node-utils/error-parser';

const logger = LoggerMod.default;

const s_REGEX_TYPHONJS = /^@?typhonjs/;

const s_MESSAGE_TYPHONJS = 'An uncaught fatal error has been detected with a TyphonJS module.\n' +
 'This may be a valid runtime error, but consider reporting this error to any issues forum after ' +
  'checking if a similar report already exists:';

const s_MESSAGE_EXTERNAL = 'An uncaught fatal error has been detected with an external module.\n' +
 'This may be a valid runtime error, but consider reporting this error to any issues forum after ' +
  'checking if a similar report already exists:';

const s_MESSAGE_SEPERATOR =
 '-----------------------------------------------------------------------------------------------\n';

/**
 */
export class ErrorHandler
{
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

      // Acquire trace info from '@typhonjs-node-utils/error-parser'
      const parsedError = errorParser.filter({ error });

      const packageObj = PackageUtil.getPackageAndFormat(parsedError.firstFilePath);

      // Note: This will exclude any package that starts w/ @oclif from posting a detailed error message. Since this is
      // a catch all error handler for the whole CLI we'll only post detailed error messages for non Oclif packages
      // detected where a `package.json` file can be found.
      if (typeof packageObj === 'object')
      {
         this._printErrMessage(packageObj, error);
      }

      return Errors.handle(error);
   }

   /**
    * Prints an error message with `typhonjs-color-logger` including the package data info and error.
    *
    * @param {object}   packageObj - Data object potentially containing packageInfo and match data.
    *
    * @param {Error}    error - An uncaught error.
    */
   _printErrMessage(packageObj, error)
   {
      let message = '';

      // Create a specific message if the module matches.
      if (packageObj !== void 0)
      {
         message = s_REGEX_TYPHONJS.test(packageObj.name) ? s_MESSAGE_TYPHONJS : s_MESSAGE_EXTERNAL;

         message += `${packageObj.formattedMessage}\n${global.$$cli_name_version}`;

         // Log any uncaught errors as fatal.
         logger.fatal(message, s_MESSAGE_SEPERATOR, error, '\n');
      }
      else
      {
         // Log any uncaught errors as fatal.
         logger.fatal(`An unknown fatal error has occurred; ${global.$$cli_name_version}:`, error, '\n');
      }
   }
}

export default new ErrorHandler();
