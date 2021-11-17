if [[ "$1" == *"ferry-scraper"* ]]; then
    echo "Building ferry-scraper..."
    docker build -t "minicreative/ferry-scraper:$TRAVIS_BUILD_NUMBER" ./ferry-scraper
    docker tag minicreative/ferry-scraper:$TRAVIS_BUILD_NUMBER minicreative/ferry-scraper:latest
elif [[ "$1" == *"vessel-scanner"* ]]; then
    echo "Building vessel-scanner..."
    docker buildx build --platform linux/arm/v7 -t "minicreative/vessel-scanner:latest" ./vessel-scanner
elif [[ "$1" == *"app"* ]]; then
    echo "Building app..."
    docker build -t "minicreative/boat-tracker:$TRAVIS_BUILD_NUMBER" ./app
    docker tag minicreative/boat-tracker:$TRAVIS_BUILD_NUMBER minicreative/boat-tracker:latest
else
    echo "No matching build"
fi