import * as FUF from './FileUtilFunctions.js';

/**
 * Wires up FileUtil functions on the plugin eventbus.
 *
 * @param {object} ev - PluginEvent - The plugin event.
 *
 * @see https://www.npmjs.com/package/typhonjs-plugin-manager
 */
export function onPluginLoad(ev)
{
   const eventbus = ev.eventbus;

   eventbus.on(`typhonjs:util:file:dir:walk`, FUF.walkDir);
   eventbus.on(`typhonjs:util:file:file:has`, FUF.hasFile);
   eventbus.on(`typhonjs:util:file:files:walk`, FUF.walkFiles);
   eventbus.on(`typhonjs:util:file:list:dir:get`, FUF.getDirList);
   eventbus.on(`typhonjs:util:file:list:file:get`, FUF.getFileList);
   eventbus.on(`typhonjs:util:file:path:relative:get`, FUF.getRelativePath);
   eventbus.on(`typhonjs:util:file:sort:path`, FUF.pathSort);
   eventbus.on(`typhonjs:util:file:url:path:dir:get`, FUF.getURLDirpath);
   eventbus.on(`typhonjs:util:file:url:path:file:get`, FUF.getURLFilepath);
}
