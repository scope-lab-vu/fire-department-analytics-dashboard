/**
 * Created by Jessie on 6/27/17.
 * Script for setting markers, heat maps, info windows for Json data
 */
var map;
var centerNash = {lat: 36.18, lng: -86.7816};
var minDate = new Date("2014-02-20T00:00:00.00");
var maxDate = new Date("2016-02-06T00:00:00.00");

// night vision stylish map stylers
var oldStyles = [
  {
    "featureType": "administrative.locality",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#12510c"
      }
    ]
  },
  {
    "featureType": "administrative.neighborhood",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#1a7311"
      }
    ]
  },
  {
    "featureType": "landscape.man_made",
    "elementType": "geometry.stroke",
    "stylers": [
      {
        "visibility": "simplified"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "labels.icon",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#5692b1"
      }
    ]
  },
  {
    "featureType": "poi.attraction",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "poi.business",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "poi.sports_complex",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "road.arterial",
    "elementType": "geometry.fill",
    "stylers": [
      {
        "color": "#f6f8f8"
      }
    ]
  },
  {
    "featureType": "road.arterial",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#808453"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry.fill",
    "stylers": [
      {
        "color": "#8ef7dd"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry.stroke",
    "stylers": [
      {
        "color": "#cccccc"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "labels.icon",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#1b5150"
      }
    ]
  },
  {
    "featureType": "road.highway.controlled_access",
    "elementType": "geometry.fill",
    "stylers": [
      {
        "color": "#74e5f7"
      }
    ]
  },
  {
    "featureType": "road.highway.controlled_access",
    "elementType": "geometry.stroke",
    "stylers": [
      {
        "color": "#cccccc"
      }
    ]
  },
  {
    "featureType": "road.local",
    "elementType": "geometry.fill",
    "stylers": [
      {
        "color": "#f0f2f2"
      }
    ]
  },
  {
    "featureType": "road.local",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#a28d5b"
      }
    ]
  }
]

// Create an initial map - plain, center at centerNash
function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 11,
        center: centerNash,
        mapTypeId: 'roadmap',
        scrollwheel: false,  // disable scroll wheel
        mapTypeControl: false,
        streetViewControl: false,
        styles: oldStyles
    });

    // Create the DIV to hold the control and call the CenterControl()
    // constructor passing in this DIV.
    var centerControlDiv = document.createElement('div');
    var centerControl = new CenterControl(centerControlDiv, map);

    centerControlDiv.index = 1;
    map.controls[google.maps.ControlPosition.TOP_CENTER].push(centerControlDiv);

    createSlider();
}

/* generate a data slider that follows the date input box;
 * input box also follows the handle on slider */
function createSlider() {
    var start_Date = document.getElementById('date1'),
        start_Hour = document.getElementById('hour1'),
        end_Date = document.getElementById('date2'),
        end_Hour = document.getElementById('hour2');

    var start = start_Date.value + 'T' + (start_Hour.value).toString() + ":00:00.00",
        end = end_Date.value + "T" + (end_Hour.value).toString() + ":00:00.00";

    // slider object with double handles
    var dateSlider = document.getElementById('slider');
    noUiSlider.create(dateSlider, {
        // Create two timestamps to define a range.
        range: {
            min: minDate.getTime(),
            max: maxDate.getTime()
        },
        connect: true,
        behaviour: 'tap-drag',
        // Min interval: an hour
        margin: 60 * 60 * 1000,
        // // Max interval: 30 days
        // limit: 30 * 24 * 60 * 60 * 1000,
        // Steps of one hour
        step: 60 * 60 * 1000,
        // Two more timestamps indicate the handle starting positions.
        start: [timestamp(start), timestamp(end)],
    });
    
    // change connect color between two handles according to date interval length
    var connect = dateSlider.querySelector('.noUi-connect');
    var button = document.getElementById('submitDates');
    dateSlider.noUiSlider.on('update', function(values) {
        if ((values[1]-values[0])>30 * 24 * 60 * 60 * 1000) {
            connect.style.background = "goldenrod";
            button.style.backgroundColor = "goldenrod"
        } else {
            connect.style.background = "#D69560";
            button.style.backgroundColor = "#D69560";
        }
    });

    // input tables change along with handle
    var inputs = [start_Date, end_Date, start_Hour, end_Hour];
    dateSlider.noUiSlider.on('update', function(values, handle) {
        var date = new Date(+values[handle]);
        inputs[handle].value = date.getFullYear()+"-"+ addZero((date.getMonth()+1).toString())+(date.getMonth()+1) +
            "-"+addZero((date.getDate()).toString())+date.getDate();
        inputs[handle+2].value = date.getHours();
    });

    var dateValues = document.getElementById('event');
    dateSlider.noUiSlider.on('update', function(values) {
        dateValues.innerHTML = formatDate(new Date(+values[0]))+ " ~ " + formatDate(new Date(+values[1]));
    });

    // handle changes along input tables
    var tmpdate;
    start_Date.addEventListener('change', function(){
        tmpdate = this.value;
        dateSlider.noUiSlider.set([timestamp(this.value), null]);
    });
    start_Hour.addEventListener('change', function(){
        tmpdate = tmpdate + "T" + (start_Hour.value).toString() + ":00:00.00";
        dateSlider.noUiSlider.set([timestamp(tmpdate), null]);
    });
    end_Date.addEventListener('change', function(){
        tmpdate = this.value;
        dateSlider.noUiSlider.set([null, timestamp(this.value)]);
    });
    end_Hour.addEventListener('change', function(){
        tmpdate = tmpdate + "T" + (end_Hour.value).toString() + ":00:00.00";
        dateSlider.noUiSlider.set([null, timestamp(tmpdate)]);
    });
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

var weekdays = [
        "Sunday", "Monday", "Tuesday",
        "Wednesday", "Thursday", "Friday",
        "Saturday"
    ];

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

// Create a string representation of the date.
function formatDate (date) {
    return weekdays[date.getDay()] + ", " +date.getFullYear() + "/"
    + (date.getMonth()+1)+"/"+date.getDate() + nth(date.getDate())+"  "+date.getHours()+":00";
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
    heatDataTraffic = [],
    heatDataBurglary = [];
var sumOfIncidents = [];


/* On submit button: get data from left menu bar, if date is not filled,
 * alert message until user fills in data;
 * calls to formulate data correctly 
 * socket emit start and end date to retrieve data*/
var types = [];  // types of markers already on map
var visited = false;
function getData() {
    prepMarkers();
    types.length = 0;
    types = [];
    document.getElementById("loader").style.display = "block";
    if (!visited) {
        for (var i=0; i<3; i++) {
            document.getElementsByClassName("loadingMsg")[i].innerHTML = "Generating canvas...";
            document.getElementsByClassName("loading")[i].style.color = "#4eff35";
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

    if  (start_Hour === "") {
        start_Hour = 0;
    }
    if (end_Hour === "") {
        end_Hour = 23;
    }

    if (start_Date==="" || end_Date==="") {
        alert("Date must be filled!!!");
    } else {
        socket.emit('get_date', {
            'start': start_Date+" "+start_Hour.toString()+" 0", 
            'end': end_Date + " "+ end_Hour.toString()+" 59"
        });
    }
}

/*
 * reset markers everytime user hits "submit"
 */
function prepMarkers() {
    document.getElementById('initialHint').style.display = 'none';
    document.getElementById('markers').innerHTML = 'Hide Incidents';
    setButtonDisplay("hidden");
    // remove markers from the map, but still keeps them in the array
    for (var i = 0; i < markers.length; i++) {
        markers[i].setMap(null);
    }

    if (heatmap) {
        heatmap.setMap(null);
    }
    // delete all by removing reference to them,
    // so that when user hit "submit" again, previous markers are gone
    markers = [];
    markers.length = 0;
    heatDataAll = [];
    heatDataAll.length = 0;
    markersArr = [];
    markersArr.length = 0;
    vehiclesArr = [];
    vehiclesArr.length = 0;

    sumOfIncidents.length=0;
    sumOfIncidents = [0,0,0,0,0,0,0];  // sum of incidents happened at each level of severity

    console.log("markersArr length:   "+ markersArr.length+ "\n   "+markersArr);   
    console.log("heatDataAll length:   "+ heatDataAll.length+ "\n   "+heatDataAll);   
}


/* create floating panel for map, on click can center map */
function CenterControl(controlDiv, map) {
    // Set CSS for the control border.
    var controlUI = document.createElement('div');
    controlUI.style.backgroundColor = 'white';
    controlUI.style.border = '0.2px solid #BEBEBE';
    controlUI.style.borderRadius = '1px';
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

socket.on('success', function() {
    console.log("socketio success");
});

socket.on('burglary_none', function() {
    console.log("burglary none")
});
/* socket to get burglary data from server*/
var data_burglary;
socket.on('burglary_data', function(msg) {

    // console.log(msg);
    data_burglary = msg;
    setBurglary();
});

function setButtonDisplay(str) {
    document.getElementById("markers").style.visibility = str;
    document.getElementById("heat").style.visibility = str;
    document.getElementById("gradient").style.visibility = str;
    document.getElementById("vehide").style.visibility = str;
}

// set burglary data
function setBurglary() {
    arr = [];
    var r1 = data_burglary;
    var image = {
        url: 'http://paybefore.com/wp-content/uploads/2016/09/burglar-icon-208x300.png',
        scaledSize: new google.maps.Size(16, 24)
    };
    for (var i = 0; i < r1.length; i++) {
        var contentString = "Occured: "+r1[i].AlarmDateTime +"</br>" +"Reported: " + 
            r1[i].IncidentReported + "</br>Incident Status: " + r1[i]["Incident Status"] + 
            "</br>Number of Victims: " + r1[i].VICTIM_NO;
        
        var latLng = new google.maps.LatLng(r1[i].LATITUDE, r1[i].LONGITUDE),
            marker = new google.maps.Marker(createMarkerObj(latLng,map,image,contentString));

        heatDataAll.push(latLng);
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



var strCardiac = "6/9/11/12/19/28/31/32",
    strTrauma = "1/2/3/4/5/7/8/10/13/14/15/16/17/18/20/21/22/23/24/25/26/27/30",
    strMVA = "29",
    strFire = "51/52/53/54/55/56/57/58/59/60/61/62/63/64/65/66/67/68/69/70/71/72/73/74/75";

var severity = "OABCDE";
var colors = ['#00a6ff', '#bbec26', '#ffe12f', '#ff9511', '#ff0302', '#66060A','#797A7A'];

/* socket to get incident_data from server */
var data_incident;
socket.on('incident_data', function(msg) {
    data_incident = msg;
    /* emdCardNumber is a digit that has length [3,5], the letter in between is the 
     * response determinant, a.k.a, the level of severity; or it has the value of 
     * "ctran" or "dupont"*/
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

/* set traffic incidents markers, markers are circles color-coded to indicate
 * level of severity */
function setIncident(r, index) {
    var r_severity = (r.emdCardNumber).charAt(index);
    if (severity.indexOf(r_severity) >= 0) {
        sumOfIncidents[severity.indexOf(r_severity)]++;
    } else {
        sumOfIncidents[severity.length]++;
    }

    var protocol = (r.emdCardNumber).substring(0,index);
    var img;
    var emoji;
    var imgCardiac = {
            url: 'https://www.monash.edu/__data/assets/image/0020/352091/cardio.png',
            scaledSize: new google.maps.Size(18, 18),
            anchor: new google.maps.Point(7, 7)
        },
        imgTrauma = {
            url: 'https://cdn2.iconfinder.com/data/icons/medical-flat-icons-part-1/513/30-512.png',
            scaledSize: new google.maps.Size(18, 18),
            anchor: new google.maps.Point(9, 9)
        },
        imgMVA = {
            url: 'https://cdn3.iconfinder.com/data/icons/flat-icons-2/600/traffic.png',
            scaledSize: new google.maps.Size(20, 20),
            anchor: new google.maps.Point(9, 9)
        },
        imgFire = {
            // url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Emoji_u1f525.svg/2000px-Emoji_u1f525.svg.png',
            url: 'http://vignette3.wikia.nocookie.net/camphalfbloodroleplay/images/a/a5/Fire.gif/revision/latest?cb=20130614161535',
            scaledSize: new google.maps.Size(22, 22)
        },
        imgOther = {
            url: 'http://www.clker.com/cliparts/F/S/M/2/p/w/map-marker-hi.png',
            scaledSize: new google.maps.Size(12, 18)
        };
        
    
    if (strCardiac.includes(protocol)) {
        img = imgCardiac;
        emoji = "&#x1F494;";
    } else if (strTrauma.includes(protocol)) {
        img = imgTrauma;
        emoji = "&#x1F691;";
    } else if (strFire.includes(protocol)) {
        img = imgFire;
        emoji = "&#x1F525;";
    } else if (strMVA.includes(protocol)) {
        img = imgMVA;
        emoji = "&#x1F6A6;";
    } else {
        img = imgOther;
        emoji = "&#x1F50E;";
    }

    var latLng = new google.maps.LatLng(r._lat, r._lng);
    heatDataAll.push(latLng);
    var content = "<h3>"+emoji+" "+meaningList[protocol]+"</h3>"+
        '<b>Incident Number: </b>' + r.incidentNumber +
        '</br><b>Alarm Date: </b>' + r.alarmDate +
        '</br><b>Location: </b>' + r.streetNumber + " " + r.streetPrefix + " "
            + r.streetName + " " + r.streetSuffix + " " + r.streetType + ", "
            + r.city + ", " + r.county + ", TN" +
        '</br><b>EMD Card Number: </b>' + r.emdCardNumber +
        '</br><b>Fire Zone: </b>' + r.fireZone +
        '</br>Object Id: ' + r._id;
    content = content.replace(/na/g, "");

    var marker = new google.maps.Marker(createMarkerObj(latLng,map,img,content));
    setInfoWindow(marker);
    markers.push(marker);
    markersArr[""+protocol].push(marker);
}

/* socket to get depots location from server*/
socket.on('depots_data', function(msg) {
    arr_depots = msg.depotLocation;
    arr_vehicles = msg.depotInterior;

    var imgDepot = {
        url: 'https://hydra-media.cursecdn.com/simcity.gamepedia.com/1/13/Fire_station_garage.png?version=e2d13f3d48d4d276f64d0cb8c04adbee',
        scaledSize: new google.maps.Size(24, 24)
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
    }
    console.log("depots_data length"+":  "+arr_depots.length);
});

/* socket to get vehicles location from server*/
var data_vehicle;
var vehiclesArr = [];
socket.on('vehicle_data', function(msg) {
    data_vehicle = msg;
    setVehicle();
});

/* set markers for responding vehicles location*/
function setVehicle() {
    var r1 = data_vehicle;
    var image = {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: 'floralwhite',
            fillOpacity: .4,
            scale: 6,
            strokeColor: 'brown',
            strokeWeight: .5
    };
    for (var i = 0; i < (r1.locations).length; i++) {
        var content = "&#x1F692;<b>id: </b>"+r1._id +"</br>" +"<b>Apparatus ID: </b>" + 
            r1.apparatusID + "</br>"+"<b>Time of location: </b>"+ (r1.locations)[i].time +
            "</br>"+"<b>Station Location: </b>" + (r1.stationLocation)[0]
        
        var latLng = new google.maps.LatLng((r1.locations)[i]._lat, (r1.locations)[i]._lng),
            marker = new google.maps.Marker({
                position: latLng,
                map: map,
                icon: image,
                label: {
                    color: "brown",
                    fontSize: "5px",
                    text: r1.apparatusID
                },
                contentString: content
            });

        content = content.replace(/na/g, "Unknown");
        setInfoWindow(marker);
        vehiclesArr.push(marker);        
    }
}

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

var meaningList = {0: "",
        1: "Abdominal Pain/Problems", 
        2: "Allergies",
        3: "Animal Bites/Attacks",
        4: "Assualt/Sexual Assault",
        5: "Back Pain",
        6: "Breathing Problems",
        7: "Burns",
        8: "Carbon Monoxide/CBRN",
        9: "Cardiac Arrest/Death",
        10: "Chest Pain",
        11: "Choking",
        12: "Convulsion/Seizure",
        13: "Diabetic",
        14: "Drowning(near)",
        15: "Electrocution/Lightning",
        16: "Eye Problems",
        17: "Fall",
        18: "Headache",
        19: "Heart Problems",
        20: "Heat And Cold Exposure",
        21: "Hemorrhage/Laceration",
        22: "Inaccessible Incident",
        23: "Overdose",
        24: "Pregnancy/Childbirth/Miscarriage",
        25: "Psychiatric/Suicidal",
        26: "Sick Person",
        27: "Stab/Gunshot/Penetrating Trauma",
        28: "Stroke",
        29: "Traffic/Transportation",
        30: "Traumatic Injuries",
        31: "Unconscious/Fainting(near)",
        32: "Unknown Problem(man down)",
        51: "Aircraft Emergency",
        52: "Alarm",
        53: "Citizen Assist/Service Call",
        54: "Confined Space/Structure Collapse",
        55: "Electrical Hazard",
        56: "Elevator/Escalator Rescue",
        57: "Explosion",
        58: "Extrication/Entrapped",
        59: "Fuel Spill",
        60: "Gas Leak/Gas Odor(natural)",
        61: "Hazmat",
        62: "High Angle Rescue",
        63: "Lightning Strike(investigation)",
        64: "Marine Fire",
        65: "Mutual Aid",
        66: "Odor(Strange/Unknow)",
        67: "Outside Fire",
        68: "Somke Investigation(outside)",
        69: "Structure Fire",
        70: "Train/Rail Inident",
        71: "Vehicle Fire",
        72: "Water Rescue",
        73: "Watercraft in Distress",
        74: "Suspicious Package",
        75: "Train/Rail Fire",
        80: "Burglary",
        81: "Response Vehicles",
        CTRAN: "Critcal Transfer",
        DUPONT: "Dupont Alarm"
    }

/* socket after markers are drawn on map: set up pie charts*/
socket.on('markers-success', function() {
    setButtonDisplay("visible");
    console.log("-->All markers success");
    console.log("types[]: ");
    console.log(types);
    console.log("markersArr length:   "+ markersArr.length);   
    console.log("heatDataAll length:   "+ heatDataAll.length);   
    // console.log(markersArr); // should look like [Incidents: Array(x), Burglary: Array(y)]
    
    setBar(sumOfIncidents);
    var arr = [['Types', 'Number']];
    for (var j=0; j<types.length; j++) {
        var a = [];
        a.push(meaningList[types[j]]);    
        a.push(markersArr[types[j]].length);
        arr.push(a);
    }
    console.log(arr);
    // set up pie chart
    google.charts.load('current', {packages: ['corechart']});
    google.charts.setOnLoadCallback(function() {
        setPie(arr);
    });
    printSummary();
});

/* heat data of incidents successfully pushed to heatdataAll*/
socket.on('heat-success', function() {
    document.getElementById("heat").style.visibility = 'visible';
    document.getElementById("gradient").style.visibility = 'visible';
    console.log("-->All heat pushed success");
    console.log("heatDataAll:   "+heatDataAll.length);
    
    setHeatMap();
    setBar(sumOfIncidents);

    var arr = [['Types', 'Number']];
    for (var j=0; j<types.length; j++) {
        var a = [];
        a.push(meaningList[types[j]]);    
        a.push(markersArr[types[j]]);
        arr.push(a);
    }
    console.log(arr);
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

    var optionGroup1 = document.createElement("optGroup");
    optionGroup1.label = "Cardiac";
    selectList.appendChild(optionGroup1);

    var optionGroup2 = document.createElement("optGroup");
    optionGroup2.label = "Trauma";
    selectList.appendChild(optionGroup2);

    var optionGroup3 = document.createElement("optGroup");
    optionGroup3.label = "Fire";
    selectList.appendChild(optionGroup3);

    var optionGroup4 = document.createElement("optGroup");
    optionGroup4.label = "MVA";
    selectList.appendChild(optionGroup4);

    var optionGroup5 = document.createElement("optGroup");
    optionGroup5.label = "Other";
    selectList.appendChild(optionGroup5);


    for (var i=0; i<types.length; i++) {
        var option = document.createElement("option");
        option.id = types[i];
        option.text = meaningList[types[i]];
        option.selected = true;

        if (strCardiac.includes(types[i])) {
            optionGroup1.appendChild(option);
        } else if (strTrauma.includes(types[i])) {
            optionGroup2.appendChild(option);
        } else if (strFire.includes(types[i])) {
            optionGroup3.appendChild(option);
        } else if (strMVA.includes(types[i])) {
            optionGroup4.appendChild(option);
        } else {
            optionGroup5.appendChild(option);
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
}

/* toggle markers by changing their visibility */
function toggleMarkers(arrOfArr) {
    for (var j = 0; j < types.length; j++) {
        if (document.getElementById(types[j]).selected) {
            var arr = arrOfArr[types[j]];
            for (var i = 0; i < arr.length; i++) {
                if (arr[i].getVisible()) {
                    arr[i].setVisible(false);
                    document.getElementById('markers').innerHTML = 'Show Incidents';
                } else {
                    arr[i].setVisible(true);
                    document.getElementById('markers').innerHTML = 'Hide Incidents';
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
    heatmap= new google.maps.visualization.HeatmapLayer({
        data: heatDataAll,
        dissipating: false,
        map: map,
        radius: 0.01
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
            color: 'white', 
        }
    };
    var chart = new google.visualization.PieChart(document.getElementById('pieForType'));
    chart.draw(data, options);
    console.log("-->pie chart success");
    document.getElementsByClassName("loading")[2].style.display= "none";
}

/* set pie chart with d3
 * PROBLEM IS: I can't clear current canvas */
function setPiej3(data) {
    var canvas = document.querySelector("canvas"),
        context = canvas.getContext("2d");

    var width = canvas.width,
        height = canvas.height,
        radius = Math.min(width, height) / 2;

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

/* side nav bar 
 * "bar" to "x" function
 * show/hide side nav bar */
function barToX(x) {
    x.classList.toggle("change");
    var w = document.getElementById("mySideNav");
    if(w.style.width === "0px" || w.style.width ==="") {
        w.style.width = "300px";
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
    var a = document.getElementById("mySideMenu");
    e = e[0];

    if (mapView.style.height === "700px") {
        mapView.style.height = "500px";
        mapDiv.style.height = "410px";
        a.style.height = "410px";
    } else {
        mapView.style.height = "700px";
        mapDiv.style.height = "610px";
        a.style.height = "610px";
    }
    google.maps.event.trigger(mapDiv, 'resize');
    map.setCenter(centerNash);
}

/* Change mode from Historical to Predictions
 * 1) change interface color
 * 2) change double slider to one
 * 3) create a single input date box*/
function changeMode() {
    prepMarkers(); // clear map first
    var newStyles = [
        {
            stylers: [{hue: "#091a20"}, {saturation: -5}]
        },
        {
            featureType: "road",
            elementType: "geometry",
            stylers: [{lightness: 100}, {visibility: "simplified"}]
        },
        {
            featureType: "road",
            elementType: "labels",
            stylers: [{visibility: "off"}]
        }
    ];

    var a = document.getElementsByClassName("column");
    var b = document.getElementById("futureLine");
    var c = document.getElementById("sliderDouble");
    var d = document.getElementById("initialMsgOnMap");
    d.innerHTML = "Please Pick A Date In the FUTURE to see Predictions";
    d = document.getElementById("initialMsgOnMap1");
    d.innerHTML = "";

    if (document.getElementById("checkFuture").checked) { // future mode is checked
        map.setOptions({styles: newStyles});
        for (var i=0; i<4; i++) {
            a[i].style.borderColor = "#82D6FF";
        }
        document.body.style.backgroundColor = "rgba(0,0,0,0.90)";
        changeColor("#82D6FF");
        b.style.color = "black";
        c.style.display = "none";
        if (document.getElementById("sliderNew").innerHTML === "") {
            createSingleSlider();
        } else {
            document.getElementById("sliderNew").style.display = "block";
            document.getElementById("inputSingle").style.display = "block";
        }


    } else { // historic mode is checked
        map.setOptions({styles: oldStyles});
        for (var j=0; j<4; j++) {
            a[j].style.borderColor = "#4f4f4f";
        }
        document.body.style.backgroundColor = "rgba(0,0,0,0.85)";
        changeColor("lime");
        b.style.color = "grey";
        c.style.display = "block";
        document.getElementById("sliderNew").style.display = "none";
        document.getElementById("inputSingle").style.display = "none";
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

/* Create a single slider and a single date input box*/
function createSingleSlider() {
    var singleSlider = document.getElementById('sliderNew');
    var today = new Date();
    var dateLimit = new Date("2030-01-01T00:00:00.00");
    var dateStart = new Date("2020-01-01T00:00:00.00");
    noUiSlider.create(singleSlider, {
        start: [dateStart.getTime()],
        range: {
            min: today.getTime(),
            max: dateLimit.getTime()
        },
        // Steps of one day
        step: 24 * 60 * 60 * 1000
    });

    var div = document.getElementById("inputSingle");
    div.innerHTML = "&#x1F52D;&nbsp; Fast Forward to &nbsp;";
    var inputbox = document.createElement("input");
    inputbox.id = 'singleDate';
    inputbox.type = 'date';
    inputbox.value = getTodayDate();
    inputbox.min = getTodayDate();
    inputbox.max = '2030-01-01';
    div.appendChild(inputbox);

    var button = document.createElement("button");
    button.className = "button";
    button.style.backgroundColor = "#A1D5E7";
    button.style.marginLeft = "25px";
    button.style.fontFamily = "Zilla Slab";
    button.style.fontSize = "14px";
    button.innerHTML = "Predict Crime";
    div.appendChild(button);

    button.addEventListener ("click", function() {
        var heatMapData = [
            {location: new google.maps.LatLng(37.782, -122.447), weight: 0.5},
            new google.maps.LatLng(37.782, -122.445),
            {location: new google.maps.LatLng(37.782, -122.443), weight: 2},
            {location: new google.maps.LatLng(37.782, -122.441), weight: 3},
            {location: new google.maps.LatLng(37.782, -122.439), weight: 2},
            new google.maps.LatLng(37.782, -122.437),
            {location: new google.maps.LatLng(37.782, -122.435), weight: 0.5},

            {location: new google.maps.LatLng(37.785, -122.447), weight: 3},
            {location: new google.maps.LatLng(37.785, -122.445), weight: 2},
            new google.maps.LatLng(37.785, -122.443),
            {location: new google.maps.LatLng(37.785, -122.441), weight: 0.5},
            new google.maps.LatLng(37.785, -122.439),
            {location: new google.maps.LatLng(37.785, -122.437), weight: 2},
            {location: new google.maps.LatLng(37.785, -122.435), weight: 3}
        ];
        var heatmap = new google.maps.visualization.HeatmapLayer({
          data: heatMapData
        });
        map.setCenter(new google.maps.LatLng(37.774546, -122.433523));
        heatmap.setMap(map);
    });

    // input box changes according to slider
    singleSlider.noUiSlider.on('update', function(values, handle) {
        var date = new Date(+values[handle]);
        inputbox.value = date.getFullYear()+"-"+ addZero((date.getMonth()+1).toString())+(date.getMonth()+1) +
            "-"+addZero((date.getDate()).toString())+date.getDate();
    });

    var dateValues = document.getElementById('event');
    singleSlider.noUiSlider.on('update', function(values, handle) {
        date = new Date(+values[handle]);
        var timeDiff = Math.abs(date.getTime() - today.getTime());
        var deltaDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)); 
        dateValues.innerHTML = date.getFullYear()+"-"+ addZero((date.getMonth()+1).toString())+(date.getMonth()+1) +
            "-"+addZero((date.getDate()).toString())+date.getDate()+ ",&nbsp;&nbsp;" +deltaDays.toString() + " days away from today";
    });

}

// return string in the form of yyyy-mm-dd of today's date
function getTodayDate() {
    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth()+1; //January is 0!

    var yyyy = today.getFullYear();
    if(dd<10){
        dd='0'+dd;
    }
    if(mm<10){
        mm='0'+mm;
    }
    today = yyyy + '-' + mm + '-' + dd;
    return today;
}