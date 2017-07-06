/**
 * Created by Jessie on 6/27/17.
 * Script for setting markers, heat maps, info windows for Json data
 */
var map;
var centerNash = {lat: 36.1627, lng: -86.7816};
function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 11,
        center: centerNash,
        mapTypeId: 'roadmap'
    });

    // Create the DIV to hold the control and call the CenterControl()
    // constructor passing in this DIV.
    var centerControlDiv = document.createElement('div');
    var centerControl = new CenterControl(centerControlDiv, map);

    centerControlDiv.index = 1;
    map.controls[google.maps.ControlPosition.TOP_CENTER].push(centerControlDiv);

}

function getData() {
    var mongo_Address = document.getElementById('mongoDB').value;
    var chart_Option = document.getElementById('chartList').value;
    var start_Date = document.getElementById('date1').value;
    var start_Hour = document.getElementById('hour1').value;
    var end_Date = document.getElementById('date2').value;
    var end_Hour = document.getElementById('hour2').value;
    console.log(start_Date);

    if (start_Date==="") {
        alert("Date must be filled!!!");
    } else {
        console.log(start_Date);
        formulateDate(start_Date, end_Date, start_Hour, end_Hour);

    }

}

function formulateDate(date1, date2, hour1, hour2) {
    var start_year = date1.substring(0,4);
    var start_month = date1.substring(5,7);
    var start_day = date1.substring(8,10);
    var end_year = date2.substring(0,4);
    var end_month = date2.substring(5,7);
    var end_day = date2.substring(8,10);
    var start_hour = hour1;
    var end_hour = hour2;
    if  (start_hour === "") {
        start_hour = 0;
    }
    if (end_hour === "") {
        end_hour = 24;
    }

    var startDate = new Date();
    startDate.setFullYear(Number(start_year), Number(start_month)-1, Number(start_day));
    startDate.setHours(Number(start_hour),0,0,0);
    console.log("start date: "+startDate);

    var endDate = new Date();
    endDate.setFullYear(Number(end_year), Number(end_month)-1, Number(end_day));
    endDate.setHours(Number(end_hour),0,0,0);
    console.log("end date: "+ endDate);


    setMarkers(startDate, endDate);
}

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

// turn json file to js
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

// set markers
var heatData = [];
var markers = [];
function setMarkers(startDate, endDate) {
    // remove markers from the map, but still keeps them in the array
    for (var i = 0; i < markers.length; i++) {
        markers[i].setMap(null);
    }
    // delete all by removing reference to them,
    // so that when user hit "submit" again, previous markers are gone
    markers = [];
    heatData.length = 0;

    var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October",
        "November", "December"];
    var r = json.incidents;
    // console.log(Object.keys(r[0]));


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
            heatData.push(latLng);
            var content = '<b>Incident Number: </b>' + r[i].incidentNumber +
                '</br><b>Alarm Date: </b>' + r[i].alarmDate +
                '</br><b>Location: </b>' + r[i].streetNumber + " " + r[i].streetPrefix + " "
                + r[i].streetName + " " + r[i].streetSuffix + " " + r[i].streetType + ", "
                + r[i].city + ", " + r[i].county + ", " + r[i].state + " " + Math.round(r[i].zipCode) +
                '</br><b>Severity: </b>' + r[i].severity +
                '</br><b>Closest Station: </b>' + r[i].closestStation +
                '</br>Object Id: ' + r[i]._id;

            var severity = "EDCBA";
            var marker;
            var colors = ['#00a6ff', '#bbec26', '#ffe12f', '#ff9511', '#ff0302'];
            content = content.replace(/nan/g, "");
            var indexDCBA = severity.indexOf(r[i].severity);
            if (indexDCBA > -1) {
                marker = new google.maps.Marker({
                    position: latLng,
                    map: map,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        fillColor: colors[indexDCBA],
                        fillOpacity: .9, // number between 0.0 and 1.0, 1.0 means not opaque at all
                        // scale: Math.pow(1.3, indexDCBA+2)+2,
                        scale: 5,
                        strokeColor: 'black',
                        strokeWeight: .1
                    },
                    contentString: content
                });
            } else {
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
            markers.push(marker);
        }
    }
        // after markers got displayed, change button to hide markers
        // // document.getElementById('markers').innerHTML = 'Hide Markers';
        // document.getElementById('markers').onclick = function () {
        //
        // }
}

// set info windows
var infowindow;
function setInfoWindow(marker) {
    infowindow = new google.maps.InfoWindow();
    marker.addListener('click', function() {
        infowindow.close(map,this); // close previous window first
        infowindow.setContent(this.contentString);
        infowindow.open(map, this);
    });
}

// toggle markers by changing their visibility
function toggleMarkers() {
    for (var i in markers) {
        if (markers[i].getVisible()) {
            markers[i].setVisible(false);
            document.getElementById('markers').innerHTML = 'Show Markers';
        } else {
            markers[i].setVisible(true);
            document.getElementById('markers').innerHTML = 'Hide Markers';
        }
    }
}

// generate heat mao layer, after which change button
var heatmap;
function setHeatMap() {
    heatmap= new google.maps.visualization.HeatmapLayer({
        data: heatData,
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

// When the user clicks on div, open the popup
function help() {
    var popup = document.getElementById("pop");
    popup.classList.toggle("show");
}


