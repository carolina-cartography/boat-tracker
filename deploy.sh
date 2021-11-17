#!/bin/bash
if [[ "$1" == *"ferry-scraper"* ]]; then
    echo "Deploying ferry-scraper..."
    docker push --all-tags minicreative/ferry-scraper
    kubectl set image cronjob/ferry-scraper-cron "main=minicreative/ferry-scraper:$TRAVIS_BUILD_NUMBER"
elif [[ "$1" == *"vessel-scanner"* ]]; then
    echo "Deploying vessel-scanner..."
    docker push minicreative/vessel-scanner:latest
elif [[ "$1" == *"app"* ]]; then
    echo "Deploying app..."
    docker push --all-tags minicreative/boat-tracker
    kubectl set image deployment/boat-tracker "main=minicreative/boat-tracker:$TRAVIS_BUILD_NUMBER"
else
    echo "No matching build"
fi