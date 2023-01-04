echo "Ensure that you have installed printeer globally"
echo "npm install -g printeer"
echo

echo "Printing a google.com screenshot to a PDF file"
# Print google.com screenshot to a PDF file
printeer https://google.com google.pdf
echo "Screenshot printed to google.pdf"

echo "Printing a google.com screenshot to a PNG file"
# Print a google.com screenshot to a PNG file
printeer https://google.com google.png
echo "Screenshot printed to google.png"
