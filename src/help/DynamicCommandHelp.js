// eslint-disable-next-line
import * as Interfaces  from '@oclif/core/lib/interfaces/index.js';

import Help             from './Help.js';

/**
 * Provides functionality to load flags from DynamicCommand asynchronously so that they appear in help.
 */
export default class DynamicCommandHelp extends Help
{
   /**
    * @param {Interfaces.Command} commandConfig - The command config to be loaded.
    */
   async showCommandHelp(commandConfig)
   {
      // Load the command class.
      const CommandClass = await commandConfig.load();

      if (typeof CommandClass.loadDynamicFlags === 'function')
      {
         commandConfig.flags = await CommandClass.loadDynamicFlags(CommandClass, this.config);
      }
      else
      {
         commandConfig.flags = typeof CommandClass.flags === 'object' ? CommandClass.flags : {};
      }

      await super.showCommandHelp(commandConfig);
   }
}
