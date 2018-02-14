from myapp import app
from flask import Flask, render_template, session, request
from flask_socketio import SocketIO
from flask_socketio import send, emit
from myapp import socketio
from pymongo import MongoClient
import datetime
import time
import json
import requests
import pytz
import csv
import xlrd
import os
from myconfig import MONGODB_HOST, MONGODB_PORT
from math import ceil
from copy import deepcopy

url_mongo_fire_depart = "%s:%d/fire_department" % (MONGODB_HOST, MONGODB_PORT)
print "--> url_mongo_fire_depart:", url_mongo_fire_depart

@app.route('/')
@app.route('/index')
def index():
	return render_template("incidentsPlot.html")

@app.route('/transitPlot')
def transitPlot():
    return render_template('transitPlot.html')

@app.route('/log')
def logIncident():
    return render_template('logIncident.html')

@socketio.on('connect')
def socketio_connet():
    findMinMax()

    '''
    # start: t-hub dashboard
    print "socketio_connect"
    time_change_simulation()
    data_segments = []
    with open('myapp/cached_shared_segments.json') as data_file:
        data_segments = json.load(data_file)
    print "data_segments", len(data_segments)
    socketio.emit('draw_all_route_segments', {'data': data_segments})
    # end: t-hub dashboard
    '''
    
    print "-> socketio_connect()\n"
    socketio.emit("success")

@socketio.on('get_date')
def getDate (msg):
    print "-> got date, start = " + msg['start'] +", end = "+ msg['end']
    start = datetime.datetime.strptime(msg['start'], "%Y-%m-%d %H:%M")
    end = datetime.datetime.strptime(msg['end'], "%Y-%m-%d %H:%M")
    delta = end - start
    delta = delta.days
    if (delta > 14):
        getIncidentHeat(start, end)
        # getCrimeData(start, end, "heat")
        socketio.emit("heat-success")
    else:
        #log time
        timeStart = datetime.datetime.now()
        getIncidentData(start, end)
        timeEnd = datetime.datetime.now()
        print "Time taken to get incidents : {}".format((timeEnd-timeStart).total_seconds())
        timeStart = datetime.datetime.now()
        getDepotsData()
        timeEnd = datetime.datetime.now()

        # getCrimeData(start, end, "markers")
        socketio.emit("markers-success")
    
@socketio.on('predictNOW')
def getPredict(msg):
    if (msg['ans'] == 'crime'):
        print "-----> get predict for CRIME"
        getPredictions("crime")
    else:
        print "-----> get predict for FIRE"
        getPredictions("fire")


@socketio.on('getOptimization')
def getOptimization():
    getBestDepotPos()
'''
max time is;;;;;;;;;;;;;;;;;
2016-02-05 13:12:00
min time is;;;;;;;;;;;;;;;;;
2014-02-20 10:24:00
'''
global minmax
minmax = [None] * 2
global lastsearch
lastsearch = None
def findMinMax():
    # global minmax
    # global lastsearch
    # if (not minmax or not lastsearch or time.time() - lastsearch > 24 * 60 * 60):
    #     client = MongoClient("mongodb://127.0.0.1:27017/fire_department")
    #     db = client["fire_department"]["simple__incident"]
    #     items = db.find()
    #     pretime = (items[0])['alarmDateTime']
    #     if isinstance(pretime, unicode):
    #         pretime = datetime.datetime.strptime(pretime, "%Y,%m,%d,%H,%M,%S,%f")
    #         print pretime
    #     maxT = pretime
    #     minT = pretime

    #     for item in items:
    #         _time_ = item['alarmDateTime']
    #         if isinstance(_time_, unicode):
    #             if (_time_[0]!="2"): # _time_: "Essentially the time at which the accident occurred"
    #                 continue
    #             else:
    #                 _time_ = datetime.datetime.strptime(_time_, "%Y,%m,%d,%H,%M,%S,%f")

    #         if (_time_>maxT):
    #             maxT = _time_
            
    #         if (_time_<minT):
    #             minT = _time_

    #     minmax[0] = (minT - datetime.datetime(1970,1,1)).total_seconds()
    #     minmax[1] = (maxT - datetime.datetime(1970,1,1)).total_seconds()

        '''
        2014-03-21 10:02:48.253000
        [datetime.datetime(2014, 2, 20, 10, 24, 51, 297000), datetime.datetime(2017, 6, 20, 13, 31, 11)]
        '''

        minmax[0] = (datetime.datetime(2014,2,21) - datetime.datetime(1970,1,1)).total_seconds()
        minmax[1] = (datetime.datetime(2017,6,19) - datetime.datetime(1970,1,1)).total_seconds()

        lastsearch = time.time()
        # print [minT, maxT]
        socketio.emit("gotNewMinMaxTime", minmax)



# retrieve a simplified list of information for just heat map layer
def getIncidentHeat(start, end):
    print "-> getIncidentHeat()\n"
    client = MongoClient(url_mongo_fire_depart)
    db = client["fire_department"]["simple_incidents"]
    items = db.find()
    arr = []

    for item in items:
        _time_ = item['alarmDateTime']
        if isinstance(_time_, unicode):
            if (_time_[0]!="2"): # _time_: "Essentially the time at which the accident occurred"
                continue
            else:
                _time_ = datetime.datetime.strptime(_time_, "%Y,%m,%d,%H,%M,%S,%f")
        elif not isinstance(_time_, datetime.date): 
            print item

        if (start <= _time_ <= end):
            dictIn = {}
            dictIn['lat'] = item['latitude']
            dictIn['lng'] = item['longitude']
            dictIn['emdCardNumber'] = item['emdCardNumber']
            arr.append(dictIn)
    socketio.emit("latlngarrofobj", arr)


def createDBDate(dt):
    #parse the date in a format that can be queried
    delimiter = '-'
    separator = 'T'
    timeSeparator = ':'
    dateBuilder = str(dt.year) + delimiter
    dateBuilder += str(dt.month) + delimiter
    dateBuilder += str(dt.day) + separator
    dateBuilder += str(dt.hour) + timeSeparator
    dateBuilder += str(dt.minute) + timeSeparator
    dateBuilder += str(dt.second)
    return dateBuilder



# retrieve data from mongo db
def getIncidentData(start, end):
    print "-> getIncidentData()\n"
    client = MongoClient(url_mongo_fire_depart)
    db = client["fire_department"]["simple_incidents"]

    ############################
    ############################
    ############################
    # REMOVE BEFORE CHECK IN
    # print "Debug: remove before check in. Start and end dates modified"
    # start = datetime.datetime(2011, 1, 1)
    # end = datetime.datetime(2018, 1, 1)
    ############################
    ############################
    ############################


    items = db.find({'alarmDateTime':{'$gte':start,'$lt':end}}).limit(500)
    #items = db.find({'alarmDateTime': {'$lt': datetime.datetime.now()}})
    print "Items that match date : {}".format(items.count())

    #for counterBatch in range(totalBatches):
    for item in items:
        try:
            time = item['alarmDateTime']
            if not isinstance(time, datetime.date):
                time = datetime.datetime.strptime(time, '%Y,%m,%d,%H,%M,%S,%f')

            # if (start <= time <= end):
            dictIn = {}
            dictIn['_id'] = str(item['_id'])
            dictIn['incidentNumber'] = item['incidentNumber']
            dictIn['_lat'] = item['latitude']
            dictIn['_lng'] = item['longitude']
            dictIn['alarmDate'] = str(item['alarmDateTime'])
            dictIn['fireZone'] = item['fireZone']
            dictIn['emdCardNumber'] = item['emdCardNumber']

            dictIn['city'] = item['city'] if ('city' in item) else "na"
            dictIn['county'] = item['county'] if ('county' in item) else "na"
            dictIn['streetNumber'] = item['streetNumber'] if ('streetNumber' in item) else "na"
            dictIn['streetPrefix'] = item['streetPrefix'] if ('streetPrefix' in item) else "na"
            dictIn['streetName'] = item['streetName'] if ('streetName' in item) else "na"
            dictIn['streetType'] = item['streetType'] if ('streetType' in item) else "na"
            dictIn['streetSuffix'] = item['streetSuffix'] if ('streetSuffix' in item) else "na"
            dictIn['apartment'] = item['apartment'] if ('apartment' in item) else "na"
            dictIn['zipCode'] = ((item['zipCode']).split('.'))[0] if ('zipCode' in item) else "na"

            if 'respondingVehicles' in item:
                tmp = item['respondingVehicles']
                allIDs = ""
                for i in tmp: # i is a dict
                    if 'dispatchDateTime' not in i:
                        i['dispatchDateTime'] = "na"
                    if 'arrivalDateTime' not in i:
                        i['arrivalDateTime'] = "na"
                    if 'clearDateTime' not in i:
                        i['clearDateTime'] = "na"
                    allIDs += i['apparatusID'] + "| "

                dictIn['allIDs'] = allIDs
                dictIn['respondingVehicles'] = tmp
            else:
                dictIn['respondingVehicles'] = "na"
                dictIn['allIDs'] = "na"

            # batchIncident.append(dictIn)
            socketio.emit("incident_data", dictIn)

        except:
            continue

depot_cache = [];
# Retrieve fire depots location and what vehicles live there
def getDepotsData():
    depot = [];
    global depot_cache
    print "-> getDepotsData()\n"

    client = MongoClient(url_mongo_fire_depart)
    db = client["fire_department"]["depot_details"]
    pipeline = [{'$group': {'_id':"$stationLocation","vehicle":{'$addToSet':'$apparatusID'}}}]
    items = list(db.aggregate(pipeline))
    vehiclesInDepot = [deepcopy([]) for x in range(len(items))]
    for counter in range(len(items)):
        if items[counter]['vehicle'][0] == 'sample':
            vehiclesInDepot[counter] = items[counter]['vehicle']
            depot_cache.append(items[counter]['_id'])


    # count = 0
    # for item in items:
    #     print "Item"
    #     ##replaced in query
    #     # if (item['apparatusID']=="sample"):
    #     #     continue
    #
    #     #if not depot_cache:
    #     stationArr = item['stationLocation']
    #     if stationArr[0]:
    #         if stationArr[0] not in depot:
    #             depot.append(stationArr[0])
    #         indexOfthis = depot.index(stationArr[0])
    #         # print stationArr
    #         # print indexOfthis
    #         if not vehiclesInDepot[indexOfthis]:
    #             vehiclesInDepot[indexOfthis] = [];
    #         vehiclesInDepot[indexOfthis].append(item['apparatusID'])

    depot_cache = depot
    socketio.emit("depots_data", {'depotLocation': depot_cache, 'depotInterior': vehiclesInDepot})



# retrieve data from csv file

def getCrimeData(start, end, str):
    print(" --> get Crime Markers csv")
    arr = []
    i=0
    #with open('/Users/wangshibao/SummerProjects/analytics-dashboard/myapp/CrimeHistory.csv','rU') as f:
    with open(os.getcwd()+'/myapp/CrimeHistory.csv','rU') as f:
        reader = csv.reader(f)
        header = reader.next()
        for row in reader:
            date = row[1]
            date_time = datetime.datetime.strptime(date, "%Y%m%d %H:%M")
            if (start <= date_time <= end):
                # print i
                # i += 1

                obj = {}
                for j in range(len(header)):
                    obj[header[j]] = row[j]
                arr.append(obj)
    if (str == "heat"):
        socketio.emit("crime_heat", arr)
    else: 
        if (arr != []):
            print "-----> arr is NOT empty"
            socketio.emit("crime_data", arr)
        else:
            print "-----> arr is empty"
            socketio.emit("crime_none")
    




# 
# Incidents Predictions
# 
import numpy as np
from random import randint
import os
import pickle
from pyproj import Proj

p1 = Proj(
    '+proj=lcc +lat_1=36.41666666666666 +lat_2=35.25 +lat_0=34.33333333333334 +lon_0=-86 +x_0=600000 +y_0=0 +ellps=GRS80 +datum=NAD83 +no_defs')


def getPredictions(type):
    #type can either be fire or crime
    filepath = os.getcwd() + "/myapp/"
    if type == "fire":
        if os.path.isfile(filepath + 'meanTraffic.txt'):
            exists = True
            print"Found mean file"
            with open(filepath+'meanTraffic.txt','r+') as f:
                mean = float(f.readlines()[0])
        else:
            print"Did not find mean file"
            mean = 200

        if os.path.isfile(filepath + 'predictionsFireDashboard.pickle'):
            print"Found fire prediction file"
            with open(filepath+'predictionsFireDashboard.pickle','r+') as f:
                predictionsOutput = pickle.load(f)

            #sample poisson
            numSample = np.random.poisson(mean, 1)

            #return sampled values
            output = []
            for sampleCounter in range(0,numSample):
                indSample = randint(0,len(predictionsOutput))
                coordinates = list(p1(predictionsOutput[indSample][0],predictionsOutput[indSample][1],inverse=True))
                coordinates.append(predictionsOutput[indSample][2])
                output.append(coordinates)
            socketio.emit("predictions_data", output)

        else:
            print"Did not find prediction file"
            socketio.emit("predictions_none", [])
    elif type == "crime":
        if os.path.isfile(filepath + "crimePredicted.xls"):
            predictedWorkbook = xlrd.open_workbook(filepath + "crimePredicted.xls")
            predictionWorksheet = predictedWorkbook.sheet_by_index(0)
            # get total rows:
            rows = predictionWorksheet.nrows - 1
            try:
                columns = len(predictionWorksheet.row(0))
            except ValueError:
                return []
            numToSample = 300
            numSampled = 0
            output = []
            while numSampled < numToSample:
                index = randint(1, rows)
                row = []
                for counterCol in range(columns):
                    try:
                        row.append(predictionWorksheet.cell_value(index, counterCol))
                    except IndexError:
                        print "Issue with row {} and column {}".format(index,counterCol)
                output.append(row)
                numSampled+=1
            print len(output)
            socketio.emit("predictions_data_crime", output)
        else:
            print"Did not find prediction file"
            socketio.emit("predictions_none", [])

def getBestDepotPos():
    print "--> get best bestAssignment of depots"
    filepath = os.getcwd() + "/myapp/"

    arr = []
    dicOfDepot = {}
    with open(filepath + "bestAssignment") as f:
        contents = pickle.load(f)
        for i in range(len(contents[3])):
            if contents[3][i] > 0:
                arr.append(i)
        for i in range(len(contents[2])):
            if contents[2][i][0] is not 0:
                if  contents[2][i][0] not in dicOfDepot:
                    dicOfDepot[contents[2][i][0]] = []
                dicOfDepot[contents[2][i][0]].append(i)
    # print dicOfDepot

    
    with open(filepath + "latLongGrids.pickle") as f:
        contents = pickle.load(f)
        arrOfDict = []
        for key in dicOfDepot:
            dic = {"depotKey": key, "depotLatLng": "", "inChargeOf": []}
            dic["depotLatLng"] = contents[key]
            for grid in dicOfDepot[key]:
                dic["inChargeOf"].append(contents[grid])
            arrOfDict.append(dic)
        socketio.emit("bestAreaInCharge", arrOfDict)


'''
# 
# t-hub dashboard
# 
from myapp import app
from flask import Flask, render_template, session, request
from flask_socketio import SocketIO
from flask_socketio import send, emit
from myapp import socketio
from myapp import dashboard
import time
import datetime
import json
import requests
import pytz

# @app.route('/')
# @app.route('/index')
# def index():
#     return render_template("home.html")

def time_change_simulation():
    url = 'http://127.0.0.1:8000/timestamp'
    r = requests.get( url )
    data = r.json()
    if data:        
        current_timestamp = data['timestamp']
        print "-current_timestamp", current_timestamp
        date_time = datetime.datetime.fromtimestamp(current_timestamp, pytz.timezone('America/Chicago'))
        socketio.emit('simulated_time', {'timestamp': date_time.strftime("%Y-%m-%d %H:%M")})

# @socketio.on('connect')
# def socketio_connect():
    # print "socketio_connect"
    # time_change_simulation()
    # data_segments = []
    # with open('myapp/cached_shared_segments.json') as data_file:
    #     data_segments = json.load(data_file)
    # print "data_segments", len(data_segments)
    # socketio.emit('draw_all_route_segments', {'data': data_segments})

@socketio.on('get_map_routes')
def socketio_get_map_routes(message):
    route_segment = dashboard.route_segment()
    selected = message.get('selected')
    if selected==0:
        data_segments = []
        with open('myapp/cached_shared_segments.json') as data_file:
            data_segments = json.load(data_file)
        print "data_segments", len(data_segments)
        socketio.emit('draw_all_route_segments', {'data': data_segments})
    else:
        data_segments = []
        with open('myapp/routes_coors.json') as data_file:
            data_segments = json.load(data_file)
        performance = []
        if selected==1:
            with open('myapp/original_performance_may.json') as data_file:
                performance = json.load(data_file)
        elif selected==2:
            with open('myapp/optimized_performance.json') as data_file:
                performance = json.load(data_file)
        elif selected==3:
            with open('myapp/original_performance_june.json') as data_file:
                performance = json.load(data_file)
        elif selected==4:
            with open('myapp/optimized_performance_june.json') as data_file:
                performance = json.load(data_file)
        socketio.emit('response_map_routes', {'data': data_segments, 'performance': performance})


@socketio.on('get_vehicle_location_for_trip')
def socketio_get_vehicle_location_for_trip(message):
    print "socketio_get_vehicle_location_for_trip"
    trip_id = message.get('trip_id')
    url = 'http://127.0.0.1:8000/vehicle/'+str(trip_id)
    r = requests.get( url )
    data = r.json()
    # route_segment = dashboard.route_segment()
    # data = route_segment.get_vehicle_location_for_trip(trip_id)
    print 'vehicle location', data
    if data[0] != -1:
        socketio.emit('vehicle_location_for_trip', {'coordinate': data})
    print data

@socketio.on('get_predictions_for_trip')
def socketio_get_predictions_for_trip(message):
    print "socketio_get_predictions_for_trip"
    trip_id = message.get('trip_id')
    route_segment = dashboard.route_segment()
    data = route_segment.get_predictions_for_trip(trip_id)
    segments = route_segment.get_segments_for_tripid(trip_id)
    print "trip_id", trip_id
    print data['coordinates']
    socketio.emit('predictions_for_trip', {'prediction': data['prediction'], 'coordinates': data['coordinates'], 'segments': segments})

@socketio.on('get_all_routeid')
def socketio_get_all_routeid():
    route_segment = dashboard.route_segment()
    data = route_segment.get_all_routeid()
    # print "dfasdfasdf:", data
    socketio.emit('all_routeid', {'data': data})

@socketio.on('get_directions_for_routeid')
def socketio_get_directions_for_routeid(message):
    route_segment = dashboard.route_segment()
    route_id = message.get('route_id')
    data = route_segment.get_all_headsigns(route_id)
    print data
    socketio.emit('directions_for_routeid', {'data': data})

@socketio.on('get_trips_for_routeid_direction')
def socketio_get_trips_for_routeid_direction(message):
    print 'get_trips_for_routeid_direction'
    route_segment = dashboard.route_segment()
    route_id = message.get('route_id')
    trip_headsign = message.get('trip_headsign')
    data = route_segment.get_trips(route_id, trip_headsign)
    socketio.emit('trips_for_routeid_direction', {'tripids': data[0], 'departuretimes': data[1]})
'''

