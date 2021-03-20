import { NonFatalError }   from '@typhonjs-oclif/errors';

import LoggerMod           from 'typhonjs-color-logger';
import PackageUtil         from '@typhonjs-node-utils/package-util';

import errorParser         from '@typhonjs-node-utils/error-parser';

const logger = LoggerMod.default;

const s_REGEX_TYPHONJS = /^@?typhonjs/;

const s_MESSAGE_TYPHONJS = 'An uncaught fatal error has been detected with a TyphonJS module.\n\n' +
 'This may be a valid runtime error, but consider reporting this error to any issues forum after ' +
  'checking if a similar report already exists:';

const s_MESSAGE_EXTERNAL = 'An uncaught fatal error has been detected with an external module.\n\n' +
 'This may be a valid runtime error, but consider reporting this error to any issues forum after ' +
  'checking if a similar report already exists:';

const s_MESSAGE_SEPERATOR =
 '-----------------------------------------------------------------------------------------------';

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
      const normalizedError = errorParser.normalize(error);
      const filterError = errorParser.filter({ error });

      const normalizedPackageObj = PackageUtil.getPackageAndFormat({ filepath: normalizedError.firstFilepath });
      const filterPackageObj = PackageUtil.getPackageAndFormat({ filepath: filterError.firstFilepath });

      let message = '';

      // Create a specific message if the module matches.
      if (filterPackageObj !== void 0)
      {
         message += s_REGEX_TYPHONJS.test(filterPackageObj.name) ? s_MESSAGE_TYPHONJS : s_MESSAGE_EXTERNAL;
         message += `\n${s_MESSAGE_SEPERATOR}\n${filterPackageObj.formattedMessage}\n${global.$$cli_name_version}`;
         message += `\n${filterError.toString()}\n${s_MESSAGE_SEPERATOR}`;
      }

      if (normalizedPackageObj !== void 0)
      {
         message += s_REGEX_TYPHONJS.test(normalizedPackageObj.name) ? s_MESSAGE_TYPHONJS : s_MESSAGE_EXTERNAL;
         message += `\n${s_MESSAGE_SEPERATOR}\n${normalizedPackageObj.formattedMessage}\n${global.$$cli_name_version}`;
         message += `\n${normalizedError.toString()}\n${s_MESSAGE_SEPERATOR}`;
      }

      if (normalizedPackageObj === void 0 && filterPackageObj === void 0)
      {
         message += `An unknown fatal error has occurred; ${global.$$cli_name_version}:\n${normalizedError.toString()}`;
      }

      // Log any uncaught errors as fatal.
      logger.fatal(message, '\n');

      return Errors.handle(error);
   }
}

export default new ErrorHandler();
