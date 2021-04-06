/**
 * Removes any temporary environment variables potentially added as DynamicCommand configuration option.
 */
export default function finallyHandler()
{
   if (Array.isArray(globalThis.$$process_env_key_change))
   {
      globalThis.$$process_env_key_change.forEach((entry) => delete process.env[entry]);
   }
}
