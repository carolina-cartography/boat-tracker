#!/bin/bash
if [[ "$1" == *"ferry-scraper"* ]]; then
    echo "Building ferry-scraper..."
    docker build -t "minicreative/ferry-scraper:$TRAVIS_BUILD_NUMBER" ./ferry-scraper
    docker tag minicreative/ferry-scraper:$TRAVIS_BUILD_NUMBER minicreative/ferry-scraper:latest
    docker push --all-tags minicreative/ferry-scraper
elif [[ "$1" == *"vessel-scanner"* ]]; then
    echo "Building vessel-scanner..."
    mkdir -vp ~/.docker/cli-plugins/
    curl --silent -L "https://github.com/docker/buildx/releases/download/v0.7.0/buildx-v0.7.0.linux-amd64" > ~/.docker/cli-plugins/docker-buildx
    chmod a+x ~/.docker/cli-plugins/docker-buildx
    docker run --rm --privileged multiarch/qemu-user-static --reset -p yes
    docker buildx create --name xbuilder --use
    docker buildx build --platform linux/arm/v7 --build-arg "vessel_scanner_version=$TRAVIS_BUILD_NUMBER" --tag "minicreative/vessel-scanner:latest" --push ./vessel-scanner
elif [[ "$1" == *"app"* ]]; then
    echo "Building app..."
    docker build -t "minicreative/boat-tracker:$TRAVIS_BUILD_NUMBER" ./app
    docker tag minicreative/boat-tracker:$TRAVIS_BUILD_NUMBER minicreative/boat-tracker:latest
    docker push --all-tags minicreative/boat-tracker
else
    echo "No matching build"
fi