/**
 * Created by Jessie on 6/27/17.
 * Script for setting markers, heat maps, info windows for Json data
 */
var map;
var centerNash = {lat: 36.18, lng: -86.7816};
var minDate;
var maxDate;

// Create an initial map - plain, center at centerNash
function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 11,
        center: centerNash,
        mapTypeId: 'roadmap',
        scrollwheel: false,  // disable scroll wheel
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        fullscreenControlOptions: {
          position: google.maps.ControlPosition.LEFT_BOTTOM
        },
        styles: oldStyles
    });

    // Create the DIV to hold the control and call the CenterControl()
    // constructor passing in this DIV.
    var centerControlDiv = document.createElement('div');
    var centerControl = new CenterControl(centerControlDiv, map);
    centerControlDiv.index = 1;
    map.controls[google.maps.ControlPosition.TOP_CENTER].push(centerControlDiv);

    // Create the DIV to hold the control and call the TopRightControl()
    // constructor passing in this DIV.
    var topControlDiv = document.createElement('div');
    var topControl = new TopRightControl(topControlDiv, map, "Add a depot");
    topControlDiv.index = 2;
    topControlDiv.id = "addDepot";
    topControlDiv.style.display = "none";
    map.controls[google.maps.ControlPosition.RIGHT_TOP].push(topControlDiv);

    // Create the DIV to hold the control and call the TopRightControl()
    // constructor passing in this DIV.
    var topControlDiv2 = document.createElement('div');
    var topControl2 = new TopRightControl(topControlDiv2, map, "Clear my depots");
    topControlDiv2.index = 1;
    topControlDiv2.id = "clearDepot";
    topControlDiv2.style.display = "none";
    map.controls[google.maps.ControlPosition.RIGHT_TOP].push(topControlDiv2);

    // Create the DIV to hold the control and call the TopRightControl()
    // constructor passing in this DIV.
    var topControlDiv4 = document.createElement('div');
    var topControl4 = new TopRightControl(topControlDiv4, map, "Show/hide real depots");
    topControlDiv4.index = 1;
    topControlDiv4.id = "realDepot";
    topControlDiv4.style.display = "none";
    map.controls[google.maps.ControlPosition.LEFT_TOP].push(topControlDiv4);

    var today = new Date();
    document.getElementById('timeNow').innerHTML=today.toLocaleDateString() + "  " + today.toLocaleTimeString();
    
}

function setInnerHTML(id, msg) {
    if (msg === 'time') {
        var today = new Date();
        document.getElementById(id).innerHTML=today.toLocaleDateString() + "  " + today.toLocaleTimeString();
    }
}

/* generate a data slider that follows the date input box;
 * input box also follows the handle on slider */
function createSlider() {
    var start_Date = document.getElementById('date1'),
        start_Hour = document.getElementById('hour1'),
        end_Date = document.getElementById('date2'),
        end_Hour = document.getElementById('hour2');

    var start = start_Date.value + 'T' + start_Hour.value + ":00.00",
        end = end_Date.value + "T" + end_Hour.value + ":00.00";

    // slider object with double handles
    var dateSlider = document.getElementById('slider');
    noUiSlider.create(dateSlider, {
        // Create two timestamps to define a range.
        range: {
            min: minDate * 1000,
            max: maxDate * 1000
        },
        connect: true,
        behaviour: 'tap-drag',
        // // Max interval: 30 days
        // limit: 30 * 24 * 60 * 60 * 1000,
        // Steps of one day
        step: 24 * 60 * 60 * 1000,
        // Two more timestamps indicate the handle starting positions.
        start: [timestamp(start), timestamp(end)]
    });
    
    // change connect color between two handles according to date interval length
    var connect = dateSlider.querySelector('.noUi-connect');
    var button = document.getElementById('submitDates');
    dateSlider.noUiSlider.on('update', function(values) {
        if ((values[1]-values[0])>14 * 24 * 60 * 60 * 1000) {   // 14 days
            connect.style.background = "goldenrod";
            button.style.backgroundColor = "goldenrod"
        } else {
            connect.style.background = "aquamarine";
            button.style.backgroundColor = "aquamarine";
        }
    });

    // input tables change along with handle
    var inputs = [start_Date, end_Date];
    dateSlider.noUiSlider.on('update', function(values, handle) {
        var date = new Date(+values[handle]);
        inputs[handle].value = formulateDate(date);
    });

    var dateValues = document.getElementById('event');
    dateSlider.noUiSlider.on('update', function(values) {
        dateValues.innerHTML = formatDate(new Date(+values[0]))+ document.getElementById('hour1').value + " ~ " 
                                + formatDate(new Date(+values[1])) + document.getElementById('hour2').value;
    });

    // handle changes along input tables
    var tmp;
    start_Date.addEventListener('change', function(){
        tmp = new Date(this.value);
        setTimeout(function(){  // wait till user enters all fields and then update slider
            dateSlider.noUiSlider.set([tmp.getTime(), null]); }, 1000);
        
    });
    end_Date.addEventListener('change', function(){
        tmp = new Date(this.value);
        setTimeout(function(){    
            dateSlider.noUiSlider.set([null, tmp.getTime()]); }, 1000);
    });
}

// formulate date into YYYY-MM-DD format
function formulateDate(date) {
    return date.getFullYear()+"-"+ 
        addZero((date.getMonth()+1).toString())+ (date.getMonth()+1) +"-"+
        addZero((date.getDate()).toString())+date.getDate();
}

// if day or month is only one digit, add zero in front
function addZero(m) {
    if (m.length===1) {
        return "0";
    } else {
        return "";
    }
}

// return new date object given string
function timestamp(str){
    return new Date(str).getTime();
}


// Append a suffix to dates.
// Example: 23 => 23rd, 1 => 1st.
function nth (d) {
    if(d>3 && d<21) return 'th';
    switch (d % 10) {
        case 1:  return "st";
        case 2:  return "nd";
        case 3:  return "rd";
        default: return "th";
    }
}

// format date into "Weekday, YYYY/MM/DDth  00:00"
function formatDate (date) {
    return weekdays[date.getDay()] + ", " +date.getFullYear() + "/"
    + (date.getMonth()+1)+"/"+date.getDate() + nth(date.getDate())+"  ";
}

// create socket connect
var socket = io.connect('http://' + document.domain + ':' + location.port);

// on success, log success
socket.on('success', function() {
    console.log("socketio success");
});


/* ALL
 * MAJOR
 * GLOBAL
 * VARIABLES
 * ARE HERE!!
 */
var markers = [],  // an array of all markers objects
    markersArr = [], // an array of markers according to types of incidents
    heatDataAll = [],
    heatDataFire = [],
    heatDataCrime = [];
var sumOfIncidents = [];

function getResponders(){
    alert("Trying to get responder data");
    socket.emit('get_responders');
}

function logIncident(){
    var gridNum = document.getElementById('gridNum').value;
    if (gridNum===""){
        alert("Date must be filled!!!");
    } else {
        socket.emit('log_incident', {
            'grid' : gridNum
        });
        // console.log("gridNum"); 
        // console.log(gridNum);    
    }
}

socket.on('gotNewMinMaxTime', function(msg) {
    // console.log(msg);
    minDate = msg[0];
    maxDate = msg[1];
    createSlider();
});

socket.on('emergency', function(msg) {
    console.log("--> button is clicked: grid number: " + msg[0]);
    var contentString = "Emergency happened at:" + msg[0];
    var image = {
        url: 'https://financialtribune.com/sites/default/files/field/image/17january/12_ambulances.png',
        scaledSize: new google.maps.Size(26, 26)
    };
    var latLng = new google.maps.LatLng(msg[1][1], msg[1][0]),
        marker1 = new google.maps.Marker(createMarkerObj(latLng,map,image,contentString));
    marker1.setAnimation(google.maps.Animation.BOUNCE);
    marker1.addListener('click', function() {
        if (marker1.getAnimation() !== null) {
            marker1.setAnimation(null);
        }
    });

    var imageNorm = {
        url: 'https://icon-icons.com/icons2/803/PNG/512/Ambulance_Emergency_icon-icons.com_65908.png',
        scaledSize: new google.maps.Size(25, 25)
    };
    var imageBlack = {
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Ambulance_font_awesome.svg/2000px-Ambulance_font_awesome.svg.png',
        scaledSize: new google.maps.Size(25, 25)
    };
    for (var i=0; i<msg[2].length; i++) {
        var latLng = new google.maps.LatLng(msg[2][i][4][1], msg[2][i][4][0]);
        if (msg[2][i][1] == msg[3]) {
            var marker = new google.maps.Marker(createMarkerObj(latLng,map,imageBlack,contentString));  
        } else {
            var marker = new google.maps.Marker(createMarkerObj(latLng,map,imageNorm,contentString)); 
        }

    }

});

socket.on('responderData', function(msg) {
    // console.log(msg[0]);
    var contentString = "i am a responder";
    var image = {
        url: 'http://policyadvantage.com/wp-content/uploads/2016/05/ER-5.png',
        scaledSize: new google.maps.Size(25, 25)
    };
    for (var i=0; i<msg.length; i++) {
        var latLng = new google.maps.LatLng(msg[i][4][1], msg[i][4][0]),
            marker = new google.maps.Marker(createMarkerObj(latLng,map,image,contentString));
    }
});


/* ON SUBMIT button: 
 * get data from left menu bar, 
 * calls to formulate data correctly 
 * socket emit start and end date to retrieve data*/
var types = [];  // types of markers already on map
var visited = false;
function getData() {
    prepMarkers();
    // remove real depots from the map, but still keeps them in the array
    for (var c = 0; c < markersRealDepots.length; c++) {
        markersRealDepots[c].setMap(null);
    }
    markersRealDepots = [];

    types.length = 0;
    types = [];
    document.getElementById("loader").style.display = "block";
    if (!visited) {
        for (var i=0; i<3; i++) {
            document.getElementsByClassName("loadingMsg")[i].innerHTML = "Generating canvas...";
            document.getElementsByClassName("loading")[i].style.color = "darkgrey";
        }
        visited = true;
    } else {
        for (var i=0; i<3; i++) {
            document.getElementsByClassName("loading")[i].style.display = "block";
        }
    }
    
    var start_Date = document.getElementById('date1').value,
        start_Hour = document.getElementById('hour1').value,
        end_Date = document.getElementById('date2').value,
        end_Hour = document.getElementById('hour2').value;

    if (start_Hour === "") {
        start_Hour = "8:00";
    }
    if (end_Hour === "") {
        end_Hour = "23:00";
    }

    if (start_Date==="" || end_Date==="") {
        alert("Date must be filled!!!");
    } else {
        socket.emit('get_date', {
            'start': start_Date+" "+start_Hour.toString(), 
            'end': end_Date + " "+ end_Hour.toString()
        });
    }
}

/*
 * reset markers, heatmap, everytime user hits "submit" or "toggle modes"
 */
function prepMarkers() {
    document.getElementById('initialHint').style.display = 'none';
    document.getElementById('markers').innerHTML = 'Hide Incidents';
    setButtonDisplay("hidden");
    document.getElementById("gradient").style.visibility = "hidden";
    // remove incidents from the map, but still keeps them in the array
    for (var i = 0; i < markers.length; i++) {
        markers[i].setMap(null);
    }
    // remove vehicles from the map, but still keeps them in the array
    for (var k = 0; k < vehiclesArr.length; k++) {
        vehiclesArr[k].setMap(null);
    }

    // remove BestAssign depots from the map, but still keeps them in the array
    for (var o = 0; o < markerBestAssign.length; o++) {
        markerBestAssign[o].setMap(null);
    }

    // remove BestAssign depots in charge of rectangles from the map, but still keeps them in the array
    for (var j = 0; j < rectBestAssign.length; j++) {
        rectBestAssign[j].setMap(null);
    }

    if (heatmap) {
        heatmap.setMap(null);
    }

    if (heatmapPredict) {
        heatmapPredict.setMap(null);
    }

    if (document.getElementById("selectType") !== null) {
        var t = document.getElementById("selectType");
        t.parentNode.removeChild(t);
        document.getElementById('submitButton').style.display = 'none';
    }

    // delete all by removing reference to them,
    // so that when user hit "submit" again, previous markers are gone
    markers = [];
    markers.length = 0;
    heatDataAll = [];
    heatDataAll.length = 0;
    heatDataFire = [];
    heatDataFire.length = 0;
    heatDataCrime = [];
    heatDataCrime.length = 0;
    markersArr = [];
    markersArr.length = 0;
    vehiclesArr = [];
    vehiclesArr.length = 0;

    markerBestAssign = [];
    rectBestAssign = [];

    sumOfIncidents.length=0;
    sumOfIncidents = [0,0,0,0,0,0,0];  // sum of incidents happened at each level of severity

    // console.log("vehiclesArr length:   "+ vehiclesArr.length+ "\n   "+vehiclesArr); 
    // console.log("markersArr length:   "+ markersArr.length+ "\n   "+markersArr);   
    // console.log("heatDataAll length:   "+ heatDataAll.length+ "\n   "+heatDataAll);   
}


/* create floating button for map, on click can center map */
function CenterControl(controlDiv, map) {
    // Set CSS for the control border.
    var controlUI = document.createElement('div');
    controlUI.style.backgroundColor = 'white';
    controlUI.style.border = '0.2px solid #BEBEBE';
    controlUI.style.borderRadius = '3px';
    controlUI.style.boxShadow = '0 3px 3px rgba(0,0,0,.3)';
    controlUI.style.cursor = 'pointer';
    controlUI.style.marginBottom = '12px';
    controlUI.style.marginTop = "38px";
    controlUI.title = 'Click to recenter the map';
    controlDiv.appendChild(controlUI);

    // Set CSS for the control interior.
    var controlText = document.createElement('div');
    controlText.style.color = 'rgb(25,25,25)';
    controlText.style.fontFamily = 'Roboto,Arial,sans-serif';
    controlText.style.fontSize = '11px';
    controlText.style.lineHeight = '18px';
    controlText.style.paddingLeft = '5px';
    controlText.style.paddingRight = '5px';
    controlText.innerHTML = 'Center Map';
    controlUI.appendChild(controlText);

    // Setup the click event listeners: simply set the map to Nashville.
    controlUI.addEventListener(
        'click',
        function() {
            map.setCenter(centerNash);
            map.setZoom(11);
        }
    );
}

function TopRightControl(controlDiv, map, msg) {
    // Set CSS for the control border.
    var controlUI = document.createElement('div');
    controlUI.style.backgroundColor = '#A1A5E7';
    controlUI.style.border = '1px solid #BEBEBE';
    controlUI.style.borderRadius = '1px';
    controlUI.style.boxShadow = '0 3px 3px rgba(0,0,0,.3)';
    controlUI.style.cursor = 'pointer';
    controlUI.style.marginRight = "28px";
    controlUI.style.marginTop = "38px";
    controlDiv.appendChild(controlUI);

    // Set CSS for the control interior.
    var controlText = document.createElement('div');
    controlText.style.color = 'rgb(25,25,25)';
    controlText.style.fontFamily = 'Roboto,Arial,sans-serif';
    controlText.style.fontSize = '11px';
    controlText.style.lineHeight = '18px';
    controlText.style.paddingLeft = '5px';
    controlText.style.paddingRight = '5px';
    controlText.innerHTML = msg;
    controlUI.appendChild(controlText);

    // Setup the click event listeners: simply set the map to Nashville.
    if (msg === "Add a depot") {
        controlUI.addEventListener(
            'click', addDepot
        ); 
    } else if (msg === "Clear my depots") {
        controlUI.addEventListener(
            'click', clearDepot
        );
    } else if (msg === "Show/hide real depots") {
        controlUI.addEventListener(
            'click', toggleRealDepot
        );
        controlUI.style.marginLeft = "58px";
    }


}

var markersRealDepots = [];

function toggleRealDepot() {
    try {
        if (markersRealDepots[0].getVisible()) {
            for (var i=0; i<markersRealDepots.length; i++) {
                markersRealDepots[i].setVisible(false);
            }
        } else {
            for (var k=0; k<markersRealDepots.length; k++) {
                markersRealDepots[k].setVisible(true);
            }
        }
    } catch (error) {
        console.log("!!!Caught: toggleRealDepot():" + error.message);
    }
    

}

var customDepots = [];
function addDepot() {
    var imgDepot = {
        url: 'https://cdn1.iconfinder.com/data/icons/orientation-2/32/location-add-512.png',
        scaledSize: new google.maps.Size(23, 23),
        anchor: new google.maps.Point(9, 9)
    };
    var marker = new google.maps.Marker({
      position: map.getCenter(),
      icon: imgDepot,
      draggable: true,
      map: map
    });
    // Add an event listener on the draggable marker.
    infoWindow = new google.maps.InfoWindow();
    marker.addListener('position_changed', 
        function(){
            var latLng = marker.getPosition();
            var contentString = '<b>Custom depot moved.</b><br>' +
            'New lat long is: ' + latLng.lat() + ', ' + latLng.lng();
            // Set the info window's content and position.
            infoWindow.setContent(contentString);
            infoWindow.setPosition(latLng);
            infoWindow.open(map);
        }
    );
    customDepots.push(marker);
}
function clearDepot() {
    for (var i=0; i<customDepots.length; i++) {
        customDepots[i].setMap(null);
    }
    customDepots = [];
}

socket.on('success', function() {
    console.log("socketio success");
});

socket.on('crime_none', function() {
    console.log("crime none")
});
/* socket to get crime data from server*/
var data_crime;
socket.on('crime_data', function(msg) {
    // console.log("--> crime data length is: " + msg.length);
    data_crime = msg;
    setCrime();
});

socket.on('crime_heat', function(msg) {
    // console.log("--> crime HEAT length is: " + msg.length);
    data_crime = msg;
    setCrimeHeat(data_crime);
});

function setButtonDisplay(str) {
    document.getElementById("markers").style.visibility = str;
    document.getElementById("heat").style.visibility = str;
    document.getElementById("vehide").style.visibility = str;
}

// set crime data
function setCrime() {
    arr = [];
    var r1 = data_crime;
    var image = {
        url: 'http://paybefore.com/wp-content/uploads/2016/09/burglar-icon-208x300.png',
        scaledSize: new google.maps.Size(14, 21)
    };
    for (var i = 0; i < r1.length; i++) {
        var contentString = "<h3>"+"&#x1F4B8;"+" "+meaningList["80"]+"</h3>"+
            "<b>Occured: </b>"+r1[i]["Incident Occurred"] +"</br>" +"<b>Reported: </b>" + 
            r1[i]["Incident Reported"] + "</br><b>Incident Type: </b>" + r1[i]["NIB_CODE_DESC"] + 
            "</br>Incident Number: " + r1[i]["Incident number"];
        
        var latLng = new google.maps.LatLng(r1[i].LATITUDE, r1[i].LONGITUDE),
            marker = new google.maps.Marker(createMarkerObj(latLng,map,image,contentString));

        heatDataAll.push(latLng);
        heatDataCrime.push(latLng);
        setInfoWindow(marker);
        arr.push(marker);
        markers.push(marker);
        
    }
    // if there is at least one marker for burglary 
    if (arr.length !== 0) {
        markersArr[80] = arr;
        markersArr.length++;
        types.push("80");
    }
    var policeCheckBox = document.getElementById("police");
    policeCheckBox.checked = true;
}

/* set a marker of "position" on "map" with "icon" and "content" */
function createMarkerObj(position, map, icon, content) {
    var obj = {};
    obj["position"] =  position;
    obj["map"] = map;
    obj["icon"] = icon;
    obj["contentString"] = content;
    return obj;
}

/* socket to get incident_data from server */
var data_incident;
socket.on('incident_data', function(msg) {
    data_incident = msg;
    /* emdCardNumber is a digit that has length [3,5], the letter in between is the 
     * response determinant, a.k.a, the level of severity; or it has the value of 
     * "ctran" or "dupont"*/
    // alert('Data Received');
    
    var emdCardNumber = data_incident.emdCardNumber;
    var protocol;
    var u=0;
    if (! ("0123456789".includes(emdCardNumber.charAt(0)))) {
        protocol = emdCardNumber;
        u = protocol.length;
    } else {
        while (u<emdCardNumber.length && severity.indexOf(emdCardNumber.charAt(u))<0) {
            u++
        }
        protocol = emdCardNumber.substring(0,u);
    }
    if (! (protocol in markersArr)) {
        markersArr[""+protocol] = [];
        // markersArr.length++;
        types.push(protocol);
    }
    setIncident(data_incident, u)

});

/* set traffic incidents markers*/
var vehiclesArr = [];
function setIncident(r, index) {
    var emojiPicked = false;
    var r_severity = (r.emdCardNumber).charAt(index);
    if (severity.indexOf(r_severity) >= 0) {
        sumOfIncidents[severity.indexOf(r_severity)]++;
    } else {
        sumOfIncidents[severity.length]++;
    }

    var protocol = (r.emdCardNumber).substring(0,index);

    var img = {
            scaledSize: new google.maps.Size(19, 19),
            anchor: new google.maps.Point(9, 9)
        };
    var emojis = ["&#x1F494;", "&#x1F691;", "&#x1F6A6;", "&#x1F525;", "&#x1F50E;"]
    var emoji;   

    for (var i = 0; i < strFireDpmt.length; i++) {
        if (strFireDpmt[i].includes(protocol)) {
            img.url = imgURLFireDpmt[i];
            emoji = emojis[i];
            emojiPicked = true;
            break;
        }
    } 
    if (!emojiPicked) {
        img.url = imgURLFireDpmt[4];
        emoji = emojis[4];
    }

    var latLng = new google.maps.LatLng(r._lat, r._lng);
    heatDataAll.push(latLng);
    heatDataFire.push(latLng);
    var content = "<h3>"+emoji+" "+meaningList[protocol]+"</h3>"+
        '<b>Incident Number: </b>' + r.incidentNumber +
        '</br><b>Alarm Date: </b>' + r.alarmDate +
        '</br><b>Location: </b>' + r.streetNumber + " " + r.streetPrefix + " "
            + r.streetName + " " + r.streetSuffix + " " + r.streetType + ", "
            + r.city + ", " + r.county + ", TN " + r.zipCode + 
        '</br><b>EMD Card Number: </b>' + r.emdCardNumber +
        '</br><b>Fire Zone: </b>' + r.fireZone +
        '</br><b>Responding Vehicles: </b>' + r.allIDs
        '</br>Object Id: ' + r._id
    content = content.replace(/na/g, "");

    var marker = new google.maps.Marker(createMarkerObj(latLng,map,img,content));
    setInfoWindow(marker);
    markers.push(marker);
    markersArr[""+protocol].push(marker);

    if (r.respondingVehicles == "na") {
        return;
    }
    var image = {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: 'white',
        fillOpacity: .3,
        scale: 6,
        strokeColor: 'brown',
        strokeWeight: .5
    };

    for (var num=0; num<(r.respondingVehicles).length; num++) {
        var contentVehicle = "&#x1F692;<b>id: </b>"+
            "<b>Apparatus ID: </b>" + (r.respondingVehicles)[num].apparatusID + 
            "</br>"+"<b>Dispatch Time</b>"+ (r.respondingVehicles)[num].dispatchDateTime +
            "</br>"+"<b>Arrival Time</b>"+ (r.respondingVehicles)[num].arrivalDateTime +
            "</br>"+"<b>Clear Time</b>"+ (r.respondingVehicles)[num].clearDateTime
        contentVehicle = contentVehicle.replace(/na/g, "Unknown");

        var markerVehicle = new google.maps.Marker({
                position: latLng,
                map: map,
                icon: image,
                label: {
                    color: "brown",
                    fontSize: "5px",
                    text: (r.respondingVehicles)[num].apparatusID
                },
                contentString: contentVehicle
            });

        setInfoWindow(markerVehicle);
        vehiclesArr.push(markerVehicle); 
    }

}

/* socket to get depots location from server*/
socket.on('depots_data', function(msg) {
    arr_depots = msg.depotLocation;
    arr_vehicles = msg.depotInterior;

    var imgDepot = {
        url: 'https://hydra-media.cursecdn.com/simcity.gamepedia.com/1/13/Fire_station_garage.png?version=e2d13f3d48d4d276f64d0cb8c04adbee',
        scaledSize: new google.maps.Size(23, 23)
    };
    for (var i=0; i<arr_depots.length; i++) {
        var content = "<p><b>&#x1F6F1; Vehicles from this depot are: </b></p>";
        for (var j=0; j<(arr_vehicles[i]).length; j++) {
            content += (arr_vehicles[i])[j];
            content += ", ";
        }
        var latLng = new google.maps.LatLng((arr_depots[i])[0], (arr_depots[i])[1]),
            marker = new google.maps.Marker(createMarkerObj(latLng,map,imgDepot,content));
        setInfoWindow(marker);
        markersRealDepots.push(marker);
    }

    // console.log("depots_data length"+":  "+arr_depots.length);
});


/* set info windows and make markers bounce 3 times*/
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

/* socket after markers are drawn on map: set up pie charts*/
socket.on('markers-success', function() {
    setButtonDisplay("visible");
    // var o = document.getElementsByClassName("icon-bar");
    // o[0].style.visibility = 'visible';
    // console.log("-->All markers success");
    // console.log("--->types[]: ");
    // console.log(types);
    // console.log("markersArr length:   "+ markersArr.length);   
    // console.log("heatDataAll length:   "+ heatDataAll.length);  
    // console.log("vehiclesArr length:   "+ vehiclesArr.length);  
    // console.log(markersArr); // should look like [Incidents: Array(x), Burglary: Array(y)]
    
    setBar(sumOfIncidents);
    var arr = [['Types', 'Number']];
    for (var j=0; j<types.length; j++) {
        var a = [];
        a.push(meaningList[types[j]]);    
        a.push(markersArr[types[j]].length);
        arr.push(a);
    }
    // console.log(arr);
    // set up pie chart
    google.charts.load('current', {packages: ['corechart']});
    google.charts.setOnLoadCallback(function() {
        setPie(arr);
    });
    printSummary();
});

/* heat data of incidents successfully pushed to heatdataAll*/
socket.on('heat-success', function() {
    // document.getElementById("heat").style.visibility = 'visible';
    document.getElementById("gradient").style.visibility = 'visible';
    // console.log("-->All heat pushed success");
    // console.log("heatDataAll:   "+heatDataAll.length);
    
    heatmap= new google.maps.visualization.HeatmapLayer({
        data: heatDataAll,
        dissipating: false,
        map: map,
        radius: 0.01
    });
    setBar(sumOfIncidents);

    var arr = [['Types', 'Number']];
    for (var j=0; j<types.length; j++) {
        var a = [];
        a.push(meaningList[types[j]]);    
        a.push(markersArr[types[j]]);
        arr.push(a);
    }
    // console.log(arr);
    // set up pie chart
    google.charts.load('current', {packages: ['corechart']});
    google.charts.setOnLoadCallback(function() {
        setPie(arr);
    });

    document.getElementById("loader").style.display = "none";
    document.getElementById('total').innerHTML = "Total incidents: "+ (heatDataAll.length);
    for (var i=0; i<3; i++) {
        document.getElementsByClassName("loading")[i].style.display= "none";
    }

});


/* print a summary of total of incidents,
 * generate checkbox for each type of incidents
 */
function printSummary() {
    document.getElementById('total').innerHTML = "Total incidents: "+ (heatDataAll.length);
    document.getElementById('chooseType').innerHTML = "Choose type by brushing or pressing '&#8984;' or ctrl";
    document.getElementById("loader").style.display = "none";
    document.getElementsByClassName("loading")[0].style.display= "none";

    var w = document.getElementById("mySideMenu");
    if(w.style.width !== "300px") {
        w.style.width = "300px";
    }

    // var fireCheckBox = document.getElementById("fire");
    // fireCheckBox.checked = true;

    if (document.getElementById("selectType") !== null) {
        var t = document.getElementById("selectType");
        t.parentNode.removeChild(t);
    }

    var div = document.getElementById("mySideMenu");
    var selectList = document.createElement("select");
    selectList.id = "selectType";
    selectList.multiple = "multiple";
    selectList.style.marginLeft = '40px';
    selectList.style.borderRadius = '4px';
    selectList.style.height = "220px";
    selectList.style.overflowY = "scroll";
    div.appendChild(selectList);

    // create 5 main groups under the select list
    var groups = ["Cardiac", "Trauma", "MVA", "Fire", "Other"];
    var optionGroups = [];
    for (var i = 0; i < groups.length; i++) {
        var optionGroup = document.createElement("optGroup");
        optionGroup.label = groups[i];
        selectList.appendChild(optionGroup);
        optionGroups.push(optionGroup);
    }

    // put all types into their respective main option group
    for (var i=0; i<types.length; i++) {
        var appended = false;
        var option = document.createElement("option");
        option.id = types[i];
        option.text = meaningList[types[i]];
        option.selected = true;

        if (strFireDpmt[0].includes(types[i])) {
            optionGroups[0].appendChild(option);
        } else if (strFireDpmt[1].includes(types[i])) {
            optionGroups[1].appendChild(option);
        } else if (strFireDpmt[2].includes(types[i])) {
            optionGroups[2].appendChild(option);
        } else if (strFireDpmt[3].includes(types[i])) {
            optionGroups[3].appendChild(option);
        } else {
            optionGroups[4].appendChild(option);
        } 
    }

    // generate submit button
    if (document.getElementById("submitButton") === null) {
        var submit = document.createElement("button");
        submit.innerHTML = "Only see these types of incidents";
        submit.id = "submitButton";
        submit.style.borderRadius = "3px";
        submit.style.border = "0.2px solid black";
        submit.style.backgroundColor = "floralwhite";
        submit.onclick = getType;
        submit.style.marginTop = '10px';
        submit.style.marginLeft = '40px';
        div.appendChild(submit);
    } else {
        document.getElementById('submitButton').style.display = 'block';
    }
    document.getElementsByClassName("loading")[0].style.display= "none";

}

/* Hide or Show markers according to user check box */
function getType() {
    for (var i=0; i<types.length; i++) {
        var arr = markersArr[types[i]];
        if (document.getElementById(types[i]).selected === true) {
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
    document.getElementById('markers').innerHTML = 'Hide Incidents';
}

function toggleMarkers() {
    document.getElementById('markers').innerHTML = 
        (document.getElementById('markers').innerHTML=='Hide Incidents'? 'Show Incidents': 'Hide Incidents');
    var arrOfArr = markersArr;
    // console.log(markersArr);
    var flagYes = false;
    for (var j = 0; j < types.length; j++) {
        if (document.getElementById(types[j]).selected === true) {
            var arr = arrOfArr[types[j]];
            if (arr[0].getVisible()) {
                for (var i = 0; i < arr.length; i++) {
                   arr[i].setVisible(false); 
                }
            } else {
                for (var i = 0; i < arr.length; i++) {
                   arr[i].setVisible(true); 
                }
            }
        }
    }
}

/* hide/show vehicles icons */ 
function hideVehicles() {
    var arr = vehiclesArr;
    for (var i=0; i<arr.length; i++) {
        if (arr[i].getVisible()) {
            arr[i].setVisible(false);
            document.getElementById('vehide').innerHTML = 'Show Vehicles';
        } else {
            arr[i].setVisible(true);
            document.getElementById('vehide').innerHTML = 'Hide Vehicles';
        }   
    }

}

/* get heat data of incidents from socket*/
socket.on('latlngarrofobj', function(msg) {
    // var o = document.getElementsByClassName("icon-bar");
    // o[0].style.visibility = 'hidden';

    for (var i=0; i<msg.length; i++) {
        var latLng = new google.maps.LatLng((msg[i]).lat, (msg[i]).lng);
        heatDataAll.push(latLng);
        var emdCardNumber = (msg[i]).emdCardNumber;
        var protocol;
        var u=0;
        if (! ("0123456789".includes(emdCardNumber.charAt(0)))) {
            protocol = emdCardNumber;
            u = protocol.length;
        } else {
            while (u<emdCardNumber.length && severity.indexOf(emdCardNumber.charAt(u))<0) {
                u++
            }
            protocol = emdCardNumber.substring(0,u);
        }
        if (! (protocol in markersArr)) {
            markersArr[""+protocol] = 0;
            types.push(protocol);
        }
        var r_severity = (emdCardNumber).charAt(u);
        if (severity.indexOf(r_severity) >= 0) {
            sumOfIncidents[severity.indexOf(r_severity)]++;
        } else {
            sumOfIncidents[severity.length]++;
        }
        markersArr[""+protocol]++;
    }

});

// generate heat map layer, after which change button
var heatmap;
function setHeatMap() {
    // clear old heatmap first
    if (heatmap) {
        heatmap.setMap(null);
    }
    var dataNow = [];
    dataNow.length = 0;
    for (var i=0; i<markers.length; i++) {
        if (markers[i].getVisible()) {
            dataNow.push(markers[i].getPosition());
        }
    }
    // console.log("--------> dataNow length is: "+dataNow.length);
    // console.log(dataNow);
    heatmap= new google.maps.visualization.HeatmapLayer({
        data: dataNow,
        dissipating: false,
        map: map,
        radius: 0.01
    });
    document.getElementById("heatHide").style.visibility = "visible";
    document.getElementById("gradient").style.visibility = "visible";
}

// toggle heat map
function toggleHeatmap() {
    heatmap.setMap(heatmap.getMap() ? null : map);
    var gradient = document.getElementById("gradient");
    gradient.style.visibility = (heatmap.getMap() ? "visible" : "hidden");
}


// toggle gradient
function changeGradient() {
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
        .range([0, 400]);

    var severity = ["O","A","B","C","D","E","N.A"];
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
    console.log("-->Bar chart success");
    document.getElementsByClassName("loading")[1].style.display= "none";
}

/* set pie chart with google charts */
function setPie(arr) {
    google.charts.load('current', {'packages':['corechart']});
    var data = google.visualization.arrayToDataTable(arr);

    var options = {
        title: 'Percentage of incidents',
        is3D: true,
        backgroundColor: "transparent",
        sliceVisibilityThreshold: .015,
        legend: {
            position: 'right', 
            textStyle: {color: 'white', fontSize: 12}
        },
        titleTextStyle: {
            color: 'white'
        }
    };
    var chart = new google.visualization.PieChart(document.getElementById('pieForType'));
    chart.draw(data, options);
    console.log("-->pie chart success");
    document.getElementsByClassName("loading")[2].style.display= "none";
}


/* side nav bar 
 * "bar" to "x" function
 * show/hide side nav bar */
function barToX(x) {
    x.classList.toggle("change");
    var w = document.getElementById("mySideNav");
    if(w.style.width === "0px" || w.style.width ==="") {
        w.style.width = "350px";
    } else {
        w.style.width = "0px";
    }
}

/* side menu inside map 
 * on hit, show menu */
function showMenu() {
    var w = document.getElementById("mySideMenu");
    if(w.style.width === "300px") {
        w.style.width = "0px";
    } else {
        w.style.width = "300px";
    }
}

// enlarge Map on enlarge button
function enlargeMap() {
    var mapView = document.getElementById("mapView");
    var mapDiv = document.getElementById("map");
    var w = document.getElementById("mySideMenu");
    
    if (mapView.style.height === "700px") {
        mapView.style.height = "500px";
        mapDiv.style.height = "410px";
        w.style.height = "410px";
    } else {
        mapView.style.height = "700px";
        mapDiv.style.height = "610px";
        w.style.height = "610px";
    }
    google.maps.event.trigger(mapDiv, 'resize');
    map.setCenter(centerNash);
}

/* Change mode from Historical to Future Predictions
 * 1) change interface color
 * 2) change double slider to one
 * 3) create a single input date box*/
function changeMode(i) {
    prepMarkers(); // clear map first
    var a = document.getElementsByClassName("column");
    var c = document.getElementById("sliderDouble");
    var d = document.getElementById("initialMsgOnMap");
    var w = document.getElementById("mySideMenu");
    var showmenuBtn = document.getElementById("showmenu");
    // var o = document.getElementsByClassName("icon-bar");

    var ad = document.getElementById("addDepot");
    var cd = document.getElementById("clearDepot");
    var cr = document.getElementById("clockRetrain");
    var rd = document.getElementById("realDepot");

    var mode = document.getElementsByClassName("buttonChangeMode");
    var playground = document.getElementsByClassName("playground");
    var mapView = document.getElementById("mapView");
    var mapDiv = document.getElementById("map");

    if(w.style.width !== "0px") {
        w.style.width = "0px";
    }

    if (i === 1) { // predicion mode
        playground[0].style.width = "100%";
        playground[0].style.left = "-2%";
        playground[0].style.top = "30px";
        mapView.style.width = "inherit";
        mapView.style.height = "765px";
        mapDiv.style.height = "675px";
        google.maps.event.trigger(mapDiv, 'resize');
        map.setCenter(centerNash);
        showmenuBtn.style.display = "none";
        document.body.style.overflowY = "hidden";

        mode[0].style.backgroundColor = "white";
        mode[1].style.backgroundColor = "#83c985";
        mode[2].style.backgroundColor = "white";

        d.innerHTML = "Please Pick A Date In the FUTURE to see Predictions";
        d = document.getElementById("initialMsgOnMap1");
        d.innerHTML = "";

        document.body.style.backgroundColor = "rgba(0,0,0,0.88)";
        changeColor("#82D6FF");
        c.style.display = "none";
        document.getElementById("spaceExplore").style.display = "none";
        if (document.getElementById("sliderNew").innerHTML === "") {
            createSingleSlider();
        } else {
            document.getElementById("sliderNew").style.display = "block";
            document.getElementById("inputSingle").style.display = "block";
        }
        // o[0].style.display = "none";
        cr.style.display = "block";

        ad.style.display = "inline";
        cd.style.display = "inline";
        rd.style.display = "inline";

        ad.style.visibility = "visible";
        cd.style.visibility = "visible";
        rd.style.visibility = "visible";

        document.getElementById("heatHide").style.visibility = "hidden";
        document.getElementById("gradient").style.visibility = "hidden";
    
    } else if (i === 0){ // historic mode
        // map.setOptions({styles: oldStyles});
        playground[0].style.width = "90%";
        playground[0].style.left = "5%";
        playground[0].style.top = "80px";
        mapView.style.width = "1200px";
        mapView.style.height = "500px";
        mapDiv.style.height = "410px";
        google.maps.event.trigger(mapDiv, 'resize');
        map.setCenter(centerNash);
        showmenuBtn.style.display = "block";

        mode[0].style.backgroundColor = "#83c985";
        mode[1].style.backgroundColor = "white";
        mode[2].style.backgroundColor = "white";

        w.style.height = "410px";
        ad.style.display = "none";
        cd.style.display = "none";
        cr.style.display = "none";
        rd.style.display = "none";
        for (var j=0; j<3; j++) {
            a[j].style.borderColor = "#4f4f4f";
        }
        document.body.style.backgroundColor = "rgba(0,0,0,0.85)";
        document.body.style.overflowY = "scroll";
        changeColor("lime");
        c.style.display = "block";
        document.getElementById("sliderNew").style.display = "none";
        document.getElementById("inputSingle").style.display = "none";
        document.getElementById("spaceExplore").style.display = "none";
        // o[0].style.display = "block";

    } else { // explore mode
        playground[0].style.width = "100%";
        playground[0].style.left = "-2%";
        playground[0].style.top = "30px";
        mapView.style.width = "inherit";
        mapView.style.height = "765px";
        mapDiv.style.height = "675px";
        google.maps.event.trigger(mapDiv, 'resize');
        map.setCenter(centerNash);
        showmenuBtn.style.display = "none";
        c.style.display = "none";
        document.body.style.overflowY = "hidden";

        mode[0].style.backgroundColor = "white";
        mode[1].style.backgroundColor = "white";
        mode[2].style.backgroundColor = "#83c985";

        document.getElementById("inputSingle").style.display = "none";
        changeColor("#A1A5E7");
        // o[0].style.display = "none";
        cr.style.display = "block";

        ad.style.display = "inline";
        cd.style.display = "inline";
        rd.style.display = "inline";

        ad.style.visibility = "visible";
        cd.style.visibility = "visible";
        rd.style.visibility = "visible";

        var div = document.getElementById("spaceExplore");
        div.style.display = "block";
        div.innerHTML = "Best depot location has been updated: ";
        var butto = document.createElement("button");
            butto.className = "button";
            butto.id = "buttonOptimize";
            butto.style.backgroundColor = "#A1A5E7";
            butto.style.marginLeft = "5px";
            butto.style.fontFamily = "Zilla Slab";
            butto.style.fontSize = "14px";
            butto.innerHTML = "Optimize!";
            div.appendChild(butto);
            butto.addEventListener ("click", function() {
                socket.emit('getOptimization');
            });
        

        var butto1 = document.createElement("button");
            butto1.className = "button";
            butto1.id = "buttonCalculate";
            butto1.style.backgroundColor = "#A1A5E7";
            butto1.style.marginLeft = "5px";
            butto1.style.fontFamily = "Zilla Slab";
            butto1.style.fontSize = "14px";
            butto1.innerHTML = "Submit new depot location!";
            div.appendChild(butto1);
            butto1.addEventListener ("click", function() {
                alert("grids selected, recalculating response time now...");
                document.getElementById("loader").style.display = "block";
            });
        }

}

/* Change interface color*/
function changeColor(color) {
    a = document.getElementsByClassName("bar1");
    a[0].style.backgroundColor = color;
    a = document.getElementsByClassName("bar2");
    a[0].style.backgroundColor = color;
    a = document.getElementsByClassName("bar3");
    a[0].style.backgroundColor = color;
    a = document.getElementById("enlargeMap");
    a.style.color = color;
    a = document.getElementsByClassName("popup");
    a[0].style.color = color;
}

function hideFire() {
    var fireCheckBox = document.getElementById("fire");
    if (!fireCheckBox.checked) {
        for (var i=0; i<types.length; i++) {
            if (types[i] !== "80") {
                var arr = markersArr[types[i]];
                for (var j=0; j<arr.length; j++) {
                    if (arr[j].getVisible()) {
                        arr[j].setVisible(false);
                    }
                }
            }
        }
    } else {
        for (var j=0; j<types.length; j++) {
            if (types[j] !== "80") {
                var arr = markersArr[types[j]];
                for (var k=0; k<arr.length; k++) {
                    if (!arr[k].getVisible()) {
                        arr[k].setVisible(true);
                    }
                }
            }
        }
    }
    document.getElementById("heat").style.visibility = "visible";
    document.getElementById('markers').onclick = function () {
        getMarkersOnMap();
    }

}

function hidePolice() {
    var policeCheckBox = document.getElementById("police");
    if (!policeCheckBox.checked) {
        var arr = markersArr["80"];
        for (var j=0; j<arr.length; j++) {
            if (arr[j].getVisible()) {
                arr[j].setVisible(false);
            }
        }
    } else {
        var arr = markersArr["80"];
        for (var i=0; i<arr.length; i++) {
            if (!arr[i].getVisible()) {
                arr[i].setVisible(true);
            }
        }
    }
    document.getElementById("heat").style.visibility = "visible";
    document.getElementById('markers').onclick = function () {
        getMarkersOnMap();
    }
}

/* Create a single slider, a submit button a single date input box
 * this slider changes along with the input box;
 * the input box value changes along with the slider also */
function createSingleSlider() {
    var singleSlider = document.getElementById('sliderNew');
    var today = new Date();
    var enddate = new Date(today.getTime() + 6 * 30 * 24 * 60 * 60 * 1000); // end in 6 months
    noUiSlider.create(singleSlider, {
        start: [today.getTime()],
        range: {
            min: today.getTime(),
            max: enddate.getTime()
        },
        // Steps of one day
        step: 24 * 60 * 60 * 1000
    });

    var div = document.getElementById("inputSingle");
    div.innerHTML = "&#x1F52D;&nbsp; Fast Forward to &nbsp;";
    var inputbox = document.createElement("input");
    inputbox.id = 'singleDate';
    inputbox.type = 'date';
    inputbox.value = getDateString(today);
    inputbox.min = getDateString(today);
    inputbox.max = getDateString(enddate);
    div.appendChild(inputbox);
    
    createSelectBox(div);
    createSubmitBtn(div);

    // input box changes according to slider
    singleSlider.noUiSlider.on('update', function(values, handle) {
        var date = new Date(+values[handle]);
        inputbox.value = formulateDate(date);
    });

    // handle changes along input table
    inputbox.addEventListener('change', function(){
        // console.log(this.value);
        var tmp = new Date(this.value+"T12:00:00.00");
        setTimeout(function(){ singleSlider.noUiSlider.set(tmp.getTime()); }, 800);
    });
}

function createSelectBox(div) {
    var selectList = document.createElement("select");
    selectList.style.marginLeft = "15px";
    var opt = document.createElement("option");
    opt.innerHTML = "Incidents(Fire Department)";
    opt.id = "predictFire";
    selectList.appendChild(opt);
    // opt = document.createElement("option");
    // opt.innerHTML = "Crime(Police Department)";
    // opt.id = "predictFire";
    // selectList.appendChild(opt);    
    div.appendChild(selectList);
}

// return string in the form of yyyy-mm-dd of today's date
function getDateString(date) {
    var dd = date.getDate();
    var mm = date.getMonth()+1; //January is 0!

    var yyyy = date.getFullYear();
    if(dd<10){
        dd='0'+dd;
    }
    if(mm<10){
        mm='0'+mm;
    }
    var dateStr = yyyy + '-' + mm + '-' + dd;
    return dateStr;
}

// create a Submit btn that appends to parameter div
function createSubmitBtn(div) {
    var button = document.createElement("button");
    button.className = "button";
    button.style.backgroundColor = "#A1D5E7";
    button.style.marginLeft = "25px";
    button.style.fontFamily = "Zilla Slab";
    button.style.fontSize = "14px";
    button.innerHTML = "Predict!";
    div.appendChild(button);

    button.addEventListener ("click", function() {
        document.getElementsByClassName("loading")[0].style.display = "none";
        var answer = "";
        if (document.getElementById("predictFire").selected) {
            answer = "fire";
        } else {
            answer = "crime";
        }
        socket.emit('predictNOW', {ans: answer});
    });
}

// get predictions_data from python file
socket.on('predictions_data', function(msg) {
    // console.log("--> predictions_data length is: " + msg.length);
    setPredictions(msg);
});

// predictions is empty []
socket.on('predictions_none', function(msg) {
    // console.log("predictions_none");
    // console.log(msg);
});

// get predictions_data from python file
socket.on('predictions_data_crime', function(msg) {
    // console.log("--> predictions_data CRIME length is: " + msg.length);
    setPrediction(msg);

});

socket.on('bestAreaInCharge', function(msg) {
    // console.log("--> best Area In Charge has length of: " + msg.length);
    setBestDepotsArea(msg[0], msg[1]);
}); 

// set all predictions dots onto heat map
var heatmapPredict;
function setPredictions(arr) {
    // alert("Inside set predictions");
    var heatMapData = [];
    for (var i = 0; i < arr.length; i++) {
        var obj = {};
        obj.location = new google.maps.LatLng((arr[i])[1], (arr[i])[0]);
        obj.weight = (arr[i])[2]*12000;
        heatMapData.push(obj);
    }

    var heatmapPredictNew = new google.maps.visualization.HeatmapLayer({
        data: heatMapData,
        dissipating: false,
        radius: 0.02
    });
    map.setCenter(centerNash);
    heatmapPredictNew.setMap(map);

    if (heatmapPredict) {
        heatmapPredict.setMap(null);
    }
    heatmapPredict = heatmapPredictNew;
}

function setPrediction(arr) {
    // alert("Inside set prediction");
    var heatMapData = [];
    for (var i=0; i<arr.length; i++) {
        heatMapData.push(new google.maps.LatLng(arr[i][3], arr[i][4]));
    }

    var heatmapPredictNew = new google.maps.visualization.HeatmapLayer({
        data: heatMapData,
        radius: 20,
        dissipating: false
    });
    google.maps.event.addListener(heatmapPredictNew, 'zoom_changed', function () {
              heatmap.setOptions({radius:getNewRadius()});
          });

    map.setCenter(centerNash);
    heatmapPredictNew.setMap(map);

    if (heatmapPredict) {
        heatmapPredict.setMap(null);
    }
    heatmapPredict = heatmapPredictNew;
}

// set best assignment depots with different colors
var gridInChargeOf = {};
var markerBestAssign = [];
var rectBestAssign = [];
var allGrids = {}; // grid number: [lat, lng, rectangle]
function setBestDepotsArea(dicOfArr, grid2LatLng) {
    // depot image
    var imgDepot = {
        url: 'https://statefireschool.delaware.gov/wp-content/themes/dosgic_SFS_theme/img/sfs-icons-training.png',
        scaledSize: new google.maps.Size(25, 25)
    };

    var dlong = 0.00898;
    var dlat = 0.0072;

    // draw all grid, create allGrids look up
    for (var key in grid2LatLng) {
        (function () {
            var lat = grid2LatLng[key][1];
            var lng = grid2LatLng[key][0];
            // draw a rectangle for the in charge of 
            var rectangle = new google.maps.Rectangle({
                strokeColor: 'darkgrey',
                strokeOpacity: 1,
                strokeWeight: 1,
                fillColor: 'transparent',
                fillOpacity: 1,
                map: map,
                bounds: {
                  north: lat+dlat,
                  south: lat-dlat,
                  east: lng+dlong,
                  west: lng-dlong
                }
            });
            rectangle.addListener('click', function() {
                rectangle.setOptions({
                    strokeWeight: 2,
                    fillColor: 'lime',
                    fillOpacity: 0.9
                });
            });
            allGrids[key] = [lat, lng, rectangle];
        }());  
    }

    var count = 0;
    for (var key in dicOfArr) {
        // draw marker for all best assignment depots
        var content = key.toString();
        var latLng = new google.maps.LatLng(allGrids[key][0], allGrids[key][1]),
            marker = new google.maps.Marker(createMarkerObj(latLng,map,imgDepot,content));
        markerBestAssign.push(marker);
        setInfoWindow(marker);

        // color rectangles that this depot in charge of
        for (var i=0; i<dicOfArr[key].length; i++) {
            (allGrids[dicOfArr[key][i]])[2].setOptions({
                strokeColor: '#cccccc',
                strokeOpacity: 0.6,
                strokeWeight: 2,
                fillColor: gridColors[count],
                fillOpacity: 0.6,
            });
            if (! (key in gridInChargeOf)) {
                gridInChargeOf[key] = [];
            }
            gridInChargeOf[key].push((allGrids[dicOfArr[key][i]])[2]);
        } 

        // highlight this depot's in charge of rectangles when mouse over
        marker.addListener('mouseover', function() {
            for (var k=0; k<(gridInChargeOf[this.contentString]).length; k++) {
                gridInChargeOf[this.contentString][k].setOptions({
                    fillOpacity: 1,
                    strokeColor: '#282828', //dark grey
                    strokeOpacity: 1
                });
            }
        });
        marker.addListener('mouseout', function() {
            for (var k=0; k<(gridInChargeOf[this.contentString]).length; k++) {
                gridInChargeOf[this.contentString][k].setOptions({
                    fillOpacity: 0.6,
                    strokeColor: '#cccccc', //light grey
                    strokeOpacity: 0.6
                });
            }
        });  

        count++;
    }
    
    // console.log("-----> grids each depot in charge of");
    // console.log(gridInChargeOf);
}
