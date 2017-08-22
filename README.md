# Dashboard-vData

##Functionality: 

**> Historic mode**

	1. slider interval <= 14, different markers indicating different types of incidents will be displayed;
		- selectbox, pie charts, bar charts of types are generated
		- heat map toggle button
	1. slider interval > 14, markers will not display, only heat map will

**> Future mode**

	1. heat map predicting incidents


The myapp folder utilizes flask-socket to get data from the server and transfer data to and from the html ide

pymongo is used to read data from Mongo Express 

"incidentsPlot.html" is the dashboard interface

"incidentscode.js" is the Javascript for the dashboard interface

"burglarySnapshot" is a snapshot of the sample crime data (only has 2014-March data)
