if [[ "$1" == *"ferry-scraper"* ]]; then
    echo "Deploying ferry-scraper..."
elif [[ "$1" == *"vessel-scanner"* ]]; then
    echo "Deploying vessel-scanner..."
elif [[ "$1" == *"app"* ]]; then
    echo "Deploying app..."
else
    echo "No matching build"
fi