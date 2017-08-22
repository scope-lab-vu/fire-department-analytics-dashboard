from myapp import app
from flask import Flask, render_template, session, request
from flask_socketio import SocketIO
from flask_socketio import send, emit
from myapp import socketio
from pymongo import MongoClient
import datetime
import json
import requests
import pytz
import csv

@app.route('/')
@app.route('/index')
def index():
	return render_template("incidentsPlot.html")

@app.route('/transitPlot')
def transitPlot():
    return render_template('transitPlot.html')

@socketio.on('connect')
def socketio_connet():

    # start: t-hub dashboard
    print "socketio_connect"
    time_change_simulation()
    data_segments = []
    with open('myapp/cached_shared_segments.json') as data_file:
        data_segments = json.load(data_file)
    print "data_segments", len(data_segments)
    socketio.emit('draw_all_route_segments', {'data': data_segments})
    # end: t-hub dashboard

    print "-> socketio_connect()\n"
    socketio.emit("success")

@socketio.on('get_date')
def getDate (msg):
    # findMinMax()
    print "-> got date, start = " + msg['start'] +", end = "+ msg['end']
    start = datetime.datetime.strptime(msg['start'], "%Y-%m-%d %H %M")
    end = datetime.datetime.strptime(msg['end'], "%Y-%m-%d %H %M")
    delta = end - start
    delta = delta.days
    if (delta > 14):
        getIncidentHeat(start, end)
        print "======================"
        socketio.emit("heat-success")
    else:
        getIncidentData(start, end)
        getVehiclesData(start, end)
        getBurglaryData(start, end)
        socketio.emit("markers-success")
    
@socketio.on('predictNOW')
def getPredict():
    print "-----> get predict"
    getPredictions()
'''
max time is;;;;;;;;;;;;;;;;;
2016-02-05 13:12:00
min time is;;;;;;;;;;;;;;;;;
2014-02-20 10:24:00
'''

# def findMinMax():
#     client = MongoClient("mongodb://zilinwang:Mongo0987654321@129.59.107.60:27017/fire_department")
#     db = client["fire_department"]["simple__incident"]
#     items = db.find()
#     pretime = (items[0])['alarmDateTime']
#     print pretime
#     maxT = pretime
#     minT = pretime
#     for item in items:
#         if (type(item['alarmDateTime'])!=datetime.datetime):
#             break
#         time = item['alarmDateTime']
#         if (time>maxT):
#             maxT = time
        
#         if (time<minT):
#             minT = time
#     print "max time is;;;;;;;;;;;;;;;;;"
#     print maxT
#     print "min time is;;;;;;;;;;;;;;;;;"
#     print minT

# retrieve a simplified list of information for just heat map layer
def getIncidentHeat(start, end):
    print "-> getIncident Heat()\n"
    client = MongoClient("mongodb://zilinwang:Mongo0987654321@129.59.107.60:27017/fire_department")
    db = client["fire_department"]["simple__incident"]
    items = db.find()
    arr = []

    count = 0
    for item in items:
        time = item['alarmDateTime']
        if (item['incidentNumber']=="sample"):
            break
        if (start <= time <= end):
            count+=1
            print count
            dictIn = {}
            dictIn['lat'] = item['latitude']
            dictIn['lng'] = item['longitude']
            dictIn['emdCardNumber'] = item['emdCardNumber']
            arr.append(dictIn)
    socketio.emit("latlngarrofobj", arr)

# retrieve data from mongo db
def getIncidentData(start, end):
    
    print "-> getIncidentData()\n"
    '''
    with open('myapp/static/get.json') as data_file:
        print "------> data"
        print data_file
        socketio.emit("accident_data", {'data':json.load(data_file)})
    '''
    client = MongoClient("mongodb://zilinwang:Mongo0987654321@129.59.107.60:27017/fire_department")
    db = client["fire_department"]["simple__incident"]
    items = db.find()
    types = []

    count = 0
    for item in items:
        time = item['alarmDateTime']
        if (item['incidentNumber']=="sample"):
            break
        if (start <= time <= end):
            count+=1
            print count
            print time

            dictIn = {}
            dictIn['_id'] = str(item['_id'])
            dictIn['incidentNumber'] = item['incidentNumber']
            dictIn['_lat'] = item['latitude']
            dictIn['_lng'] = item['longitude']
            dictIn['alarmDate'] = str(item['alarmDateTime'])
            dictIn['fireZone'] = item['fireZone']
            if 'city' in item:
                dictIn['city'] = item['city']
            else:
                dictIn['city'] = "na"
            if 'county' in item:
                dictIn['county'] = item['county']
            else:
                dictIn['county'] = "na"
            dictIn['emdCardNumber'] = item['emdCardNumber']
            if 'streetNumber' in item:
                dictIn['streetNumber'] = item['streetNumber']
            else: 
                dictIn['streetNumber'] = "na"

            if 'streetPrefix' in item:
                dictIn['streetPrefix'] = item['streetPrefix']
            else: 
                dictIn['streetPrefix'] = "na"

            if 'streetName' in item:
                dictIn['streetName'] = item['streetName']
            else: 
                dictIn['streetName'] = "na"

            if 'streetType' in item:
                dictIn['streetType'] = item['streetType']
            else: 
                dictIn['streetType'] = "na"

            if 'streetSuffix' in item:
                dictIn['streetSuffix'] = item['streetSuffix']
            else: 
                dictIn['streetSuffix'] = "na"

            if 'apartment' in item:
                dictIn['apartment'] = item['apartment']
            else: 
                dictIn['apartment'] = "na"

            
            socketio.emit("incident_data", dictIn)

depot_cache = [];
# Retrieve fire vehicles location
def getVehiclesData(start, end):
    depot = [];
    vehiclesInDepot = [None]*40;
    global depot_cache
    print "-> getVehiclesData()\n"

    client = MongoClient("mongodb://zilinwang:Mongo0987654321@129.59.107.60:27017/fire_department")
    db = client["fire_department"]["response_vehicle"]
    items = db.find()
    count = 0
    for item in items:
        if (item['apparatusID']=="sample"):
            break
        
        if not depot_cache: 
            stationArr = item['stationLocation']
            if stationArr[0]:
                if stationArr[0] not in depot:
                    depot.append(stationArr[0])
                indexOfthis = depot.index(stationArr[0])
                print stationArr
                print indexOfthis
                if not vehiclesInDepot[indexOfthis]:
                    vehiclesInDepot[indexOfthis] = [];
                vehiclesInDepot[indexOfthis].append(item['apparatusID'])

        visited = False
        dictOut = {}
        arr = []
        locations = item['locations']
        for location in locations:
            if (start <= location['timestamp'] <= end):
                count +=1
                print count
                print location['timestamp']

                if not visited:
                    dictOut['_id'] = str(item['_id'])
                    if 'apparatusID' in item:
                        dictOut['apparatusID'] = item['apparatusID']
                    else: 
                        dictOut['apparatusID'] = "na"
                    visited = True
                    if 'stationLocation' in item:
                        dictOut['stationLocation'] = item['stationLocation']
                    else: 
                        dictOut['stationLocation'] = "na"

                dictIn = {}
                dictIn['_lat'] = location['latitude']
                dictIn['_lng'] = location['longitude']
                dictIn['time'] = str(location['timestamp'])
                arr.append(dictIn)
        if visited:
            dictOut['locations'] = arr
            socketio.emit("vehicle_data", dictOut)
    depot_cache = depot
    socketio.emit("depots_data", {'depotLocation': depot_cache, 'depotInterior': vehiclesInDepot})



# retrieve data from csv file
def getBurglaryData(start, end):
    print(" --> get Burglary")
    arr = []
    i=0
    with open('/Users/wangshibao/SummerProjects/dashboard-socket/myapp/burglarySnapshot.csv','rU') as f:
        reader = csv.reader(f)
        header = (reader.next())[0].split("\t")

        for item in reader:
            print i
            obj = {}
            content = item[0].split("\t")
            for j in range(len(header)):
                obj[header[j]] = content[j]

            date = obj['_date']
            date_time = date[:4] +"/"+date[4:6] +"/"+date[6:8]+" "+obj['_time']
            date_time = datetime.datetime.strptime(date_time, "%Y/%m/%d %H:%M")
            i +=1

            if (start <= date_time <= end): 
                obj['AlarmDateTime'] = str(date_time)
                arr.append(obj)
    if (arr != []):
        print "-----> arr is NOT empty"
        socketio.emit("burglary_data", arr)
    else:
        print "-----> arr is empty"
        socketio.emit("burglary_none")

import numpy as np
from random import randint
import os
import pickle
from pyproj import Proj

p1 = Proj(
    '+proj=lcc +lat_1=36.41666666666666 +lat_2=35.25 +lat_0=34.33333333333334 +lon_0=-86 +x_0=600000 +y_0=0 +ellps=GRS80 +datum=NAD83 +no_defs')


def getPredictions(type="fire"):
    #type can either be fire or crime
    if type == "fire":
        filepath = os.getcwd() + "/myapp/"
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