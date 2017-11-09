import ConfigParser
import numpy as np
from math import copysign
import pickle
import os
from operator import add
from helper import *
from data import setupData, getGridStaticFeatures
from HROCQ import optimizeResponderPlacement
import pandas as pd
import os
from rpy2.robjects.packages import importr
from rpy2.robjects.vectors import DataFrame
from rpy2.robjects import Formula
import pandas.rpy.common as com
#from simulator import *
from data import getEventDynamicFeatures
import uuid
#import dill
#from pathos.multiprocessing import Pool
from mdp import createProbabilityTable,doPolicyIteration
import cPickle as cp
import platform
from simulator import runSimulator
from simulator import simulator
from multiprocessing import Pool
import os

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

Config = ConfigParser.ConfigParser()
if 'Linux' in platform.platform():
    Config.read("paramsLinux.conf")
else:
    Config.read("params.conf")
codePath = os.getcwd()


#import r objects
survival = importr('survival')
#stats = importr('stats')
stats = importr('stats', robject_translations={'format_perc': '_format_perc'})
reg = survival.survreg
Surv = survival.Surv
coef = stats.coef

def predictCreateSimulate(input):
    hierObj = input[0]
    numSimulation = input[1]
    print "Running Simulation {} on process {}".format(numSimulation,os.getpid())
    hierObj.preProcessPrediction()
    predictions = hierObj.predict()
    print "Finished Prediction"
    hierObj.bestAssignment = pickle.load(open(hierObj.bestAssignmentFile, 'rb'))
    runSimulator(hierObj)

def run(dashboardPredict = False):
    #when dashboard predict is supplied as true, the code returns predictions and hands over control
    #back to the dashboard code body
    #purpose is a set of comma-separated keywords
    # run hierarchical survival analysis
    hierObj = HierarchicalSurv()
    if hierObj.purpose["runhierarchical"]:
        hierObj.setupClusters()
        hierObj.runHierarchicalSurvivalAnalysis()
    else:
        hierObj.clusters = pickle.load(open(hierObj.bestClusterFile, 'rb'))

    if hierObj.purpose["hrocq"]:
        optimizeResponderPlacement(hierObj)
    else:
        hierObj.bestAssignment = pickle.load(open(hierObj.bestAssignmentFile, 'rb'))

    if hierObj.purpose["predict"] or hierObj.purpose["hrocq"] or hierObj.purpose["simulate"]:
        for counter in range(hierObj.numSimulations):
            print "Simulating run : " + str(counter)
            if hierObj.purpose["predict"]:
                hierObj.preProcessPrediction()
                predictions = hierObj.predict(dashboardPredict)
                print "Finished Prediction"
                if dashboardPredict:
                    return predictions
            else:
                files = os.listdir(os.getcwd() + "/data")
                for f in files:
                    if "predictions" in f:
                        with open(os.getcwd()+"/data/"+f, 'rb') as file:
                            hierObj.totalPredictions = pickle.load(file)
                            break

            if hierObj.purpose["simulate"]:
                simulatorObj = simulator(hierObj)
                simulatorObj.simulate()
                print "Finished Simulation"

            #clean up temporary files
            os.remove(hierObj.pickleFilePredictions)

    print "Finished Simulation"
    #create probability table
    if hierObj.purpose["createprob"]:
        createProbabilityTable(hierObj)

    if hierObj.purpose["mdp"]:
        hierObj.bestAssignment = pickle.load(open(hierObj.bestAssignmentFile, 'rb'))
        hierObj.retrieveKeyOrdering()
        hierObj.preProcessPrediction()
        #get marginal scales for each grid: to calculate betas
        hierObj.scaleGrid = {}
        for grid in hierObj.validGrids:
            hierObj.scaleGrid[grid] = hierObj.marginalGridScale(grid)

        a, b, f_File, d, q, st = identifyFiles()
        ########
        #fileNameProbTable = "probTable5171ee0c-b511-444b-a1ac-7e9e7951207f.pickle"
        ########
        #read the probability table files and run mdp directly
        # with open(a, 'rb') as f:
        #     probTableA = pickle.load(f)
        # with open(b, 'rb') as f:
        #     probTableB = pickle.load(f)
        # with open(f_File, 'rb') as f:
        #     probTableF = pickle.load(f)
        # with open(d, 'rb') as f:
        #     probTableD = pickle.load(f)
        # with open(q, 'rb') as f:
        #     probTableQ = pickle.load(f)
        doPolicyIteration(a,f_File,d,q,b,st,hierObj,0.2)

def identifyFiles():
    files = os.listdir(os.getcwd()+'/probTable')
    a = ''
    b = ''
    f = ''
    d = ''
    q = ''
    st = ''
    for file in files:
        print file
        if 'AStorage' in file:
            a = file
        elif 'BStorage' in file:
            b = file
        elif 'FStorage' in file:
            f = file
        elif 'DStorage' in file:
            d = file
        elif 'QStorage' in file:
            q = file
        elif 'StateTransition' in file:
            st = file
    return a,b,f,d,q,st

class HierarchicalSurv():

    #set up helper objects and filepaths
    def __init__(self):
        #setup code structure
        setupRun(self)
        setupFilePaths(self)
        setupRObjects(self)
        setupConfig(self)
        setupData(self)
        setupFileNames(self)

        #setup formulae
        self.exponLikelihood = lambda scale, time: np.log(1/float(scale)) * np.exp(-time/float(scale)) if float(scale) !=0 else 0
        self.getSign = lambda num : copysign(1, num)

    def setupClusters(self):
        # each grid is initially a cluster: clusters are a list of lists
        # structure : cluster id, [grid ids in cluster], cluster data mean
        # As clusters keep getting merged, the lists start getting shorter
        # ids are replaced by -1
        self.clusters = np.empty(self.numGrids, dtype=object)
        for counter in range(len(self.clusters)):
            # add data without the grid ID. The last entry is thus only the feature list
            # last but one entry is a dictionary for storing parameters calculated for the clusters
            # last entry is to see if this cluster is active. Better than deleting the cluster as deleting from a
            # numpy array is very expensive
            if counter in self.validGrids:
                self.clusters[counter] = [counter, [self.gridStatic[counter][0]], self.gridStatic[counter][1:], {},
                                          True]
            else:
                self.clusters[counter] = [counter, [self.gridStatic[counter][0]], self.gridStatic[counter][1:], {},
                                          False]

        if self.verbose:
            print "Set up clusters"

    def doClustering(self, numIter):
        # find the closeness among the existing clusters
        if numIter == 0:
            self.findClosenessMatrix()
        # find the closest clusters
        gridsToMergeI, gridsToMergeJ = self.findGridsToMerge()
        if self.verbose or self.debug:
            print "Merging clusters " + str(self.clusters[gridsToMergeI][0]) + " and " + str(
                self.clusters[gridsToMergeJ][0])
        # merge the two closest clusters
        self.mergeGrids(gridsToMergeI, gridsToMergeJ, numIter)

    # find the grids to merge: check the two grids that are the closest
    def findGridsToMerge(self):
        try:
            minVal = self.closenessMatrix.min()
            if minVal == 1e20:
                print "Only invalid clusters left"
            i, j = np.unravel_index(self.closenessMatrix.argmin(), self.closenessMatrix.shape)
        except ValueError:
            print "Value error while calculating grids to merge"
            raise ValueError
        if self.debug:
            print "The minimum is found at positions : " + str(i) + "," + str(j)
        return i, j

    def mergeGrids(self, i, j, numIter):
        # sanity check: dimension of the closeness matrix must be equal to dim(numCluster) * dim(numClusters)
        # if self.closenessMatrix.shape[0] != len(self.clusters):
        #     raise Exception("Incorrect size of closeness matrix")

        # if self.verbose:
        #     print "Number of clusters before merge is " + str(len(self.clusters))

        # merge clusters
        oldMean = self.clusters[i][2]
        oldEntry = [element * len(self.clusters[i][1]) for element in oldMean]
        newEntry = [element * len(self.clusters[j][1]) for element in self.clusters[j][2]]
        try:
            newSum = map(add, oldEntry, newEntry)
        except TypeError:
            print "Type Error in summing means"
            raise TypeError
        newMean = [element / float(len(self.clusters[i][1]) + len(self.clusters[j][1])) for element in newSum]

        # update the new mean:
        self.clusters[i][2] = newMean
        # update the grids that are in the cluster:
        self.clusters[i][1].extend(self.clusters[j][1])

        self.clusters[j][4] = False
        # delete the cluster that has been used to merge
        # self.clusters = np.delete(self.clusters,j,0)

        if self.verbose:
            print "Number of clusters after merge is " + str(len([m for m in self.clusters if m[4] == True]))

        pickleFile = codePath + "/debugDump/clusterDump/currentClusters" + self.data + "_" + str(numIter)
        with open(pickleFile, 'w') as clusterFile:
            pickle.dump(self.clusters, clusterFile)

        # update closeness matrix: distance with the new cluster has to be modified for all other clusters
        i = self.clusters[i]
        iCounter = i[0]
        for k in self.clusters:
            kCounter = k[0]
            if k[4] == True:
                # if self.debug:
                #    print "Finding similarities between clusters " + str(i[0]) + " and " + str(j[0])
                d = 0
                # create large value for d if grids are not in the map. Prevent from getting selected

                if self.invalidGridInCluster(i) or self.invalidGridInCluster(k):
                    d = 1e40
                else:
                    try:
                        for featureCounter in range(0, len(i[2])):
                            d += (i[2][featureCounter] - k[2][featureCounter]) ** 2
                    except IndexError:
                        print "i[2] is : " + str(i[2])
                        print "k[2] is : " + str(k[2])
                        raise IndexError
                self.closenessMatrix[iCounter, kCounter] = np.sqrt(d)
                self.closenessMatrix[kCounter, iCounter] = np.sqrt(d)

            else:
                self.closenessMatrix[iCounter, kCounter] = 1e20
                self.closenessMatrix[kCounter, iCounter] = 1e20

        # now, for the cluster that was just consumed, entries must be made so that they are not considered anymore
        j = self.clusters[j]
        jCounter = j[0]
        if self.clusters[jCounter][4] == "True":
            print "ERROR: Cluster that was consumed is still active"
            raise Exception("Cluster Merge Error")
        for k in self.clusters:
            kCounter = k[0]
            self.closenessMatrix[jCounter, kCounter] = 1e20
            self.closenessMatrix[kCounter, jCounter] = 1e20

        self.closenessMatrix[np.diag_indices_from(self.closenessMatrix)] = 1e20

    def learnSurvivalModel(self,cluster):
        #convert to numpy array --> pandas dataframe

        gridsInCluster = cluster[1]
        #select data that lies in the cluster
        mask = (self.tempDF['gridNumber'].isin(gridsInCluster))
        tempDFCluster = self.tempDF[mask]
        if not tempDFCluster.empty:
            #rDf = com.convert_to_r_dataframe(tempDFCluster)
            # check if there are enough distinct values to run season and timeZone as factors in R
            # factors can be made only if all zones are present. Otherwise, in test, we might encounter covariates
            # that is not being seen in training
            distinctSeasons = True if tempDFCluster.season.nunique() == 3 else False
            distinctTimeZones = True if tempDFCluster.timeZone.nunique() == 6 else False

            #the gridNumber column is no longer needed
            tempDFCluster.drop('gridNumber',axis=1)
            rDf = com.convert_to_r_dataframe(tempDFCluster)

            rFormula = self.getRegressionFormula(distinctSeasons, distinctTimeZones)
            modelTemp = self.reg(Formula(rFormula), data=rDf, dist="weibull", scale=1)
            coefTemp = self.coef(modelTemp)

            # predict crimes for these grids only:
            scaleTemp = float(str(modelTemp[7][0]).rstrip())
            shapeTemp = 1 / float(float(scaleTemp))

            return shapeTemp, coefTemp, distinctSeasons, distinctTimeZones

        return None,None,None,None

    def getRegressionFormula(self,distinctSeason,distinctTimeZone):
        # create regression formula based on whether factors can be used or not, based on bool values received
        seasonText = "+ factor(season)"
        timeZoneText = "+ factor(timeZone)"
        if not distinctSeason:
            seasonText = ""
        if not distinctTimeZone:
            timeZoneText = ""

        rFormula = "Surv(interArrival,death) ~ rain + snow" + seasonText + timeZoneText + " + weekend + pastGrid2 +" \
                      " pastGrid7 + pastGrid30 + pastNeighbor2 + pastNeighbor7 + pastNeighbor30"

        return rFormula

    def survivalAnalysis(self):
        for cluster in self.clusters:
            if cluster[4]==True:#only learn for active clusters
                shapeTemp, coefTemp, distinctSeasons, distinctTimeZones = self.learnSurvivalModel(cluster)
                cluster[3]["shape"] = shapeTemp
                cluster[3]["coeff"] = coefTemp
                cluster[3]["distinctSeasons"] = distinctSeasons
                cluster[3]["distinctTimeZones"] = distinctTimeZones

    def getLikelihood(self):
        #get likelihood on test set using model trained on the training data
        print "Finding likelihood"
        numEventsNotInCluster = 0
        logL = 0
        crimesFound = 0
        totalEvents = 0
        for row in self.survRowsTestSet:
            #likelihood only for events
            if row[2] == 1: #death: event happened
                totalEvents += 1
                tempScale = self.getScaleGivenFeatuers(row)
                tTemp = row[1]
                if tempScale == None:
                    numEventsNotInCluster += 1
                    continue
                if np.isnan(tempScale):
                    continue
                templ = self.exponLikelihood(tempScale, tTemp)
                # print tempScale, tTemp
                if templ == -float("Inf"):
                    continue
                #print templ
                logL += templ
            else:
                continue
        return logL

    def runHierarchicalSurvivalAnalysis(self):
        #print "Running Surv Analysis for batch {}".format(self.batch)
        with open("test",'a') as dest:
            doClustering = True # keep doing clustering till we improve the prediction accuracy
            numIter = 0
            self.oldLikelihood = -1e10
            while doClustering:
                self.doClustering(numIter)
                numIter += 1
                if len([m for m in self.clusters if m[4] == True]) < 20:
                    self.tempDF = pd.DataFrame(np.array(self.survRows)[:, 0:14], columns=self.columnNamesFire)
                    self.survivalAnalysis()
                    newLikelihood = self.getLikelihood()
                    #newLikelihood = self.getLikelihoodStandardSurvival()
                    if self.verbose:
                        print "Likelihood in iteration {0} is {1}".format(numIter,newLikelihood)
                    if self.oldLikelihood - newLikelihood > self.sigma/float(numIter):
                        if self.verbose:
                            print "Tolerance in iteration {0} is {1}".format(numIter,self.sigma/float(numIter))
                            print "Gap in iteration {0} is {1}".format(numIter, self.oldLikelihood - newLikelihood)
                        doClustering = False
                        if self.verbose:
                            print "Hierarchical Survival Analysis converged after " + str(numIter) + " iterations"
                    else:
                        self.oldLikelihood = newLikelihood

                if len([m for m in self.clusters if m[4] == True]) < 4:
                    doClustering = False
                    print "Likelihood from Hierarchical Survival Analysis is {}".format(newLikelihood)

            print "Likelihood from Hierarchical Survival Analysis is {}".format(newLikelihood)

    def invalidGridInCluster(self,cluster):
        gridsInCluster = cluster[1]
        for grid in gridsInCluster:
            if grid not in self.validGrids:
                return True
        return False

    def findClosenessMatrix(self):
        # define closeness matrix in terms of number of clusters
        self.closenessMatrix = np.empty([self.numGrids, self.numGrids])
        # initialize closeness Matrix to large value
        self.closenessMatrix.fill(1e20)
        # cluster indices do not get updated. Even after a merge, we can have a cluster with original id
        # so define create indices and use these to fill indices

        for i in self.clusters:
            iCounter = i[0]
            if i[4] == True:  # check if i-th cluster is active or already has been merged to another cluster
                for j in self.clusters:
                    if j[4] == True:
                        jCounter = j[0]
                        # if self.debug:
                        #    print "Finding similarities between clusters " + str(i[0]) + " and " + str(j[0])
                        d = 0
                        # create large value for d if grids are not in the map. Prevent from getting selected
                        if self.invalidGridInCluster(i) or self.invalidGridInCluster(j):
                            d = 1e20
                        else:
                            try:
                                for featureCounter in range(0, len(i[2])):
                                    d += (i[2][featureCounter] - j[2][featureCounter]) ** 2
                            except IndexError:
                                print "i[2] is : " + str(i[2])
                                print "j[2] is : " + str(j[2])
                                raise IndexError
                        self.closenessMatrix[iCounter, jCounter] = np.sqrt(d)
        '''
        The diagonals are always 0 and would return when queried for min.
        Set the diagonals to extremely large values. Since we only query
        for min, this doesnt matter
        '''
        self.closenessMatrix[np.diag_indices_from(self.closenessMatrix)] = 1e20

    def preProcessPrediction(self):
        self.clusters = [i for i in self.clusters if i[-1] == True]
        # preprocesses the data from learning stage to use in the prediction state
        self.clusterForGridDict = {}
        self.incidentCountPerGrid = {}
        for counterY in range(len(self.grids)):
            for counterX in range(len(self.grids)):
                tempGridNum = counterY * len(self.grids) + counterX
                if tempGridNum in self.validGrids:
                    for counterC in range(len(self.clusters)):
                        if tempGridNum in self.clusters[counterC][1]:
                            self.clusterForGridDict[tempGridNum] = counterC

                # get the total number of incidents in this group
                mask = (self.eventTimesDF['coordX'] == counterX) & (self.eventTimesDF['coordY'] == counterY)
                tempData = self.eventTimesDF.loc[mask]
                self.incidentCountPerGrid[tempGridNum] = len(tempData)

    def predict(self,dashboardPredict=False):
        #input only to parallel process: no need to use
        #pickleFilePredictions = os.getcwd() + "/data/predictions" + str(uuid.uuid4())
        #prediction format used in hierarchicalSurvivalAnalysis Project:
        # x, y, t1, gridX, gridY, severity, gridNum, responseStation, alarmDateTime, arrivalDateTime,
        # lastUnitClearedTime]
        self.totalPredictions = []
        #number of time periods to predict
        numTimePeriods = int((self.endTimeTest - self.startTimeTest).total_seconds()/self.lenTimePeriod)
        # print "PREDICTING ONLY FOR 50 TIME PERIODS ::::: DEBUG MODE"
        # numTimePeriods = 50

        tempDictLastCrime = {}
        # initialize last crime dict for the grids:
        for counterY in range(len(self.grids)):
            for counterX in range(len(self.grids)):
                tempGridNum = counterY * len(self.grids) + counterX
                tempDictLastCrime[tempGridNum] = self.startTimeTest

        #for time period:
        for counterPeriod in range(numTimePeriods):
            # if counterPeriod%100==0:
            #     if self.verbose:
            #         print "Predicting for time period : " + str(counterPeriod)
            #for grid:
            for grid in self.validGrids:
                #multiple events can happen in one grid in one time period.
                #till time runs out in a particular grid, this flag is set to true
                gridActive = True
                tempStart = self.startTimeTest + timedelta(seconds=3600 * 4 * counterPeriod)
                tempEnd = tempStart + timedelta(seconds=3600 * 4)
                while gridActive:
                    #get grid specific features, if any
                    timeSample = self.__predict__(grid,tempStart)
                    if timeSample > tempEnd:
                        gridActive = False
                    else:
                        #move time to new incident
                        tempStart = timeSample
                        #update predictions
                        temp = []
                        temp.extend(self.reverseCoordinate[grid])
                        temp.append(timeSample)
                        temp.extend(self.reverseGrid[grid])
                        #severity is currently appended as 1
                        temp.append(1)
                        temp.append(grid)
                        self.totalPredictions.append(temp)

        if dashboardPredict: #no need to save predictions
            return self.totalPredictions

        with open(self.pickleFilePredictions, 'w') as f:
            pickle.dump(self.totalPredictions, f)

    def getWeatherProbability(self,weatherVar,weatherVal):
        # get the probability for a given value
        if weatherVar == "rain":
            # get cluster
            cluster = self.rainCluster.predict([weatherVal])[0]
            prob = self.rainClusterProb[cluster]
        if weatherVar == "temp":
            cluster = self.tempCluster.predict([weatherVal])[0]
            prob = self.tempClusterProb[cluster]
        if weatherVar == "timezone":
            return 1/float(6)
        if weatherVar == "season":
            return self.seasonProb[weatherVal]
        return prob

    def getDiscretizationForVariable(self,var):
        #given a variable, returns the discretization storage
        if var=="rain":
            return self.rainVal
        elif var=="temp":
            return self.tempVal
        elif var=="season":
            return self.seasonVal
        elif var=="timeZone":
            return self.timeZoneVal
        else:
            raise Exception("Discretization Not Available for variable {}".format(var))

    def marginalGridScale(self,grid):
        #for a grid, predict after marginalizing all temporal features
        density = 0
        clusterForGrid = self.clusterForGridDict[grid]
        clusterResults = self.clusters[clusterForGrid][3]
        clusterCoef = clusterResults['coeff']
        #temporal Features : rain, snow, seasons, timezone
        #initialize density
        density = 0
        #get whether seasons and timezones exists for this grid in the feature set
        timeZoneBool = clusterResults['distinctTimeZones']
        seasonBool = clusterResults['distinctSeasons']
        #create set of features applicable for this grid
        
        features = [1,self.meanRain, self.meanTemp]#include grid for scaleGivenFeatures Method
        if seasonBool:
            features.append(self.seasonMean)
        features.append(0)#for weekend
        if timeZoneBool:
            timeZoneVector = [0]*5
            timeZoneVector[self.timeZoneMean] = 1
            features.extend(self.timeZoneMean)


        features.append(self.gridIncidentAverage[grid]['gridHour'])
        features.append(self.gridIncidentAverage[grid]['gridWeek'])
        features.append(self.gridIncidentAverage[grid]['gridMonth'])
        features.append(self.gridIncidentAverage[grid]['gridHour'])
        features.append(self.gridIncidentAverage[grid]['gridHour'])
        features.append(self.gridIncidentAverage[grid]['gridHour'])

        scale = self.getScaleMarginal(features,clusterCoef)
        return scale

        #create feature list for grids:

        #initialize set of feature combinations
        # combinations = []
        # counterFeature = 0
        # for feature in featuresApplicable:
        #     counterFeature += 1
        #     discretization = self.getDiscretizationForVariable(feature)
        #     for val in discretization:
        #         if counterFeature == 1 : #if this is the first feature
        #             combinations.append([val])
        #         else:
        #             for combination in combinations:
        #                 combination.append(val)
        #
        # #add incident based fetures to this list
        # '''hierObj.gridIncidentAverage[grid] =
        # {'gridHour': pastEventCounterGrid2Hours / observationCountHour,
        # 'gridWeek': pastEventCounterGrid1Week / observationCountWeek,
        # 'gridMonth': pastEventCounterGrid1Month / observationCountMonth}
        #
        # [pastEventCounterGrid2Hours, pastEventCounterGrid1Week, pastEventCounterGrid1Month, \
        #                        pastEventCounterNeighbors2Hours, pastEventCounterNeighbors1Week,
        #                        pastEventCounterNeighbors1Month]
        # '''
        # for combination in combinations:
        #     combination.append(self.gridIncidentAverage[grid]['gridHour'])
        #     combination.append(self.gridIncidentAverage[grid]['gridWeek'])
        #     combination.append(self.gridIncidentAverage[grid]['gridMonth'])
        #     combination.append(self.gridIncidentAverage[grid]['gridHour'])
        #     combination.append(self.gridIncidentAverage[grid]['gridHour'])
        #     combination.append(self.gridIncidentAverage[grid]['gridHour'])
        #     '''
        #     combination.append(self.gridIncidentAverage[grid]['gridNeighHour'])
        #     combination.append(self.gridIncidentAverage[grid]['gridNeighWeek'])
        #     combination.append(self.gridIncidentAverage[grid]['gridNeighMonth'])
        #     '''
        #
        # print "Created Feature Combination for Marginalization"



        return density

    def __predict__(self,gridNum,startTime):
        #to be called only from the outer predict method, which processes data needed for prediction
        clusterForGrid = self.clusterForGridDict[gridNum]
        clusterResults = self.clusters[clusterForGrid][3]
        shape = 0
        scale = self.getScale(startTime, gridNum, clusterResults['coeff'], clusterResults['distinctSeasons'],
                              clusterResults['distinctTimeZones'])
        timeIntervalSampleSec = scale * np.random.weibull(1, 1)[0]
        try:
            timeSample = startTime + timedelta(seconds=timeIntervalSampleSec)
        except OverflowError:
            timeSample = startTime + timedelta(seconds=1e10)
        return timeSample

    def getScaleGivenMarginalFeatures(self,features,seasonFactor,timeZoneFactor):
        if seasonFactor:
            season = [0] * 2
            season[0] = 1 if features[2] == 1 else 0
            season[1] = 1 if features[2] == 2 else 0
        if timeZoneFactor:
            timeZone = [0] * 5
            currZone = int(features[3])
            if currZone != 0:
                timeZone[currZone - 1] = 0

    def getScaleGivenFeatuers(self,row):
        tempGridNum = row[0]
        # check which cluster this grid lies in
        for cluster in self.clusters:
            if tempGridNum in cluster[1]:
                coeff = cluster[3]["coeff"]
                foundGridInCluster = True
                break

        if not foundGridInCluster:
            return np.NaN

        features = row[3:]
        seasonFactor = cluster[3]["distinctSeasons"]
        timeZoneFactor = cluster[3]["distinctTimeZones"]

        # re-generate feature based on whether timezone and seasons can be used or not
        if seasonFactor:
            season = [0] * 2
            season[0] = 1 if features[2] == 1 else 0
            season[1] = 1 if features[2] == 2 else 0
        if timeZoneFactor:
            timeZone = [0] * 5
            currZone = int(features[3])
            if currZone != 0:
                timeZone[currZone - 1] = 0

        # insert the extended factor features
        if timeZoneFactor:
            features.pop(3)
            features[3:3] = timeZone
        else:
            features.pop(3)
        if seasonFactor:
            features.pop(2)
            features[2:2] = season
        else:
            features.pop(2)

        # insert the term for intercept:
        features.insert(0, 1)
        # sanity check
        # if len(coeff)!=len(features):
        #     print "Length of features is {0} and length of coeff is {1}".format(len(features),len(coeff))
        #     print "Error occured in cluster id {0} with grids {1}".format(clusterID,clusterGrids)
        #     raise Exception("Length of Survival Coeffs is not the same as the length of features")
        scalePower = 0
        for counter in range(len(coeff)):
            scalePower += coeff[counter] * features[counter]

        return np.exp(scalePower)

    def getScale(self, time, gridNum, coef, distinctSeasons, distinctTimeZones):
        # rain, "snow, "season1,"season2", "season3", "season4","timeSlot1", "timeSlot2",
        # "timeSlot3","timeSlot4", "timeSlot5", "timeSlot6","weekday"

        features = getEventDynamicFeatures([[None,None,gridNum,time]], self,"predict", distinctSeasons, distinctTimeZones)[0]
        if len(coef) != len(features):
            print "PREDICTION ERROR: FEATURE LENGTH AND COEFFICIENT LENGTH DO NOT MATCH"
        scalePower = 0
        for counter in range(len(coef)):
            scalePower += features[counter] * coef[counter]
            # print scalePower
        scalePower = np.exp(scalePower)
        return scalePower

    def getScaleMarginal(self,features,coef):
        if len(coef) != len(features):
            print "PREDICTION ERROR: FEATURE LENGTH AND COEFFICIENT LENGTH DO NOT MATCH"
        scalePower = 0
        for counter in range(len(coef)):
            scalePower += features[counter] * coef[counter]
            # print scalePower
        scalePower = np.exp(scalePower)
        return scalePower
    
    def retrieveKeyOrdering(self):
        #retrieves the saved order of keys for the mdp problem
        savePath = os.getcwd() + "/data/"
        with open(savePath + 'fOrderOuter.pickle', 'rb') as f:
            self.fOrderingOuter = pickle.load(f)
        with open(savePath + 'fOrderInner.pickle', 'rb') as f:
            self.fOrderingInner = pickle.load(f)
        with open(savePath + 'q.pickle', 'rb') as f:
            self.qOrdering = pickle.load(f)
        with open(savePath + 'd.pickle', 'rb') as f:
            self.dOrdering = pickle.load(f)
        


run()