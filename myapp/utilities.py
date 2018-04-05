from __future__ import division
#python file to store generic methods
from math import floor
import fiona
import ConfigParser
import numpy as np
import os
from pymongo import MongoClient
from myconfig import MONGODB_HOST, MONGODB_PORT
from datetime import datetime
from datetime import timedelta
from pyproj import Proj
from copy import deepcopy
import operator
from operator import itemgetter
import numpy as np
from math import ceil

url_mongo_fire_depart = "%s:%d/fire_department" % (MONGODB_HOST, MONGODB_PORT)
p1 = Proj('+proj=lcc +lat_1=36.41666666666666 +lat_2=35.25 +lat_0=34.33333333333334 +lon_0=-86 +x_0=600000 +y_0=0 +ellps=GRS80 +datum=NAD83 +no_defs')

gridSize = 1609.34
mileToMeter = 1609.34

Config = ConfigParser.ConfigParser()
Config.read("params.conf")

def ConfigSectionMap(Config, section):
    dict1 = {}
    options = Config.options(section)
    for option in options:
        try:
            dict1[option] = Config.get(section, option)
            if dict1[option] == -1:
                DebugPrint("skip: %s" % option)
        except:
            print("exception on %s!" % option)
            dict1[option] = None
    return dict1

class utilities:
    def __init__(self):
        self.grids, self.xLow, self.yLow = self.getGrid()
        self.getData()
        self.calculateGridWiseIncidentArrival()
        self.getNumberOfServersPerDepot()
        self.calculateGridWiseArrivalLambda()
        self.calculateDepotAssignemnts()
        self.createIncidentChains()

    def createIncidentChains(self):
        #create chains 1 months long
        self.times = [] #what times do incidents happen
        for grid in range(900):
            t=0
            if grid in self.gridWiseLambda.keys():
                while t<30*24*3600:
                    sample = ceil(np.random.exponential(1/self.gridWiseLambda[grid]))
                    if sample > 3*30*24*60*60:
                        break
                    else:
                        self.times.append([sample,grid])
                        t+=sample
        self.times = sorted(self.times,key=itemgetter(0))
        print "generated static samples"


    def getGrid(self):
        shpFilePath =  os.getcwd() + "/myapp/data/StatePlane_Income_Pop_House.shp"
        fshp = fiona.open(shpFilePath)
        bounds = fshp.bounds
        print(bounds)
        xLow = bounds[0]
        xHigh = bounds[2]
        yLow = bounds[1]
        yHigh = bounds[3]
        self.reverseCoordinates = {}

        numGridsX = int(floor((xHigh - xLow)/float(gridSize)))
        numGridsY = int(floor((yHigh - yLow)/float(gridSize)))
        grids = np.zeros((numGridsX,numGridsY),dtype=object)#so that the default type is not float. we will store lists
        for counterY in range(numGridsY):
            for counterX in range(numGridsX):
                lowerLeftCoords = (xLow+counterX*gridSize,yLow+counterY*gridSize)
                if counterX == (numGridsX-1): # reached the end on x axis
                    xCoord = xHigh
                else:
                    xCoord = xLow+counterX*gridSize+gridSize
                if counterY == (numGridsY-1): # reached the end on y axis
                    yCoord = yHigh
                else:
                    yCoord = yLow+counterY*gridSize+gridSize

                upperRightCoords = (xCoord,yCoord)
                grids[counterX,counterY] = [np.array(lowerLeftCoords),np.array(upperRightCoords)]
                counterGrid = counterY*numGridsX + counterX
                self.reverseCoordinates[counterGrid] = [([np.array(lowerLeftCoords),np.array(upperRightCoords)][0][0] + [np.array(lowerLeftCoords),np.array(upperRightCoords)][1][0])/2,
                                                        ([np.array(lowerLeftCoords), np.array(upperRightCoords)][0][1] +
                                                         [np.array(lowerLeftCoords), np.array(upperRightCoords)][1][
                                                             1]) / 2]

        return grids, xLow, yLow

    def getGridForCoordinate(self,coordinate,xLow,yLow):
        gridSize = 1609.34#1 mile to meter
        x = coordinate[0]
        y = coordinate[1]
        gridX = floor((x-xLow)/float(gridSize))
        gridY = floor((y-yLow)/float(gridSize))
        gridNum = gridY * len(self.grids) + gridX
        return gridNum

    def getGridNumForCoordinate(self, coordinate, xLow, yLow):
        gridSize = 1609.34  # 1 mile to meter
        x = coordinate[0]
        y = coordinate[1]
        gridX = floor((x - xLow) / float(gridSize))
        gridY = floor((y - yLow) / float(gridSize))
        return gridX, gridY


    def getCoordinateForGrid(self):
        pass

    def getData(self):
        client = MongoClient(url_mongo_fire_depart)
        db = client["fire_department"]["simple_incidents"]
        items = db.find({'served': {'$ne': 'true'}})
        # items = db.find({'alarmDateTime': {'$lt': datetime.datetime.now()}})
        print "Items that match date : {}".format(items.count())
        self.gridWiseIncidents = {}

        arr = []
        # for counterBatch in range(totalBatches):
        for item in items:
            try:
                time = item['alarmDateTime']
                lat = item['latitude']
                long = item['longitude']
                coordinates = list(p1(long,lat))
                grid = int(self.getGridForCoordinate([coordinates[0],coordinates[1]],self.xLow,self.yLow))
                if not isinstance(time, datetime):
                    time = datetime.datetime.strptime(time, '%Y,%m,%d,%H,%M,%S,%f')
                if grid not in self.gridWiseIncidents.keys():
                    self.gridWiseIncidents[grid] = [time]
                else:
                    self.gridWiseIncidents[grid].append(time)
            except:
                continue

    def calculateGridWiseIncidentArrival(self):
        self.gridWiseInterArrival = {}
        for grid,interArrivals in self.gridWiseIncidents.iteritems():
            interArrivals=sorted(interArrivals)
            if len(interArrivals) == 0:
                self.gridWiseInterArrival = []
            if len(interArrivals) == 1:
                self.gridWiseInterArrival[grid] = [(interArrivals[0] - datetime(2014,1,1)).total_seconds()]
            else:
                for counterIncident in range(len(interArrivals)):
                    if counterIncident == 0:
                        self.gridWiseInterArrival[grid] = [(interArrivals[counterIncident] - datetime(2014,1,1)).total_seconds()]
                    else:
                        self.gridWiseInterArrival[grid].append((interArrivals[counterIncident] - interArrivals[counterIncident-1]).total_seconds())



    def factorial(self,n):
        temp = 1
        for i in range(1,n+1):
            temp*=i
        return temp

    def isWaitTimeViolated(self,depot,tempArrivalRate):
        c = self.vehiclesInDepot[depot] #number of servers in the depot
        mu = 1/(30*60) #an incident takes 30 minutes to service
        lambda_param = tempArrivalRate
        limit = 1

        #define rho = lambda/c * mu
        rho = lambda_param/(c*mu)

        t1 = self.factorial(c)/((c*rho)**c)

        t2 = 0
        for k in range(0,c):
            t2 += ((c*rho)**k)/self.factorial(k)


        C_denominator = 1 + (1 - rho)*t1*t2
        C = 1/C_denominator

        responseTime = C/(c*mu - lambda_param)
        if responseTime > limit:
            return True
        else:
            return False


    def getNumberOfServersPerDepot(self):
        depot_cache = []
        print "-> getDepotsData()\n"

        client = MongoClient(url_mongo_fire_depart)
        db = client["fire_department"]["depot_details"]
        pipeline = [{'$group': {'_id': "$stationLocation", "vehicle": {'$addToSet': '$apparatusID'}}}]
        items = list(db.aggregate(pipeline))
        self.vehiclesInDepot = {}
        for counter in range(len(items)):
            if items[counter]['vehicle'][0] == 'sample' or items[counter]['_id'][0] is None or items[counter][
                'vehicle'] == []:
                continue
            coordX, coordY = p1(items[counter]['_id'][0][1],items[counter]['_id'][0][0])
            depotGrid = int(self.getGridForCoordinate([coordX,coordY],self.xLow,self.yLow))
            if depotGrid in self.vehiclesInDepot.keys():
                self.vehiclesInDepot[depotGrid] += len(items[counter]['vehicle'])
            else:
                self.vehiclesInDepot[depotGrid] = len(items[counter]['vehicle'])

        print "Calculated Servers per Depot"

    def dist(self,i, j):
        try:
            coord1 = self.reverseCoordinates[i]
            coord2 = self.reverseCoordinates[j]
            d = np.sqrt((coord1[0] - coord2[0]) ** 2 + (coord1[1] - coord2[1]) ** 2)
            return d / 1609.34  # return in miles
        except TypeError:
            raise Exception("Error with calculating distance between {} and {}".format(i, j))

    def calculateDepotAssignemnts(self):
        # depots and vehicle distribution is assumed fixed. This method only optimizes assignments
        gridWiseArrival = self.calculateGridWiseIncidentArrival()
        # sort grid wise arrival
        depotLocations = self.vehiclesInDepot.keys()
        sortedGrids = sorted(self.gridWiseLambda.items(), key=operator.itemgetter(1), reverse=True)#grids that are unassigned to depots
        grids = [x[0] for x in sortedGrids]#only take the grid nums and leave the rates --> This is still sorted
        activeGrids = {key: True for key in grids} #dict check active grids
        self.depotAssignedLambda = {key:0 for key in grids} #current lambda for the depot - sum of grid lambdas it is responsible for
        self.gridAssignment = {}#grid --> assigned depot mapping


        assignmentOver = False

        for grid in grids:
            if assignmentOver:
                break
            candidates = []
            if activeGrids[grid]:
                for depotCandidate in depotLocations:
                    if depotCandidate > 900 or grid > 900:
                        continue
                    dist = self.dist(grid,depotCandidate)
                    depotArrivalTemp = self.depotAssignedLambda[depotCandidate] + self.gridWiseLambda[grid]
                    if not self.isWaitTimeViolated(depotCandidate,depotArrivalTemp):
                        candidates.append([depotCandidate,dist])

                if len(candidates) > 0:
                    bestDepot = sorted(candidates,key=itemgetter(1))[0][0]
                    self.gridAssignment[grid] = bestDepot
                    self.depotAssignedLambda[bestDepot] += self.gridWiseLambda[grid]

        print "Grid to Depot Assignment complete"

    def calculateGridWiseArrivalLambda(self):
        print "calculating grid wise lambda"
        self.gridWiseLambda = {}
        for grid, interArrivalTimes in self.gridWiseInterArrival.iteritems():
            lambdaTemp = sum(interArrivalTimes)/len(interArrivalTimes)
            self.gridWiseLambda[grid] = 1/lambdaTemp

        print "Inter-Arrival Rates Calculated"
