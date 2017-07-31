import ConfigParser
import pickle
from datetime import timedelta
import numpy as np

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

def runHierarchicalSurvivalAnalysis():
    pass

def predict(self):
    global predCount
    totalPredictions = []
    # get Number of time periods
    lenTimePeriod = 4 * 3600
    numTimePeriods = int((self.predEndTime - self.predStartTime).total_seconds() / lenTimePeriod)
    # Iterate over each time period
    for counterTimePeriod in range(numTimePeriods):
        timePeriodOver = False
        tempStart = self.predStartTime + timedelta(seconds=3600 * 4 * counterTimePeriod)
        tempEnd = tempStart + timedelta(seconds=3600 * 4)
        # print("Predicting for Time Period with start time" + str(tempStart))
        # initilize last crime time for each grid
        tempDictLastCrime = {}
        activeGrids = {}
        # initialize last crime dict for the grids:
        for counterY in range(len(self.grids)):
            for counterX in range(len(self.grids)):
                tempGridNum = counterY * len(self.grids) + counterX
                tempDictLastCrime[tempGridNum] = tempStart
                if tempGridNum in hierObj.validGrids:
                    activeGrids[tempGridNum] = True
                else:
                    activeGrids[tempGridNum] = False

        bookmarkDictCurrRound = {}
        incidentCountPerGrid = {}
        while not timePeriodOver:
            # store as gridNum, crimeTime
            predictedCrimes = []
            # Iterate over each grid
            for counterY in range(len(hierObj.grids)):
                for counterX in range(len(hierObj.grids)):
                    tempGridNum = counterY * len(hierObj.grids) + counterX
                    if tempGridNum in hierObj.validGrids and activeGrids[tempGridNum]:
                        # predict time to next crime for each grid
                        nextCrimeGrid = self.sampleIncidents(tempGridNum, tempDictLastCrime[tempGridNum])
                        if nextCrimeGrid < tempEnd:
                            predictedCrimes.append([tempGridNum, nextCrimeGrid])
                            # sampled crimes
                    if tempGridNum in self.validGrids:
                        bookmarkDictCurrRound[tempGridNum] = True

            # sort crimes
            predictedCrimes = sorted(predictedCrimes, key=itemgetter(1))
            if len(predictedCrimes) == 0:
                break
            # iteratively start looking at crimes.
            for counter in range(len(predictedCrimes)):
                # find grid c_j with least time to occurrence
                currCrime = predictedCrimes[counter][1]
                currGrid = predictedCrimes[counter][0]
                # check to see if the all remaining crimes are out of time range
                # this can be checked at the 0th crime in every round.
                # at some later counter, crimes can be outside time but they can still get reset, so ignore them.
                # if counter == 0:
                #     if isTimePeriodOver(activeGrids):
                #     #if currCrime >= tempEnd:
                #         timePeriodOver = True
                #         break
                # check if grid is active and event is in the same time zone we are looking at
                if activeGrids[currGrid] and currCrime < tempEnd and self.incidentCountPerGrid[currGrid] > 0:
                    # update crime counter:
                    predCount += 1
                    # if self.verbose: print("Accident at : " + str(predictedCrimes[counter]))
                    totalPredictions.append(predictedCrimes[counter])
                    # for all k in I(j)
                    for grid in self.influencePerGrid[currGrid]:
                        # mark as false in active grids
                        activeGrids[grid] = False
                        bookmarkDictCurrRound[grid] = False
                        # update lastCrime
                        tempDictLastCrime[grid] = currCrime

            for counterY in range(len(self.grids)):
                for counterX in range(len(self.grids)):
                    tempGridNum = counterY * len(self.grids) + counterX
                    if tempGridNum in self.validGrids:
                        if bookmarkDictCurrRound[tempGridNum] == False:
                            activeGrids[tempGridNum] = True
                        else:
                            activeGrids[tempGridNum] = False

    print("Total Number of crimes predicted is " + str(predCount))
    return totalPredictions

def getInterArrivalData():
    pass

def setup():
    grids = np.load(ConfigSectionMap(Config, "filePaths")["grids"])
    numGrids = len(grids) * len(grids[0])
    # setup reverse coordinates
    reverseCoordinate = {}
    for counterY in range(len(grids)):
        for counterX in range(len(grids)):
            gridNum = counterY * len(grids) + counterX
            reverseCoordinate[gridNum] = (grids[counterY][counterX][0] + grids[counterY][counterX][
                1]) / float(2)
    with open('reverseCoords', 'w') as f:
        pickle.dump(reverseCoordinate, f)

    #get inter-arrival data for incidents
    gridInterArrivals = np.load(ConfigSectionMap(Config, "filePaths")["gridinterarrivals"])
    rangeX, rangeY = gridInterArrivals.shape

    '''Read valid grids created by gridProcessing.py.'''
    ''':::: shapely conflicts with this version of python::::'''
    fileNameValidGrids = ConfigSectionMap(Config, "filePaths")["validgrids"]

def predictIncidents():
    #check if hierarchical learning has already been done
    hierModelLearned = False if (str(ConfigSectionMap(Config, "codeParam")["hiermodellearned"])) == "False" else True

    if not hierModelLearned:
        runHierarchicalSurvivalAnalysis()
    else:
        fileNameClusters = ConfigSectionMap(Config, "filePaths")["clusters"]
        clusters = pickle.load(open(fileNameClusters, 'rb'))


