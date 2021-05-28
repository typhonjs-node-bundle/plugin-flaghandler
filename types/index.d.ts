import * as Interfaces from '@oclif/core/lib/interfaces/index.js';

/**
 * Provides default handling for TyphonJS dynamic command initialization of flags from Oclif plugins.
 */
declare class DynamicCommand {
    /**
     * Loads all dynamic flags for this command after running any init hook.
     *
     * @param {object}   CommandClass - The DynamicCommand subclass.
     *
     * @param {object}   config - An Oclif config.
     *
     * @param {boolean}  [loadDefault=true] - A boolean indicating whether to load defaults or current environment
     *                                        variables.
     *
     * @returns {Promise<{}>} - Parsed flags.
     */
    static loadDynamicFlags(CommandClass: object, config: object, loadDefault?: boolean): Promise<{}>;
    /**
     * Performs any final steps before the command execution completes. This is useful for logging any data
     * in response to the `--metafile` flag.
     */
    finally(): Promise<void>;
    /**
     * Returns the parsed data.
     *
     * @returns {*} Any loaded command data.
     */
    get commandData(): any;
    /**
     * Returns the parsed CLI flags.
     *
     * @returns {object} Parsed CLI flags.
     */
    get cliFlags(): any;
    /**
     * Attempts to load environment variables from a *.env file w/ `dotenv`. Many flags have defaults, but also can be
     * set with environment variables and this is a convenient way to load many different configurations.
     *
     * Note: If an environment file is loaded by `dotenv` the flags are parsed again below via
     * `this.parse(BuildCommand)`.
     *
     * @param {object}   existingFlags - parsed flags from command.
     *
     * @param {object}   CommandClass - The actual child command class.
     *
     * @returns {object} Either the existing flags if there is no .env file to load or the new flags after new
     * environment variables have been loaded.
     *
     * @private
     */
    private _loadEnvFile;
    /**
     * Performs all initialization, loading of flags from *.env file via dotenv and verification of flags.
     */
    init(): Promise<void>;
    _cliFlags: any;
    _commandData: any;
    /**
     * Performs all initialization, loading of flags from *.env file via dotenv and verification of flags.
     *
     * @param {string[]} commands - The actual command names.
     *
     * @returns {object} Parsed and verified flags.
     *
     * @private
     */
    private _initializeFlags;
    /**
     * Provides the base method to be overridden to provide per command implementation details.
     *
     * @returns {string} - A string containing a description of the command.
     */
    toString(): string;
}
declare namespace DynamicCommand {
    const _metaFileData: {
        key: string;
        filename: string;
    }[];
}

/**
 * Defines standard CLI command flags.
 */
declare class DynamicCommandFlags {
    /**
     * Defines standard flags shared across multiple commands.
     *
     * Added flags include:
     * `--cwd`       -      - Use an alternative working directory.      - default: `'.'`     - env: {prefix}_CWD
     * `--env`       - `-e` - Name of *.env file to load from `./env`.
     * `--loglevel`  -      - Sets log level.                            - default: `'info'`  - env: {prefix}_LOG_LEVEL
     * `--metafile`  -      - Archives CLI runtime metafiles.            - default: `false`  -
     * `--no-color`  -      - Output and log with no color.              - default: `false`   -
     * `--noop`      -      - Prints essential bundling info and exits.  - default: `false`   -
     *
     * @returns {object} Standard flags
     */
    static get flags(): any;
    /**
     * Verifies loaded flag data.
     *
     * @param {object}   flags - loaded flags.
     */
    static verify(flags: object): void;
}

/**
 * Provides functionality to load flags from DynamicCommand asynchronously so that they appear in help.
 */
declare class DynamicCommandHelp {
    /**
     * @param {Interfaces.Command} commandConfig - The command config to be loaded.
     */
    showCommandHelp(commandConfig: Interfaces.Command): Promise<void>;
}

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
declare function errorHandler(error: Error, processExit?: boolean): void;

/**
 * Removes any temporary environment variables potentially added as DynamicCommand configuration option.
 */
declare function finallyHandler(): void;

export { DynamicCommand, DynamicCommandFlags, DynamicCommandHelp, errorHandler, finallyHandler };
