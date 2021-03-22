import { NonFatalError }   from '@typhonjs-oclif/errors';

import LoggerMod           from 'typhonjs-color-logger';
import PackageUtil         from '@typhonjs-node-utils/package-util';

import errorParser         from '@typhonjs-node-utils/error-parser';

const logger = LoggerMod.default;

const s_MESSAGE_ONE_MODULE = `\n
The source of the error may be associated with the stack trace and module listed below. This may 
also be a valid runtime error. If you can not resolve this error consider reporting it to the issue
forum after checking if a similar report already exists. In your report include all of the 
information below. To aid your search on the issue forum you can make a search with the UUID 
associated with the error to find any duplicate report.`;

const s_MESSAGE_TWO_MODULE = `\n
The source of the error is likely in the first filtered stack trace and module followed by the full
stack trace and module at the top of the error stack. This may also be a valid runtime error. If 
you can not resolve this error consider reporting it to the first issue forum listed below after
checking if a similar report already exists. In your report include all of the information below.
To aid your search on the issue forum you can make a search with the UUID associated with the error
to find any duplicate report.`;

const s_MESSAGE_SEPARATOR =
 '---------------------------------------------------------------------------------------------------';

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
      try
      {
         if (!error) { error = new Error('no error?'); }
         if (error.message === 'SIGINT') { process.exit(1); }

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
         const normalizedError = errorParser.normalize({ error });
         const filterError = errorParser.filter({ error });

         const normalizedPackageObj = PackageUtil.getPackageAndFormat({
            filepath: normalizedError.firstFilepath,
            callback: (data) => typeof data.packageObj.name === 'string'
         });

         const filterPackageObj = PackageUtil.getPackageAndFormat({
            filepath: filterError.firstFilepath,
            callback: (data) => typeof data.packageObj.name === 'string'
         });

         let bitfield = 0;
         bitfield |= normalizedPackageObj !== void 0 ? 1 : 0;
         bitfield |= filterPackageObj !== void 0 ? 2 : 0;

         // Handle the cases when both filtered and normalized error stacks are the same or the filtered stack is empty.
         if (normalizedError.uuid === filterError.uuid || filterError.stack.length === 0)
         {
            bitfield = 1;
         }

         let message = `An uncaught fatal error has occurred.`;

         switch (bitfield)
         {
            case 0:
               message += ` ${global.$$cli_name_version}:\n${normalizedError.toString()}`;
               break;
            case 1:
               message += s_MESSAGE_ONE_MODULE;

               message += `\n\n${s_MESSAGE_SEPARATOR}\n${normalizedPackageObj.formattedMessage}\n`;
               message += `CLI: ${global.$$cli_name_version}\nError UUID: ${normalizedError.uuid}\n\n`;
               message += `${normalizedError.toString()}${s_MESSAGE_SEPARATOR}`;
               break;

            case 2:
               message += s_MESSAGE_ONE_MODULE;

               message += `\n\n${s_MESSAGE_SEPARATOR}\n${filterPackageObj.formattedMessage}\n`;
               message += `CLI: ${global.$$cli_name_version}\nError UUID: ${filterError.uuid}\n\n`;
               message += `${filterError.toString()}${s_MESSAGE_SEPARATOR}`;
               break;

            case 3:
               message += s_MESSAGE_TWO_MODULE;

               message += `\n\n${s_MESSAGE_SEPARATOR}\n${filterPackageObj.formattedMessage}\n`;
               message += `CLI: ${global.$$cli_name_version}\nError UUID: ${filterError.uuid}\n\n`;
               message += `${filterError.toString()}${s_MESSAGE_SEPARATOR}`;

               message += `\n\n${s_MESSAGE_SEPARATOR}\n${normalizedPackageObj.formattedMessage}\n`;
               message += `CLI: ${global.$$cli_name_version}\nError UUID: ${normalizedError.uuid}\n\n`;
               message += `${normalizedError.toString()}${s_MESSAGE_SEPARATOR}`;
               break;
         }

         // Log any uncaught errors as fatal.
         logger.fatal(message, '\n');

         return Errors.handle(error);
      }
      catch (err)
      {
         console.error(error.stack);
         console.error(err.stack);
         process.exit(1);
      }
   }
}

// TODO evaluate removing the use of Errors.handle and incorporate the key aspects of the Oclif error handler directly.
// TODO Reason: Errors print twice when using Error.handle. Below is the Oclif error handler.
/*
  try {
    if (!err) err = new CLIError('no error?')
    if (err.message === 'SIGINT') process.exit(1)

    const shouldPrint = !(err instanceof ExitError)
    const pretty = prettyPrint(err)
    const stack = clean(err.stack || '', {pretty: true})

    if (shouldPrint) {
      console.error(pretty ? pretty : stack)
    }

    const exitCode = err.oclif?.exit !== undefined && err.oclif?.exit !== false ? err.oclif?.exit : 1

    if (config.errorLogger && err.code !== 'EEXIT') {
      if (stack) {
        config.errorLogger.log(stack)
      }

      config.errorLogger.flush()
      .then(() => process.exit(exitCode))
      .catch(console.error)
    } else process.exit(exitCode)
  } catch (error) {
    console.error(err.stack)
    console.error(error.stack)
    process.exit(1)
  }

 */

export default new ErrorHandler();
