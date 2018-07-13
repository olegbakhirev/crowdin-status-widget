# Crowdin project status widget 
Provides information about current translation progress for particular project in Crowdin.
Works in YouTrack 2018.1+, Hub 2018.1+, Upsource 2018.1+.
![](https://raw.githubusercontent.com/olegbakhirev/crowdin-status-widget/master/widget.png) 

# Development

1. NodeJS and NPM are required
2. Run `npm install` in the project folder to install dependencies
3. Run `npm start` in the project folder to run development http server
4. Open widgets playground (/dashboard/widgets-playground) and enter your development server address.
5. To build dist user `npm run-script build`

# Packing

1. After running `npm run-script build` archive all content of dist as ZIP file and it is ready to upload to Hub

# License

The code of this widget except of the pict/crowdin.ico file is licensed with Apache 2.0.


# DISCLAIMER
Crowdin logo name and icon (crowdin.ico) are registered trademark and property of Crowdin Inc.
