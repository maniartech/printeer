/**
 * Prints the usage of the command line tool.
 */
export default () => {
  console.log(`
printeer - Web-to-PDF/PNG conversion utility

USAGE:
  printeer <url> <outputFile>        # Convert web page to PDF/PNG
  printeer doctor [OPTIONS]          # Run system diagnostics
  printeer help                      # Show this help message
  printeer version                   # Show version information

COMMANDS:
  doctor                             # System diagnostics and health checks
    --verbose, -v                    # Show detailed diagnostic information
    --json                           # Output results in JSON format
    --help, -h                       # Show doctor command help

EXAMPLES:
  printeer https://example.com output.pdf     # Convert to PDF
  printeer https://example.com output.png     # Convert to PNG
  printeer doctor                             # Check system health
  printeer doctor --verbose                   # Detailed diagnostics
  printeer doctor --json                      # JSON output

For more information, visit: https://github.com/maniartech/printeer
`);
}
