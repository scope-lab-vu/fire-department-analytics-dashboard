/**
 * Created by Jessie on 6/27/17.
 * Script for setting markers, heat maps, info windows for Json data
 */
var map;
var centerNash = {lat: 36.1627, lng: -86.7816};

// Create an initial map - plain, center at centerNash
function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 11,
        center: centerNash,
        mapTypeId: 'roadmap',
        scrollwheel: false
    });

    // Create the DIV to hold the control and call the CenterControl()
    // constructor passing in this DIV.
    var centerControlDiv = document.createElement('div');
    var centerControl = new CenterControl(centerControlDiv, map);

    centerControlDiv.index = 1;
    map.controls[google.maps.ControlPosition.TOP_CENTER].push(centerControlDiv);

}

/* On submit button: get data from left menu bar, if date is not filled,
 * alert message until user fills in data;
 * calls to formulate data correctly */
var types = [];  // types of markers already on map
function getData() {
    types.length = 0;
    types = [];
    var mongo_Address = document.getElementById('mongoDB').value,
        chart_Option = document.getElementById('chartList').value,
        start_Date = document.getElementById('date1').value,
        start_Hour = document.getElementById('hour1').value,
        end_Date = document.getElementById('date2').value,
        end_Hour = document.getElementById('hour2').value;

    if (start_Date==="") {
        alert("Date must be filled!!!");
    } else {
        formulateDate(start_Date, end_Date, start_Hour, end_Hour);
    }
}

/* formulate date entered, if hours are left blank, enter default values
 * set markers based on data and start and end date/time */
function formulateDate(date1, date2, hour1, hour2) {
    var start_year = date1.substring(0,4),
        start_month = date1.substring(5,7),
        start_day = date1.substring(8,10),
        end_year = date2.substring(0,4),
        end_month = date2.substring(5,7),
        end_day = date2.substring(8,10),
        start_hour = hour1,
        end_hour = hour2;

    if  (start_hour === "") {
        start_hour = 0;
    }
    if (end_hour === "") {
        end_hour = 24;
    }

    var startDate = new Date();
    startDate.setFullYear(Number(start_year), Number(start_month)-1, Number(start_day));
    startDate.setHours(Number(start_hour),0,0,0);

    var endDate = new Date();
    endDate.setFullYear(Number(end_year), Number(end_month)-1, Number(end_day));
    endDate.setHours(Number(end_hour),0,0,0);

    setMarkers(startDate, endDate);
}


// create floating panel for map
function CenterControl(controlDiv, map) {
    // Set CSS for the control border.
    var controlUI = document.createElement('div');
    controlUI.style.backgroundColor = '#fff';
    controlUI.style.border = 'solid #fff';
    controlUI.style.borderRadius = '5px';
    controlUI.style.boxShadow = '0 6px 6px rgba(0,0,0,.3)';
    controlUI.style.cursor = 'pointer';
    controlUI.style.marginBottom = '12px';
    // controlUI.style.textAlign = 'right';
    controlUI.style.marginTop = "37px";
    controlUI.title = 'Click to recenter the map';
    controlDiv.appendChild(controlUI);

    // Set CSS for the control interior.
    var controlText = document.createElement('div');
    controlText.style.color = 'rgb(25,25,25)';
    controlText.style.fontFamily = 'Roboto,Arial,sans-serif';
    controlText.style.fontSize = '12px';
    controlText.style.lineHeight = '10px';
    controlText.style.paddingLeft = '5px';
    controlText.style.paddingRight = '5px';
    controlText.innerHTML = 'Center Map';
    controlUI.appendChild(controlText);

    // Setup the click event listeners: simply set the map to Chicago.
    controlUI.addEventListener(
        'click',
        function() {
            map.setCenter(centerNash);
            map.setZoom(11);
        }
    );
}

// turn json file to .js file
var json = (function() {
    var json = null;
    $.ajax({
        'async': false,
        'global': false,
        'url': "package.json", // there are only 3957 data points in this json file
        'dataType': "json",
        'success': function (data) {
            json = data;
        }
    });
    return json;
})();

// read csv file
$(document).ready(function() {
    $.ajax({
        type: "GET",
        url: "burglarySnapshot.csv",
        dataType: "text",
        success: function(data) {getBurglary(data);}
    });
});

// get csv data, turn results into array of objects
var lines = [];
function getBurglary(allText) {
    var allTextLines = allText.split("\r");
    var headers = allTextLines[0].split("	");

    for (var i=1; i<allTextLines.length; i++) {
        var data = allTextLines[i].split("	");
        if (data.length === headers.length) {
            var tarr = [];
            for (var j=0; j<headers.length; j++) {
                tarr[headers[j]]=data[j];
            }
            lines.push(tarr);
        }
    }
    // console.log(lines[1]);
}


var markers = [],  // an array of all markers objects
    markersArr = [], // an array of markers according to types of incidents
    heatDataAll = [],
    heatDataTraffic = [],
    heatDataBurglary = [];



// set burglary data
function setBurglary(startDate, endDate) {
    arr = [];
    var r1 = lines;
    var image = {
        url: 'http://paybefore.com/wp-content/uploads/2016/09/burglar-icon-208x300.png',
        scaledSize: new google.maps.Size(20, 30)
    };
    for (var i = 0; i < r1.length; i++) {
        var d = r1[i]._date,
            t = r1[i]._time,
            hour;

        if (t.length===4) {
            hour = t.substring(0,1);
        } else {
            hour = t.substring(0,2)
        }
        var incident_date = new Date();
        incident_date.setFullYear(Number(d.substring(0,4)), Number(d.substring(4,6))-1, Number(d.substring(6,8)));
        incident_date.setHours(hour, 0, 0, 0);

        if (incident_date >= startDate && incident_date <= endDate) {
            console.log("burglary: "+incident_date);

            var latLng = new google.maps.LatLng(r1[i].LATITUDE, r1[i].LONGITUDE),
                contentString = "Occured: "+incident_date +"</br>" +"Reported: " + r1[i].IncidentReported,
                marker = new google.maps.Marker(createMarkerObj(latLng,map,image,contentString));

            heatDataAll.push(latLng);
            setInfoWindow(marker);
            arr.push(marker);
            markers.push(marker);
        }
    }
    if (arr.length !== 0) {
        markersArr["Burglary"] = arr;
        markersArr.length++;
        types.push("Burglary");
    }
}

function createMarkerObj(position, map, icon, content) {
    var obj = {};
    obj["position"] =  position;
    obj["map"] = map;
    obj["icon"] = icon;
    obj["contentString"] = content;
    return obj;
}

// set traffic incidents markers
function setIncident(startDate, endDate) {
    var months = ["January", "February", "March", "April", "May", "June", "July", "August",
        "September", "October", "November", "December"];
    var r = json.incidents;
    // console.log(Object.keys(r[0]));

    var sumOfIncidents = [];
    sumOfIncidents.length=0;
    sumOfIncidents = [0,0,0,0,0,0];  // sum of incidents happened at each level of severity
    var arr = [];
    for (var i = 0; i < r.length; i++) {
        var hour;
        var d = r[i].alarmDate;
        if (d.length === 19) {
            hour = Number(d.substring(11,13));
        } else {
            hour = Number(d.substring(11,12));
        }

        var incident_date = new Date();
        incident_date.setFullYear(Number(r[i].year), months.indexOf(r[i].month), Number(r[i].day));
        incident_date.setHours(hour,0,0,0);


        if (incident_date >= startDate && incident_date <= endDate) {
            console.log("accident: "+incident_date);

            var latLng = new google.maps.LatLng(r[i]._lat, r[i]._lng);
            heatDataAll.push(latLng);
            var content = '<b>Incident Number: </b>' + r[i].incidentNumber +
                '</br><b>Alarm Date: </b>' + r[i].alarmDate +
                '</br><b>Location: </b>' + r[i].streetNumber + " " + r[i].streetPrefix + " "
                + r[i].streetName + " " + r[i].streetSuffix + " " + r[i].streetType + ", "
                + r[i].city + ", " + r[i].county + ", " + r[i].state + " " + Math.round(r[i].zipCode) +
                '</br><b>Severity: </b>' + r[i].severity +
                '</br><b>Closest Station: </b>' + r[i].closestStation +
                '</br>Object Id: ' + r[i]._id;

            var severity = "ABCDE";
            var marker;
            var colors = ['#00a6ff', '#bbec26', '#ffe12f', '#ff9511', '#ff0302'];
            content = content.replace(/nan/g, "");
            var indexABCDE = severity.indexOf(r[i].severity);

            var imgCardiac = {
                url: 'https://cdn1.iconfinder.com/data/icons/medicine-healthcare-disease/100/07-512.png',
                scaledSize: new google.maps.Size(20, 20)
                },
                imgTrauma = {
                    url: 'https://cdn3.iconfinder.com/data/icons/health-medicine/512/Injury-512.png',
                    scaledSize: new google.maps.Size(20, 30)
                },
                imgMVA = {
                    url: 'https://image.flaticon.com/icons/png/128/65/65788.png',
                    scaledSize: new google.maps.Size(20, 30)
                },
                imgFire = {
                    url: 'https://cdn2.iconfinder.com/data/icons/fire-department/500/burning-512.png',
                    scaledSize: new google.maps.Size(20, 30)
                };

            // if severity is known:
            if (indexABCDE > -1) {
                sumOfIncidents[indexABCDE]++;
                marker = new google.maps.Marker({
                    position: latLng,
                    map: map,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        fillColor: colors[indexABCDE],
                        fillOpacity: .9, // number between 0.0 and 1.0, 1.0 means not opaque at all
                        // scale: Math.pow(1.3, indexABCDE+2)+2,
                        scale: 5,
                        strokeColor: 'black',
                        strokeWeight: .1
                    },
                    contentString: content
                });
            // if severity is unknown
            } else {
                sumOfIncidents[5]++;
                marker = new google.maps.Marker({
                    position: latLng,
                    map: map,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        fillColor: '#797A7A',
                        fillOpacity: .75,
                        scale: 4,
                        strokeColor: 'white',
                        strokeWeight: .1
                    },
                    contentString: content
                });
            }

            setInfoWindow(marker);
            arr.push(marker);
            markers.push(marker);
        }
    } // for loop ends
    if (arr.length !== 0) {
        types.push("Traffic Accidents");
        markersArr["Traffic Accidents"] = arr;
        markersArr.length++;
        setBar(sumOfIncidents);
    }
    // setPie(sumOfIncidents);
}


// set info windows
var infowindow;
function setInfoWindow(marker) {
    // make markers bounce 3 times
    marker.addListener('click', function() {
        if (marker.getAnimation() !== null) {
            marker.setAnimation(null);
        } else {
            marker.setAnimation(google.maps.Animation.BOUNCE);
            setTimeout(function () {
                marker.setAnimation(null);
            }, 750*3);
        }
    });

    // add pop up info window
    infowindow = new google.maps.InfoWindow();
    marker.addListener('click', function() {
        infowindow.close(map,this); // close previous window first
        infowindow.setContent(this.contentString);
        infowindow.open(map, this);

    });
}

/*
 * SET ALL MARKERS
 */
function setMarkers(startDate, endDate) {
    document.getElementById('markers').innerHTML = 'Hide Markers';
    // remove markers from the map, but still keeps them in the array
    for (var i = 0; i < markers.length; i++) {
        markers[i].setMap(null);
    }
    // delete all by removing reference to them,
    // so that when user hit "submit" again, previous markers are gone
    markers = [];
    markers.length = 0;
    heatDataAll.length = 0;
    markersArr = [];
    markersArr.length = 0;
    console.log("markersArr length:   "+ markersArr.length+ "\n   "+markersArr);
    setIncident(startDate,endDate);
    setBurglary(startDate, endDate);
    console.log(markersArr); // should look like [Traffic Accidents: Array(x), Burglary: Array(y)]

    var arr = [['Types', 'Number']];
    for (var j=0; j<types.length; j++) {
        var a = [];
        a.push(types[j]);
        a.push(markersArr[types[j]].length);
        arr.push(a);
    }
    console.log(arr);

    google.charts.load('current', {packages: ['corechart']});
    google.charts.setOnLoadCallback(function() {
        setPie(arr);
    });

    printSummary();
}

/* print a summary of total of incidents,
 * generate checkbox for each type of incidents
 */
function printSummary() {
    document.getElementById('total').innerHTML = "Total incidents: "+ (markers.length);
    document.getElementById('chooseType').innerHTML = "Check type: ";

    var div = document.querySelector(".subplayground1");

    for (var i=0; i<types.length; i++) {
        if (document.getElementById(types[i]) === null) {
            var typeCheckbox = document.createElement("input");
            typeCheckbox.type = "checkbox";
            typeCheckbox.id = types[i];
            typeCheckbox.checked = true;
            var label = document.createTextNode(types[i]);
            div.appendChild(typeCheckbox);
            div.appendChild(label)
        }
    }

    // generate submit button
    if (document.getElementById("submitButton") === null) {
        var submit = document.createElement("button");
        submit.innerHTML = "Only see these types of incidents";
        submit.id = "submitButton";
        submit.style.float = "right";
        submit.onclick = getType;
        div.appendChild(submit);
    }
}

// Hide or Show markers according to user check box

function getType() {
    for (var i=0; i<types.length; i++) {
        console.log(types[i]+ ": "+ document.getElementById(types[i]).checked);
        var arr = markersArr[types[i]];
        if (document.getElementById(types[i]).checked === true) {
            for (var j=0; j<arr.length; j++) {
                if (!arr[j].getVisible()) {
                    arr[j].setVisible(true);
                }
            }
        } else {
            for (var k=0; k<arr.length; k++) {
                if (arr[k].getVisible()) {
                    arr[k].setVisible(false);
                }
            }
        }
    }
}

// toggle markers by changing their visibility
function toggleMarkers(arrOfArr) {
    if (types.length !== arrOfArr.length) {
        alert("Mismatch of numbers of elements in 'types' and 'arrOfArr'");
    } else {
        for (var j = 0; j < types.length; j++) {
            if (document.getElementById(types[j]).checked) {
                var arr = arrOfArr[types[j]];
                for (var i = 0; i < arr.length; i++) {
                    if (arr[i].getVisible()) {
                        arr[i].setVisible(false);
                        document.getElementById('markers').innerHTML = 'Show Markers';
                    } else {
                        arr[i].setVisible(true);
                        document.getElementById('markers').innerHTML = 'Hide Markers';
                    }
                }
            }
        }
    }
}


// generate heat mao layer, after which change button
var heatmap;
function setHeatMap() {
    heatmap= new google.maps.visualization.HeatmapLayer({
        data: heatDataAll,
        dissipating: false,
        map: map,
        opacity:0.8,
        radius:0.007
    });
    document.getElementById('heat').innerHTML = 'Show/hide Heatmap';
    document.getElementById('heat').onclick = function () {
        toggleHeatmap();
    }
}

// toggle heat map
function toggleHeatmap() {
    heatmap.setMap(heatmap.getMap() ? null : map);
}

// toggle gradient
function changeGradient() {
    var gradient = [
        'rgba(0, 255, 255, 0)',
        'rgba(0, 255, 255, 1)',
        'rgba(0, 191, 255, 1)',
        'rgba(0, 127, 255, 1)',
        'rgba(0, 63, 255, 1)',
        'rgba(0, 0, 255, 1)',
        'rgba(0, 0, 223, 1)',
        'rgba(0, 0, 191, 1)',
        'rgba(0, 0, 159, 1)',
        'rgba(0, 0, 127, 1)',
        'rgba(63, 0, 91, 1)',
        'rgba(127, 0, 63, 1)',
        'rgba(191, 0, 31, 1)',
        'rgba(255, 0, 0, 1)'
    ];
    heatmap.set('gradient', heatmap.get('gradient') ? null : gradient);
}

// When the user clicks on "help", open the popup
function help() {
    var popup = document.getElementById("pop");
    popup.classList.toggle("show");
}


// set a bar chart according to data passed
function setBar(data) {
    // remove current bar chart first
    d3.select(".bar").selectAll("div").remove();
    var sum = 0;
    for (var i=0; i<data.length; i++) {
        sum += data[i];
    }
    var x = d3.scaleLinear()
        .domain([0, d3.max(data)])
        .range([0, 250]);

    var colors = ['#00a6ff', '#bbec26', '#ffe12f', '#ff9511', '#ff0302', '#797A7A'];
    var severity = ["A","B","C","D","E","N.A"];
    d3.select(".bar")
        .selectAll("div")
        .data(data)
        .enter().append("div")
        .style("width", function (d) {
            return x(d) + "px";
        })
        .style("background-color", function(d,i){
            return colors[i];
        })
        .text(function (d,i) {
            return "Severity"+ "["+severity[i]+"]"+(d*100/sum).toFixed(1)+"%";
        });



}

// set pie chart with google charts
function setPie(arr) {
    google.charts.load('current', {'packages':['corechart']});
    var data = google.visualization.arrayToDataTable(arr);

    var options = {
        title: 'Percentage of incidents',
        is3D: true,
        backgroundColor: "dimgrey",
    };
    var chart = new google.visualization.PieChart(document.getElementById('pieForType'));
    chart.draw(data, options);
    console.log("set");
}

// can't clear current canvas
function setPiej3(data) {
    var canvas = document.querySelector("canvas"),
        context = canvas.getContext("2d");

    var width = canvas.width,
        height = canvas.height,
        radius = Math.min(width, height) / 2;

    var colors = ['#00a6ff', '#bbec26', '#ffe12f', '#ff9511', '#ff0302', '#797A7A'];

    var arc = d3.arc()
        .outerRadius(radius - 10)
        .innerRadius(0)
        .context(context);

    var pie = d3.pie();

    var arcs = pie(data);

    var sum = 0;
    for (var i=0; i<data.length; i++) {
        sum = sum+data[i];
    }

    context.translate(width / 2, height / 2);
    context.globalAlpha = 1;
    arcs.forEach(function(d, i) {
        context.beginPath();
        arc(d);
        context.fillStyle = colors[i];
        context.fill();
    });

    // draw arcs
    context.beginPath();
    arcs.forEach(arc);
    context.strokeStyle = "#c2d6d9";
    context.stroke();

    // draw text
    context.textAlign = "center";
    // context.textBaseline = "middle";
    context.fillStyle = "#000";
    arcs.forEach(function(d,i) {
        var c = arc.centroid(d);
        context.fillText((data[i]*100/sum).toFixed(1)+"%", c[0], c[1]);
    });
}
