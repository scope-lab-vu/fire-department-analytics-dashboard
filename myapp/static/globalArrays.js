/*EMD card number look up list*/
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
    };

/* Weekdays names*/
var weekdays = [
        "Sunday", "Monday", "Tuesday",
        "Wednesday", "Thursday", "Friday",
        "Saturday"
    ];

/* Cardiac, Trauma, MVA, Fire strings*/
var strFireDpmt = [ 
		"6/9/11/12/19/28/31/32",		
		"1/2/3/4/5/7/8/10/13/14/15/16/17/18/20/21/22/23/24/25/26/27/30",
		"29",
		"51/52/53/54/55/56/57/58/59/60/61/62/63/64/65/66/67/68/69/70/71/72/73/74/75"
	];

/* severity from least to most*/
var severity = "OABCDE";

/* colors for severity bars*/
var colors = ['#00a6ff', '#bbec26', '#ffe12f', '#ff9511', '#ff0302', '#66060A','#797A7A'];

/* Cardiac, Trauma, MVA, Fire, other urls*/
var imgURLFireDpmt = [
		'https://www.monash.edu/__data/assets/image/0020/352091/cardio.png',
    	'https://cdn2.iconfinder.com/data/icons/medical-flat-icons-part-1/513/30-512.png',
    	'https://cdn3.iconfinder.com/data/icons/flat-icons-2/600/traffic.png',
    	'http://vignette3.wikia.nocookie.net/camphalfbloodroleplay/images/a/a5/Fire.gif/revision/latest?cb=20130614161535',
    	'http://splashextend.co.uk/images/GreenDot.png'
    ];


