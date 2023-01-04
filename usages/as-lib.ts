import printeer from "../index.js";

async function main() {

  // console.log("Printeer version", printeer)

  // Print a webpage to PDF
  const resPDF = await printeer('https://google.com', 'google.pdf')
  console.log("PDF saved to", resPDF)

  // Print a webpage to PNG
  const resPNG = await printeer('https://google.com', 'google.png')
  console.log("PNG saved to", resPNG)
}

// Run main function
try {
  await main()
} catch (e) {
  console.error(e)
}