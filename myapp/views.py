from myapp import app
from flask import Flask, render_template, session, request
from flask_socketio import SocketIO
from flask_socketio import send, emit
from myapp import socketio
import time
import datetime
import json
import requests
import pytz

@app.route('/')
@app.route('/index')
def index():
	return render_template("incidentsPlot.html")

@socketio.on('connect')
def socketio_connet():
    print "-> socketio_connect()"
    socketio.emit("success")

global cache_dictOut
cache_dictOut = None

@socketio.on('get_data')
def getIncidentData():
    global cache_dictOut

    print "-> getIncidentData()"

    '''
    with open('myapp/static/get.json') as data_file:
        print "------> data"
        print data_file
        socketio.emit("accident_data", {'data':json.load(data_file)})
    '''
    with open('dashboard.json') as data_file:
        dash = json.load(data_file)
    if not cache_dictOut:
        client = MongoClient("mongodb://zilinwang:Mongo0987654321@129.59.107.60:27017/fire_department")
        db = client["fire_department"]["incident"]
        items = db.find()
        dictOut = {}
        dictArr = []
        dictOut['incidents'] = dictArr

        count = 0
        for item in items:
            count+=1
            print count
            if count>100:
                break
            dictIn = {}
            dictIn['_id'] = str(item['_id'])
            dictIn['incidentNumber'] = item['incidentNumber']
            dictIn['_lat'] = item['latitude']
            dictIn['_lng'] = item['longitude']
            dictIn['year'] = item['year']
            dictIn['month'] = item['month']
            dictIn['day'] = item['calendarDay']
            dictIn['alarmDate'] = item['alarmDateTime']
            dictIn['closestStation'] = item['closestStation']
            dictIn['severity'] = item['severity']
            dictIn['streetNumber'] = item['streetNumber']
            dictIn['streetPrefix'] = item['streetPrefix']
            dictIn['streetName'] = item['streetName']
            dictIn['streetType'] = item['streetType']
            dictIn['streetSuffix'] = item['streetSuffix']
            dictIn['apartment'] = item['apartment']
            dictIn['city'] = item['city']
            dictIn['county'] = item['county']
            dictIn['state'] = item['state']
            dictIn['zipCode'] = item['zipCode']

            dictArr.append(dictIn)
        cache_dictOut = dictOut

     # jsonify(dictOut)
    socketio.emit("accident_data", {'data': cache_dictOut})


