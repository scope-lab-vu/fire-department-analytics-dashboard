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
    print "-> got date, start = " + msg['start'] +", end = "+ msg['end']
    start = datetime.datetime.strptime(msg['start'], "%Y-%m-%d %H %M")
    end = datetime.datetime.strptime(msg['end'], "%Y-%m-%d %H %M")
    getIncidentData(start, end)
    getBurglaryData(start, end)
    socketio.emit("markers-success")

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
    dictOut = {}
    dictArr = []
    dictOut['incidents'] = dictArr

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
            dictIn['city'] = item['city']
            dictIn['county'] = item['county']
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

            dictArr.append(dictIn)
        

    socketio.emit("incident_data", dictOut)

# retrieve data from csv file
def getBurglaryData(start, end):
    arr = []
    with open('/Users/wangshibao/SummerProjects/dashboard(socket)/myapp/burglarySnapshot.csv','rU') as f:
        reader = csv.reader(f)
        header = (reader.next())[0].split("\t")
        for item in reader:
            obj = {}
            content = item[0].split("\t")
            for j in range(len(header)):
                obj[header[j]] = content[j]

            date = obj['_date']
            date_time = date[:4] +"/"+date[4:6] +"/"+date[6:8]+" "+obj['_time']
            date_time = datetime.datetime.strptime(date_time, "%Y/%m/%d %H:%M")

            if (start <= date_time <= end): 
                obj['AlarmDateTime'] = str(date_time)
                arr.append(obj)

    socketio.emit("burglary_data", arr)



