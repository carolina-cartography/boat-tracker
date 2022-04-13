#!/bin/bash
if [[ "$1" == *"ferry-scraper"* ]]; then
    echo "Deploying ferry-scraper..."
    kubectl set image cronjob/ferry-scraper-cron "main=minicreative/ferry-scraper:$TRAVIS_BUILD_NUMBER"
elif [[ "$1" == *"vessel-scanner"* ]]; then
    echo "No push vessel-scanner deployment"
elif [[ "$1" == *"app"* ]]; then
    echo "Deploying app..."
    kubectl set image deployment/boat-tracker "main=minicreative/boat-tracker:$TRAVIS_BUILD_NUMBER"
elif [[ "$1" == *"archive-job"* ]]; then
    echo "Deploying archive-job..."
    kubectl set image cronjob/boat-tracker-archive-job-cron "main=minicreative/archive-job:$TRAVIS_BUILD_NUMBER"
else
    echo "No matching build"
fi