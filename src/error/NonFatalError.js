/**
 * Creates a non fatal error which doesn't trigger the CLI fatal error handling. A non-fatal "error" stops control
 * flow and may provide an appropriate log level for typhonjs-color-logger ('fatal', 'error', 'warn', 'info',
 * 'verbose', 'debug', 'trace').
 */
export default class NonFatalError extends Error
{
   /**
    * Stores a message and defines optional log level and error code.
    *
    * @param {string}   message - Error message
    * @param {string}   [logLevel='error] - The typhonjs-color-logger log level.
    * @param {number}   [errorCode=1] - The integer error code number. Automatically assigned from log level or `1`.
    */
   constructor(message, logLevel = 'error', errorCode = 1)
   {
      super(message);

      this.$$error_fatal = false;

      // Sanitize incoming data.
      let logEvent = 'log:error';
      let logQualifer = '';

      errorCode = Number.isInteger(errorCode) ? errorCode : 1;

      this.$$logEvent = logEvent;
      this.$$errorCode = errorCode;

      // Early out if logLevel is not a string
      if (typeof logLevel !== 'string')
      {
         return;
      }

      const results = logLevel.split(':');

      // Parse log level qualifier
      if (results.length > 1 && typeof results[1] === 'string')
      {
         switch (results[1])
         {
            case 'compact':
               logQualifer = ':compact';
               break;

            case 'nocolor':
               logQualifer = ':nocolor';
               break;

            case 'raw':
               logQualifer = ':raw';
               break;

            case 'time':
               logQualifer = ':time';
               break;
         }
      }

      // Set logEvent and errorCode based on logLevel.
      if (typeof results[0] === 'string')
      {
         switch (results[0])
         {
            case 'fatal':
               logEvent = `log:fatal${logQualifer}`;
               errorCode = 2;
               break;

            case 'error':
               logEvent = `log:error${logQualifer}`;
               errorCode = 1;
               break;

            case 'warn':
               logEvent = `log:warn${logQualifer}`;
               errorCode = 0;
               break;

            case 'info':
               logEvent = `log:info${logQualifer}`;
               errorCode = 0;
               break;

            case 'verbose':
               logEvent = `log:verbose${logQualifer}`;
               errorCode = 0;
               break;

            case 'debug':
               logEvent = `log:debug${logQualifer}`;
               errorCode = 0;
               break;

            case 'trace':
               logEvent = `log:trace${logQualifer}`;
               errorCode = 0;
               break;
         }
      }

      this.$$logEvent = logEvent;
      this.$$errorCode = errorCode;
   }
}
