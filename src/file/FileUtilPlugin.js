import * as FU from './FileUtilFunctions.js';

/**
 * Provides a few utility functions to walk the local file tree.
 */

/**
 * Wires up FlagHandler on the plugin eventbus.
 *
 * @param {object} ev - PluginEvent - The plugin event.
 *
 * @see https://www.npmjs.com/package/typhonjs-plugin-manager
 *
 * @ignore
 */
export function onPluginLoad(ev)
{
   const eventbus = ev.eventbus;

   eventbus.on(`typhonjs:util:file:list:dir:get`, FU.getDirList);
   eventbus.on(`typhonjs:util:file:list:file:get`, FU.getFileList);
   eventbus.on(`typhonjs:util:file:path:relative:get`, FU.getRelativePath);
   eventbus.on(`typhonjs:util:file:url:path:dir:get`, FU.getURLDirpath);
   eventbus.on(`typhonjs:util:file:url:path:file:get`, FU.getURLFilepath);
   eventbus.on(`typhonjs:util:file:file:has`, FU.hasFile);
   eventbus.on(`typhonjs:util:file:dir:walk`, FU.walkDir);
   eventbus.on(`typhonjs:util:file:files:walk`, FU.walkFiles);
}
