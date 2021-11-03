if [[ "$1" == *"ferry-scraper"* ]]; then
    echo "Building ferry-scraper..."
elif [[ "$1" == *"vessel-scanner"* ]]; then
    echo "Building vessel-scanner..."
elif [[ "$1" == *"app"* ]]; then
    echo "Building app..."
else
    echo "No matching build"
fi