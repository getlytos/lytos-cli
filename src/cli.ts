import { Command } from "commander";

const program = new Command();

program
  .name("socle")
  .description(
    "CLI tool for Le Socle — a human-first method for working with AI agents"
  )
  .version("0.0.0");

// Commands will be registered here as they are implemented:
// program.addCommand(initCommand);
// program.addCommand(boardCommand);
// program.addCommand(lintCommand);
// program.addCommand(doctorCommand);
// program.addCommand(statusCommand);

program.parse();
