import { Errors }          from '@oclif/core';

import { NonFatalError }   from '@typhonjs-oclif/errors';

import logger              from '@typhonjs-utils/logger-color';
import PackageUtil         from '@typhonjs-utils/package-json';

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
 * Adds the essential handling from the Oclif error handler with the addition of logging better errors based
 * on stack trace normalization / filtering and lookup for any associated package.json / modules.
 *
 * @param {Error}    error - Error to handle / log.
 *
 * @param {boolean}  [processExit=true] - Set to false to log errors and not exit process except for SIGINT.
 *
 * @see @typhonjs-utils/error-parser - for filtering capabilities.
 */
export default function errorHandler(error, processExit = true)
{
   try
   {
      // Handle removing any temporary environment variables added as a configuration option.
      if (Array.isArray(globalThis.$$process_env_key_change))
      {
         globalThis.$$process_env_key_change.forEach((entry) => delete process.env[entry]);
      }

      if (!error) { error = new Errors.CLIError('no error?'); }
      if (error.message === 'SIGINT') { process.exit(1); }

      // Handle TyphonJS NonFatalError
      if (error instanceof NonFatalError || (typeof error.$$error_fatal === 'boolean' && !error.$$error_fatal))
      {
         const logEvent = typeof error.$$logEvent === 'string' ? error.$$logEvent : 'log:error';
         const errorCode = Number.isInteger(error.$$errorCode) ? error.$$errorCode : 1;

         // log error message unless the log event is `log:trace`.
         globalThis.$$eventbus.trigger(logEvent, logEvent !== 'log:trace' ? error.message : error);

         if (processExit)
         {
            process.exit(errorCode);
         }
         else
         {
            return;
         }
      }

      // Acquire trace info from '@typhonjs-utils/error-parser'
      const normalizedError = globalThis.$$errorParser.normalize({ error });
      const filterError = globalThis.$$errorParser.filter({ error });

      // Do not print a formatted message if the error is an Oclif error.
      // TODO: what about PrettyPrintableError that has extra data?
      const prettyPrint = !(error instanceof Errors.ExitError) && !(error instanceof Errors.CLIError);

      if (prettyPrint)
      {
         // Attempt to find the `package.json` from first file path in the normalized error.
         const normalizedPackageObj = PackageUtil.getPackageAndFormat({
            filepath: normalizedError.firstFilepath,
            callback: (data) => typeof data.packageObj.name === 'string'
         });

         // Attempt to find the `package.json` from first file path in the filtered error (likely source of error).
         const filterPackageObj = PackageUtil.getPackageAndFormat({
            filepath: filterError.firstFilepath,
            callback: (data) => typeof data.packageObj.name === 'string'
         });

         let bitfield = 0;
         bitfield |= normalizedPackageObj !== void 0 ? 1 : 0;
         bitfield |= filterPackageObj !== void 0 ? 2 : 0;

         // Handle the cases when both filtered and normalized error stacks point to same module or the filtered
         // stack is empty.
         if (normalizedError.firstFilepath === filterError.firstFilepath || filterError.stack.length === 0)
         {
            bitfield = 1;
         }

         let message = `An uncaught fatal error has occurred.`;

         switch (bitfield)
         {
            case 0:
               message += ` ${globalThis.$$cli_name_version}:\n${normalizedError.toString()}`;
               break;
            case 1:
               message += s_MESSAGE_ONE_MODULE;

               message += `\n\n${s_MESSAGE_SEPARATOR}\n${normalizedPackageObj.formattedMessage}\n`;
               message += `CLI: ${globalThis.$$cli_name_version}\nError UUID: ${normalizedError.uuid}\n\n`;
               message += `${normalizedError.toString()}${s_MESSAGE_SEPARATOR}`;
               break;

            case 2:
               message += s_MESSAGE_ONE_MODULE;

               message += `\n\n${s_MESSAGE_SEPARATOR}\n${filterPackageObj.formattedMessage}\n`;
               message += `CLI: ${globalThis.$$cli_name_version}\nError UUID: ${filterError.uuid}\n\n`;
               message += `${filterError.toString()}${s_MESSAGE_SEPARATOR}`;
               break;

            case 3:
               message += s_MESSAGE_TWO_MODULE;

               message += `\n\n${s_MESSAGE_SEPARATOR}\n${filterPackageObj.formattedMessage}\n`;
               message += `CLI: ${globalThis.$$cli_name_version}\nError UUID: ${filterError.uuid}\n\n`;
               message += `${filterError.toString()}${s_MESSAGE_SEPARATOR}`;

               message += `\n\n${s_MESSAGE_SEPARATOR}\n${normalizedPackageObj.formattedMessage}\n`;
               message += `CLI: ${globalThis.$$cli_name_version}\nError UUID: ${normalizedError.uuid}\n\n`;
               message += `${normalizedError.toString()}${s_MESSAGE_SEPARATOR}`;
               break;
         }

         // Log any uncaught errors as fatal.
         logger.fatal(message, '\n');
      }
      else
      {
         logger.fatal(error.message);
      }

      // Handling of Oclif errors and specific error logger installed.
      const exitCode = error.oclif?.exit !== void 0 && error.oclif?.exit !== false ? error.oclif?.exit : 1;

      if (Errors.config.errorLogger && error.code !== 'EEXIT')
      {
         if (normalizedError)
         {
            Errors.config.errorLogger.log(normalizedError.toString());
         }

         Errors.config.errorLogger.flush()
            .then(() => { if (processExit) { process.exit(exitCode); } })
            .catch(console.error);
      }
      else
      {
         if (processExit) { process.exit(exitCode); }
      }
   }
   catch (err)
   {
      console.error(error.stack);
      console.error(err.stack);
      if (processExit) { process.exit(1); }
   }
}
