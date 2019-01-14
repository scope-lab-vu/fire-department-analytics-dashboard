#!/opt/rh/rh-python36/root/usr/bin/python3

import os, sys
from stat import *
import pymongo
import xml.etree.ElementTree as ET
import datetime
import re
import json
from darksky import forecast
from datetime import datetime as dt
from dateutil import parser
import time 
import configparser
from pytz import timezone

central = timezone('US/Central')

CONFIG_FILE = "/home/vol-gpettet/analytics-dashboard/update_services/ingest_config.cfg"

config = configparser.ConfigParser()
config.read(CONFIG_FILE)

# TODO - need to move parameters to a single config files

# connect to mongo db collection
# for each file, check if not in file db. If not...
    # parse file
    # for each incident id:
        # check if it's in the db already. If not, add it. Otherwise just update fields:
        # update the fields or add them, depending. both for the resource and the high level incident attrs
            #add to db after checking that it has all the apprpeiare info
        # OR could just overwrite? Assume better info with new data? Or don't take time...
        # get weather once, only add that when it is created
    # add to file db 

client = pymongo.MongoClient()
db = client[str(config['INGEST']['db'])]
col_inc = db[str(config['INGEST']['collection'])]
#col_inc = db['test_geo_incidents'] # TODO - this is a test directory 

weather_counter = 0
darksky_api_key = str(config['INGEST']['darksky_api_key'])

counter = 0
num_pr = 0


def get_weather_icon(mlat, mlong, t):

    global weather_counter
    weather_counter += 1 
    #print('\tweather count: {}'.format(weather_counter))

    try:
        res = forecast(darksky_api_key, mlat, mlong, time=int(t.timestamp()))

        return res.currently.icon
    except AttributeError as err:
        print(err)
        print(mlat)
        print(mlong)
        print(int(t.timestamp()))


def process_file(filename):
    xml = ET.parse(filename)
    root = xml.getroot()
    
    # process each entry in file
    for event in root.findall('Table'):
        
        incident_number = event.find('event_number')
        if incident_number is not None:
            incident_number = incident_number.text


        latitude = event.find('latitude')
        if latitude is not None:
            latitude = float(latitude.text)


        longitude = event.find('longitude')
        if longitude is not None:
            longitude = float(longitude.text)


        emdCardNumber = event.find('incident_type_id')
        if emdCardNumber is not None:
            emdCardNumber = emdCardNumber.text


        alarmTime = event.find('AlarmTime')   
        if alarmTime is not None:
            alarmTime = alarmTime.text # TODO needs conversion to datetime


        fireZone = event.find('Beatname')
        if fireZone is not None:
            fireZone = fireZone.text


        vehicleId = event.find('Unit_ID')
        if vehicleId is not None:
            vehicleId = vehicleId.text

        arrivalTime = event.find('ArrivalDateTime') # TODO do I need to only put first one for the high level incident?
        if arrivalTime is not None:
            arrivalTime = arrivalTime.text

        clearTime = event.find('ClearDateTime')
        if clearTime is not None:
            clearTime = clearTime.text


        dispatchTime = event.find('DispatchDateTime')
        if dispatchTime is not None:
            dispatchTime = dispatchTime.text




        #weather = None # TODO - only do this once per incident!!!!
        location_geo_entry = {"type": "Point", "coordinates": [longitude, latitude]}


        #print(incident_number, latitude, fireZone, arrivalTime)

        # check if it's in the db

        if col_inc.count({'incidentNumber': str(incident_number)}) is 0: 
            # it is not in the db! 
            # get weather info
            # need time as epoch, and need the hour - need datetime object in correct time zone! 
            # alarmTimeMod = alarmTime.re()
            # alarmTimeDateTime = datetime.datetime.strptime(alarmTime, '%Y-%m-%dT%H:%M:%S')

            # TODO this is for testing!!!!
            parsedDate = None
            if alarmTime is not None:
                parsedDate = parser.parse(alarmTime)
                parsedDate = central.localize(parsedDate)
                weatherInfo = get_weather_icon(latitude, longitude, parsedDate)
            else:
                weatherInfo = "None"

            loc = dict()
            loc['type'] = "Point"
            loc['coordinates'] =  [float(longitude), float(latitude)]

            post = {
                'incidentNumber': str(incident_number),
                'latitude': float(latitude),
                'longitude': float(longitude),
                'emdCardNumber': str(emdCardNumber),
                'alarmDateTime': parsedDate,
                'arrivalDateTime': str(arrivalTime),
                'weather': str(weatherInfo),
                'location': loc,
                'fireZone': str(fireZone),
                'respondingVehicles': [{'dispatchDateTime': str(dispatchTime),
                                         'arrivalDateTime': str(arrivalTime),
                                         'clearDateTime': str(clearTime),
                                         'apparatusID': str(vehicleId)}]
            }

            #print(post)


            col_inc.insert_one(post)

        else: 
            # it is in the db! 
            # need to get the info 
            en_db_entry = col_inc.find_one({'incidentNumber': str(incident_number)})
            
            # update non vehicle feilds other than the weather (and maybe arrival time...need to check
            #en_db_entry = json.loads(curr_db_entry)

            if arrivalTime is not None: 
                parsed_arrival = central.localize(parser.parse(arrivalTime))

                db_arrival = en_db_entry['arrivalDateTime']

                if db_arrival is not None and db_arrival != 'None':
                    if type(db_arrival) is datetime.datetime:
                        db_arrival = central.localize(db_arrival)
                        if parsed_arrival < db_arrival:
                            en_db_entry['arrivalDateTime'] = parsed_arrival

                    else:
                        db_arrival = parser.parse(db_arrival)

                        if parsed_arrival < db_arrival:
                            en_db_entry['arrivalDateTime'] = parsed_arrival
                else: 
                    en_db_entry['arrivalDateTime'] = parsed_arrival
            



            
            # get current vehicle list 
            db_vehcile_list = en_db_entry['respondingVehicles']

            vehicle_in_list = False
            vehicle_pos = None
            for pos, entry in enumerate(db_vehcile_list):
                if str(entry['apparatusID']) == str(vehicleId):
                    vehicle_in_list = True
                    vehicle_pos = pos

            if vehicle_in_list: 
                if dispatchTime is not None: 
                    en_db_entry['respondingVehicles'][vehicle_pos]['dispatchDateTime'] = str(dispatchTime)
                if arrivalTime is not None: 
                    en_db_entry['respondingVehicles'][vehicle_pos]['arrivalDateTime'] = str(arrivalTime)
                if clearTime is not None: 
                    en_db_entry['respondingVehicles'][vehicle_pos]['clearDateTime'] = str(clearTime)
                if vehicleId is not None: 
                    en_db_entry['respondingVehicles'][vehicle_pos]['apparatusID'] = str(vehicleId)

            else: 
                en_db_entry['respondingVehicles'].append({'dispatchDateTime': str(dispatchTime),
                                         'arrivalDateTime': str(arrivalTime),
                                         'clearDateTime': str(clearTime),
                                         'apparatusID': str(vehicleId)})

            #print(en_db_entry)
            #new_json = json.dumps(en_db_entry)
            #print(new_json)


            test_res = col_inc.replace_one({'incidentNumber': str(incident_number)},
                en_db_entry)

            #print(test_res)
            #print(test_res.acknowledged)
            #print(test_res.matched_count, test_res.modified_count, test_res.raw_result)
            #exit(1)

        

def walktree(top, callback):
    '''recursively descend the directory tree rooted at top,
       calling the callback function for each regular file'''

    for f in os.listdir(top):
        pathname = os.path.join(top, f)
        mode = os.stat(pathname)[ST_MODE]
        if S_ISDIR(mode):
            # It's a directory, recurse into it
            #walktree(pathname, callback)
            pass
        elif S_ISREG(mode):
            # It's a file, call the callback function
            callback(pathname)
        else:
            # Unknown file type, print a message
            print('Skipping %s' % pathname)

def visitfile(file):

    # check if file was created in specified date range
    last_time = dt.fromtimestamp(os.path.getmtime(file))

    start_interested = dt(2019,1,11)
    end_interested = dt(2019,1,14)

    if start_interested < last_time < end_interested:
        #print('\tproessing!')
        global num_pr
        num_pr += 1
        print('\tprocessing' + str(num_pr))

        process_file(file)

    global counter
    counter += 1
    print(counter)
    print('---------------------------')

if __name__ == '__main__':

    walktree('/mnt/processed/', visitfile)



