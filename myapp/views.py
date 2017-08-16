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

@socketio.on('connect')
def socketio_connet():
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
    if (delta > 30):
        getIncidentHeat(start, end)
        print "======================"
        socketio.emit("heat-success")
    else:
        getIncidentData(start, end)
        getVehiclesData(start, end)
        getBurglaryData(start, end)
        socketio.emit("markers-success")
    
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



