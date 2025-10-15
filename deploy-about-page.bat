@echo off
echo Deploying to AcciZard About Page...
firebase use blaze
firebase deploy --only hosting:accizard-about-page
echo Deployment complete!
pause


