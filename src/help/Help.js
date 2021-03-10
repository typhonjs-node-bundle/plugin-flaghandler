import { error }        from '@oclif/errors';
import * as chalk       from 'chalk';
import indent           from 'indent-string';
import stripAnsi        from 'strip-ansi';
import wrap             from 'wrap-ansi';

import CommandHelp      from '@oclif/core/lib/help/command.js'
import { renderList }   from '@oclif/core/lib/help/list.js'
import RootHelp         from '@oclif/core/lib/help/root.js'
import { stdtermwidth } from '@oclif/core/lib/help/screen.js'
import { template }     from '@oclif/core/lib/help/util.js'
import { compact, sortBy, uniqBy } from '@oclif/core/lib/util.js'

const {
   bold,
} = chalk

const ROOT_INDEX_CMD_ID = ''

/**
 *
 * @param {string[]} args
 * @returns {string, *}
 */
function getHelpSubject(args)
{
   for (const arg of args)
   {
      if (arg === '--') { return; }
      if (arg === 'help' || arg === '--help' || arg === '-h') { continue; }
      if (arg.startsWith('-')) { return; }

      return arg;
   }
}

export default class Help
{
   constructor(config, opts = {})
   {
      /**
       * {Config.IConfig}
       */
      this.config = config;

      /**
       * {HelpOptions}
       */
      this.opts = { maxWidth: stdtermwidth, ...opts };

      this.render = template(this);
   }

   /**
    * _topics is to work around Config.topics mistakenly including commands that do
    * not have children, as well as topics. A topic has children, either commands or other topics. When
    * this is fixed upstream config.topics should return *only* topics with children,
    * and this can be removed.
    *
    * @returns {Config.Topic[]}
    * @private
    */
   get _topics()
   {
      // since this.config.topics is a getter that does non-trivial work, cache it outside the filter loop for
      // performance benefits in the presence of large numbers of topics
      const topics = this.config.topics;

      return topics.filter((topic) =>
      {
         // it is assumed a topic has a child if it has children
         return topics.some(subTopic => subTopic.name.includes(`${topic.name}:`));
      });
   }

   get sortedCommands()
   {
      let commands = this.config.commands;

      commands = commands.filter(c => this.opts.all || !c.hidden);
      commands = sortBy(commands, c => c.id);
      commands = uniqBy(commands, c => c.id);

      return commands
   }

   get sortedTopics()
   {
      let topics = this._topics;

      topics = topics.filter(t => this.opts.all || !t.hidden);
      topics = sortBy(topics, t => t.name);
      topics = uniqBy(topics, t => t.name);

      return topics;
   }

   /**
    * Show help, used in multi-command CLIs
    * @param {string[]} argv passed into your command, useful for determining which type of help to display
    */
   async showHelp(argv)
   {
      const subject = getHelpSubject(argv);
      if (!subject)
      {
         const rootCmd = this.config.findCommand(ROOT_INDEX_CMD_ID);

         if (rootCmd)
         {
            await this.showCommandHelp(rootCmd);
         }

         await this.showRootHelp();

         return;
      }

      const command = this.config.findCommand(subject);

      if (command)
      {
         await this.showCommandHelp(command);
         return;
      }

      const topic = this.config.findTopic(subject);

      if (topic)
      {
         await this.showTopicHelp(topic);
         return
      }

      error(`command ${subject} not found`);
   }

   /**
    * Show help for an individual command.
    *
    * @param {Config.Command}  command
    *
    * @returns {Promise<void>}
    */
   async showCommandHelp(command)
   {
      const name = command.id;
      const depth = name.split(':').length;

      const subTopics = this.sortedTopics.filter(t => t.name.startsWith(name + ':') &&
       t.name.split(':').length === depth + 1);

      const subCommands = this.sortedCommands.filter(c => c.id.startsWith(name + ':') &&
       c.id.split(':').length === depth + 1);

      const title = command.description && this.render(command.description).split('\n')[0];

      if (title)
      {
         console.log(title + '\n');
      }

      console.log(this.formatCommand(command));
      console.log('');

      if (subTopics.length > 0)
      {
         console.log(this.formatTopics(subTopics));
         console.log('');
      }

      if (subCommands.length > 0)
      {
         console.log(this.formatCommands(subCommands));
         console.log('');
      }
   }

   async showRootHelp()
   {
      let rootTopics = this.sortedTopics;
      let rootCommands = this.sortedCommands;

      console.log(this.formatRoot());
      console.log('');

      if (!this.opts.all)
      {
         rootTopics = rootTopics.filter(t => !t.name.includes(':'));
         rootCommands = rootCommands.filter(c => !c.id.includes(':'));
      }

      if (rootTopics.length > 0)
      {
         console.log(this.formatTopics(rootTopics));
         console.log('');
      }

      if (rootCommands.length > 0)
      {
         rootCommands = rootCommands.filter(c => c.id);
         console.log(this.formatCommands(rootCommands));
         console.log('');
      }
   }

   /**
    * @param {Config.Topic} topic
    * @returns {Promise<void>}
    */
   async showTopicHelp(topic)
   {
      const name = topic.name;
      const depth = name.split(':').length;

      const subTopics = this.sortedTopics.filter(t => t.name.startsWith(name + ':') &&
       t.name.split(':').length === depth + 1);

      const commands = this.sortedCommands.filter(c => c.id.startsWith(name + ':') &&
       c.id.split(':').length === depth + 1);

      console.log(this.formatTopic(topic));

      if (subTopics.length > 0)
      {
         console.log(this.formatTopics(subTopics));
         console.log('');
      }

      if (commands.length > 0)
      {
         console.log(this.formatCommands(commands));
         console.log('');
      }
   }

   /**
    * @returns {string}
    */
   formatRoot()
   {
      const help = new RootHelp(this.config, this.opts);
      return help.root();
   }

   /**
    *
    * @param {Config.Command} command
    * @returns {string}
    */
   formatCommand(command)
   {
      const help = new CommandHelp.default(command, this.config, this.opts);
      return help.generate();
   }

   /**
    * @param {Config.Command[]}  commands
    * @returns {string}
    */
   formatCommands(commands)
   {
      if (commands.length === 0) return '';

      const body = renderList(commands.map(c => [
         c.id,
         c.description && this.render(c.description.split('\n')[0]),
      ]), {
         spacer: '\n',
         stripAnsi: this.opts.stripAnsi,
         maxWidth: this.opts.maxWidth - 2,
      });

      return [
         bold('COMMANDS'),
         indent(body, 2),
      ].join('\n');
   }

   /**
    * @param {Config.Topic} topic
    * @returns {string}
    */
   formatTopic(topic)
   {
      let description = this.render(topic.description || '');
      const title = description.split('\n')[0];

      description = description.split('\n').slice(1).join('\n');

      let output = compact([
         title,
         [
            bold('USAGE'),
            indent(wrap(`$ ${this.config.bin} ${topic.name}:COMMAND`, this.opts.maxWidth - 2, {
               trim: false,
               hard: true
            }), 2),
         ].join('\n'),
         description && ([
            bold('DESCRIPTION'),
            indent(wrap(description, this.opts.maxWidth - 2, {trim: false, hard: true}), 2),
         ].join('\n')),
      ]).join('\n\n');

      if (this.opts.stripAnsi) { output = stripAnsi(output); }

      return output + '\n';
   }

   /**
    * @param {Config.Topic[]} topics
    * @returns {string}
    */
   formatTopics(topics)
   {
      if (topics.length === 0) return '';

      const body = renderList(topics.map(c => [
         c.name,
         c.description && this.render(c.description.split('\n')[0]),
      ]), {
         spacer: '\n',
         stripAnsi: this.opts.stripAnsi,
         maxWidth: this.opts.maxWidth - 2,
      });

      return [
         bold('TOPICS'),
         indent(body, 2),
      ].join('\n');
   }

   /**
    * @deprecated used for readme generation
    * @param {Config.Command} command The command to generate readme help for
    * @return {string} the readme help string for the given command
    */
   command(command)
   {
      return this.formatCommand(command)
   }
}
