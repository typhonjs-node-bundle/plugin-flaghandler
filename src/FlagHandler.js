/**
 * Receives all flags from the various Oclif plugins allowing dynamic flag association for the plugin to a specific
 * Oclif command action. This allows TyphonJS Oclif plugins to register flags for command actions dynamically. When
 * commands are added in `addFlags` conflict checking occurs to ensure that no plugin can add the same flag or
 * shorthand alias. If a conflict occurs an error message is posted and CLI exits.
 *
 * There are three methods which are available on the plugin eventbus:
 *
 * `typhonjs:oclif:system:flaghandler:add` -> addFlags
 *
 * `typhonjs:oclif:system:flaghandler:get` -> getFlags
 *
 * `typhonjs:oclif:system:flaghandler:verify` -> verifyFlags
 */
class FlagHandler
{
   /**
    */
   constructor()
   {
      /**
       * Stores flags and a potential verify function broken down by command name -> plugin name -> { flags, verify }
       *
       * @type {{command_name: {plugin_name: {flags: {}, verify: function}}}}
       * @private
       */
      this._database = {};
   }

   /**
    * Adds new flags, but posts warnings if there are existing flags w/ the same name.
    *
    * @param {object}   newEntry - object defining command name, plugin name, and associated flags
    * @param {string}   newEntry.command - The command name to store the flags.
    * @param {string}   newEntry.plugin - The plugin name.
    * @param {object}   newEntry.flags - new flags to add.
    * @param {function} [newEntry.verify] - An optional function invoked to verify flags set by the given plugin.
    */
   addFlags(newEntry = {})
   {
      if (typeof newEntry !== 'object')
      {
         throw new Error(`FlagHandler addFlags: 'newEntry' is not an 'object'.`);
      }

      if (typeof newEntry.command !== 'string')
      {
         throw new Error(`FlagHandler addFlags: 'newEntry.command' is not a 'string'.`);
      }

      if (typeof newEntry.plugin !== 'string')
      {
         throw new Error(`FlagHandler addFlags: 'newEntry.plugin' is not a 'string'.`);
      }

      if (typeof newEntry.flags !== 'object')
      {
         throw new Error(`FlagHandler addFlags: 'newEntry.flags' is not an 'object'.`);
      }

      if (newEntry.verify !== null && newEntry.verify !== undefined)
      {
         if (typeof newEntry.verify !== 'function')
         {
            throw new Error(`FlagHandler addFlags: 'newEntry.verify' is not a 'function'.`);
         }
      }

      // Store the new entry parameters locally for easier reference.
      const commandName = newEntry.command;
      const pluginName = newEntry.plugin;
      const newFlags = newEntry.flags;
      const newVerify = typeof newEntry.verify === 'function' ? newEntry.verify : null;

      // Check for any existing flag conflicts for a given command. An error messages will be thrown if there are
      // conflicts.
      this._checkFlagConflict(commandName, pluginName, newFlags);

      // Retrieve existing 2nd level plugin names object or create new.
      const plugins = this._database[commandName] || {};

      // Assign copied flags by plugin name to command object.
      plugins[pluginName] = { flags: Object.assign(newFlags, {}), verify: newVerify };

      // Store command name object.
      this._database[commandName] = plugins;
   }

   /**
    * Checks if there are existing command / plugin flags that conflict with new flags being added.
    *
    * @param {string}   commandName - the name of the command
    * @param {string}   newPluginName - the name of the plugin for new flags attempting to be added.
    * @param {object}   newPluginFlags - new plugin flags to add.
    *
    * @throws {Error}   Throws an Error if conflict is detected
    * @private
    */
   _checkFlagConflict(commandName, newPluginName, newPluginFlags)
   {
      // Stores any conflict messages; if this is not empty at the end of the method an Error is thrown.
      let flagConflictMsg = '';

      // Retrieve the 2nd level object for the particular command name or create a new one.
      const plugins = this._database[commandName] || {};

      // Retrieve the second level keys / plugin names.
      const pluginNames = Object.keys(plugins);

      // Verify that an entry for the new plugin hasn't already been made.
      if (pluginNames.includes(newPluginName))
      {
         throw new Error(`flags have already been added for a plugin named '${newPluginName}.'`);
      }

      // The keys of the new flags to add - this is the long name for the flag.
      const newFlags = Object.keys(newPluginFlags);

      // Check all flags across all plugin names against new flags to add.
      for (const newFlag of newFlags)
      {
         // Store any alias for the new flag if defined.
         const newFlagChar = typeof newPluginFlags[newFlag].char === 'string' ? newPluginFlags[newFlag].char : null;

         // Iterate over all existing plugins and verify that the long flag name is not already defined.
         for (const pluginName of pluginNames)
         {
            // Retrieve the stored plugin flags or create a new object.
            const pluginFlags = plugins[pluginName].flags || {};

            // Verify that long hand flag is not already in plugin flags. Add a conflict message about the flag
            // already existing in the DB.
            if (newFlag in pluginFlags)
            {
               flagConflictMsg += `Flag '${newFlag}' from '${newPluginName}' already defined by `
                + `'${pluginName}' plugin for '${commandName}' command.\n`;
            }

            // If an alias is defined for the new flag then iterate over all existing plugin flags to check
            // alias conflicts w/ shorthand flag values. IE `--env` may also have a char associated `-e`.
            if (newFlagChar)
            {
               // Retrieve all the keys of the current plugin flags.
               const pluginFlagKeys = Object.keys(pluginFlags);

               // Iterate over plugin flag entry data.
               for (const pluginFlagKey of pluginFlagKeys)
               {
                  // Retrieve the Oclif entry data for this particular flag.
                  const pluginFlagEntry = pluginFlags[pluginFlagKey];

                  // An shorthand alias conflict is potentially found. If so add a conflict message.
                  if (typeof pluginFlagEntry.char === 'string' && pluginFlagEntry.char === newFlagChar)
                  {
                     flagConflictMsg += `Alias '${newFlagChar}' of flag '${newFlag}' from '${newPluginName}' already `
                     + `defined by '${pluginFlagKey}' flag in '${pluginName}' for '${commandName}' command.\n`;
                  }
               }
            }
         }
      }

      // If there are any conflict messages generated above then throw an error.
      if (flagConflictMsg !== '')
      {
         throw new Error(`FlagHandler Error - The following conflicts are detected:\n${flagConflictMsg}`);
      }
   }

   /**
    * Gets associated flags for a particular command name.
    *
    * @param {object}   query - Query object
    * @param {string}   query.command - Retrieve flags for this command name.
    *
    * @returns {*|{}}
    */
   getFlags(query = {})
   {
      if (typeof query !== 'object')
      {
         throw new Error(`FlagHandler getFlags: 'query' is not a 'string'.`);
      }

      // Locally store the command name from query.
      const commandName = query.command;

      if (typeof commandName !== 'string')
      {
         throw new Error(`FlagHandler getFlags: 'commandName' is not a 'string'.`);
      }

      // Retrieve existing command object or create new.
      const plugins = this._database[commandName] || {};

      // Retrieve the second keys for plugin names.
      const pluginNames = Object.keys(plugins);

      // Store all flags being returned for this request.
      const allFlags = {};

      // Combine all flags across all plugin names.
      for (const pluginName of pluginNames)
      {
         Object.assign(allFlags, plugins[pluginName].flags);
      }

      return allFlags;
   }

   /**
    * Wires up FlagHandler on the plugin eventbus.
    *
    * @param {PluginEvent} ev - The plugin event.
    *
    * @see https://www.npmjs.com/package/typhonjs-plugin-manager
    *
    * @ignore
    */
   onPluginLoad(ev)
   {
      const eventbus = ev.eventbus;

      eventbus.on(`typhonjs:oclif:system:flaghandler:add`, this.addFlags, this);
      eventbus.on(`typhonjs:oclif:system:flaghandler:get`, this.getFlags, this);
      eventbus.on(`typhonjs:oclif:system:flaghandler:verify`, this.verifyFlags, this);
   }

   /**
    * Invokes any stored Oclif plugin verification functions against the final command flags.
    *
    * @param {object}   query - Query object
    * @param {string}   query.command - Retrieve flags for this command name.
    * @param {object}   query.flags - Parsed flags for a command.
    */
   verifyFlags(query = {})
   {
      if (typeof query !== 'object')
      {
         throw new Error(`FlagHandler verifyFlags: 'query' is not a 'string'.`);
      }

      // Locally store query data.
      const commandName = query.command;
      const flags = query.flags;

      if (typeof commandName !== 'string')
      {
         throw new Error(`FlagHandler verifyFlags: 'commandName' is not a 'string'.`);
      }

      if (typeof flags !== 'object')
      {
         throw new Error(`FlagHandler verifyFlags: 'flags' is not an 'object'.`);
      }

      // Retrieve existing command object or create new.
      const plugins = this._database[commandName] || {};

      // Retrieve the second level keys for plugin names.
      const pluginNames = Object.keys(plugins);

      // Iterate over all plugins and if any verification functions have been provided then invoke them on the
      // provided flags. Each verification plugin is responsible for throwing an error.
      for (const pluginName of pluginNames)
      {
         const verifyFunc = plugins[pluginName].verify;

         if (typeof verifyFunc === 'function')
         {
            verifyFunc(flags);
         }
      }
   }
}

module.exports = FlagHandler;