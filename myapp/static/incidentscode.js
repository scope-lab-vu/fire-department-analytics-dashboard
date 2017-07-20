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
        scrollwheel: false  // disable scroll wheel
    });

    // Create the DIV to hold the control and call the CenterControl()
    // constructor passing in this DIV.
    var centerControlDiv = document.createElement('div');
    var centerControl = new CenterControl(centerControlDiv, map);

    centerControlDiv.index = 1;
    map.controls[google.maps.ControlPosition.TOP_CENTER].push(centerControlDiv);

}

// create socket connect
var socket = io.connect('http://' + document.domain + ':' + location.port);

// on success, log success
socket.on('success', function() {
    console.log("socketio success");
});


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
function getData() {
    prepMarkers();
    types.length = 0;
    types = [];
    document.getElementById("loader").style.display = "block";
    
    var chart_Option = document.getElementById('chartList').value,
        start_Date = document.getElementById('date1').value,
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

    sumOfIncidents.length=0;
    sumOfIncidents = [0,0,0,0,0,0,0];  // sum of incidents happened at each level of severity

    console.log("markersArr length:   "+ markersArr.length+ "\n   "+markersArr);    
}


/* create floating panel for map, on click can center map */
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

socket.on('incident_success', function() {
    document.getElementById("loader").style.display = "block";
})
/* socket to get burglary data from server*/
var data_burglary;
socket.on('burglary_data', function(msg) {

    // console.log(msg);
    data_burglary = msg;
    setBurglary();
});

// set burglary data
function setBurglary() {
    arr = [];
    var r1 = data_burglary;
    var image = {
        url: 'http://paybefore.com/wp-content/uploads/2016/09/burglar-icon-208x300.png',
        scaledSize: new google.maps.Size(20, 30)
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
    document.getElementById("loader").style.display = "none";
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

var severity = "ABCDEO",
    colors = ['#00a6ff', '#bbec26', '#ffe12f', '#ff9511', '#ff0302', '#66060A'];

/* socket to get incident_data from server */
var data_incident;
socket.on('incident_data', function(msg) {
    console.log(msg);
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
        console.log("-------------------");
        console.log(types);
    }
    setIncident(data_incident, u)
    document.getElementById("loader").style.display = "none";
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
    var latLng = new google.maps.LatLng(r._lat, r._lng);
    heatDataAll.push(latLng);
    var content = '<b>Incident Number: </b>' + r.incidentNumber +
        '</br><b>Alarm Date: </b>' + r.alarmDate +
        '</br><b>Location: </b>' + r.streetNumber + " " + r.streetPrefix + " "
        + r.streetName + " " + r.streetSuffix + " " + r.streetType + ", "
        + r.city + ", " + r.county + ", TN" +
        '</br><b>EMD Card Number: </b>' + r.emdCardNumber +
        '</br><b>Fire Zone: </b>' + r.fireZone +
        '</br>Object Id: ' + r._id;
    content = content.replace(/na/g, "");

    var protocol = (r.emdCardNumber).substring(0,index);
    var img;
    var imgCardiac = {
            url: 'https://www.monash.edu/__data/assets/image/0020/352091/cardio.png',
            scaledSize: new google.maps.Size(15, 15)
        },
        imgTrauma = {
            url: 'http://www.otorrinoguadalajara.com.mx/wp-content/uploads/2016/02/3.png',
            scaledSize: new google.maps.Size(20, 20)
        },
        imgMVA = {
            url: 'https://cdn3.iconfinder.com/data/icons/flat-icons-2/600/traffic.png',
            scaledSize: new google.maps.Size(15, 15)
        },
        imgFire = {
            url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Emoji_u1f525.svg/2000px-Emoji_u1f525.svg.png',
            scaledSize: new google.maps.Size(20, 20)
        },
        imgOther = {
            url: 'http://icon-park.com/imagefiles/location_map_pin_blue5.png',
            scaledSize: new google.maps.Size(15, 20)
        };
    
    if (strCardiac.includes(protocol)) {
        img = imgCardiac;
    } else if (strTrauma.includes(protocol)) {
        img = imgTrauma;
    } else if (strFire.includes(protocol)) {
        img = imgFire;
    } else if (strMVA.includes(protocol)) {
        img = imgMVA;
    } else {
        img = imgOther;
    }

    var marker = new google.maps.Marker(createMarkerObj(latLng,map,img,content));
    setInfoWindow(marker);
    markers.push(marker);
    markersArr[protocol].push(marker);
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
        CTRAN: "Critcal Transfer",
        DUPONT: "Dupont Alarm"
    }

/* socket after markers are drawn on map: set up pie charts*/
socket.on('markers-success', function() {
    console.log("-->All markers success")
    console.log("types[]: ")
    console.log(types)
    console.log(markersArr); // should look like [Incidents: Array(x), Burglary: Array(y)]
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
            // typeCheckbox.style.display = "block";
            typeCheckbox.overflow = "hidden";
            var label = document.createTextNode(meaningList[types[i]]);
            div.appendChild(typeCheckbox);
            div.appendChild(label);
            
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

/* Hide or Show markers according to user check box */
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

/* toggle markers by changing their visibility */
function toggleMarkers(arrOfArr) {
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


// generate heat map layer, after which change button
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

    var colors = ['#00a6ff', '#bbec26', '#ffe12f', '#ff9511', '#ff0302', '#66060A','#797A7A'];
    var severity = ["A","B","C","D","E","O","N.A"];
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
}

/* set pie chart with google charts */
function setPie(arr) {
    google.charts.load('current', {'packages':['corechart']});
    var data = google.visualization.arrayToDataTable(arr);

    var options = {
        title: 'Percentage of incidents',
        is3D: true,
        backgroundColor: "7EA08E"
    };
    var chart = new google.visualization.PieChart(document.getElementById('pieForType'));
    chart.draw(data, options);
    console.log("-->pie chart success");
}

/* set pie chart with d3
 * PROBLEM IS: I can't clear current canvas */
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
