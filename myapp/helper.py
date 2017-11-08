import ConfigParser
from rpy2.robjects.packages import importr
import platform
from datetime import datetime
import os
import uuid
import multiprocessing
import platform
import multiprocessing

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

def setupFilePaths(hierObj):
    Config = ConfigParser.ConfigParser()
    if 'Linux' in platform.platform():
        Config.read("paramsLinux.conf")
    else:
        Config.read("params.conf")
    hierObj.bestAssignmentFile = ConfigSectionMap(Config, "filePaths")["bestassignment"]
    hierObj.bestClusterFile = ConfigSectionMap(Config, "filePaths")["clusterassignment"]


def setupRObjects(hierObj):
    #setup the survival packages and the rpy2 objects
    hierObj.survival = importr('survival')
    #hierObj.flexSurv = importr('flexsurv')
    #hierObj.stats = importr('stats')
    hierObj.stats = importr('stats', robject_translations={'format_perc': '_format_perc'})
    hierObj.reg = hierObj.survival.survreg
    hierObj.Surv = hierObj.survival.Surv
    hierObj.coef = hierObj.stats.coef

def setupConfig(hierObj):
    #setup run mode and other config details
    hierObj.demo = True
    hierObj.run = False
    hierObj.verbose = True
    #crime type
    #convergence threshold
    hierObj.sigma =  float(ConfigSectionMap(Config, "survivalParams")["convergencethreshold"])
    #check if debugger is being used or not
    try:
        import pydevd
        hierObj.debug = False
        print "Debugging Code"
    except ImportError:
        hierObj.debug = False
        print "Not Debugging"

    currOS = platform.platform()
    cpus = multiprocessing.cpu_count()
    if "Linux" not in str(currOS):
        hierObj.maxThreads = cpus - 2
    else:
        hierObj.maxThreads = cpus - 10

    currOS = platform.platform()
    if "Linux" not in str(currOS):
        hierObj.maxThreads = cpus - 2
    else:
        hierObj.maxThreads = cpus - 10

def setupFileNames(hierObj):
    #names of files to read from or write to
    hierObj.pickleFilePredictions = os.getcwd() + "/data/predictions" + str(uuid.uuid4())

def setupRun(hierObj):
    #config specific to this run of the code
    #does the data implement censoring
    hierObj.censored = True if ConfigSectionMap(Config, "survivalParams")["censoring"] == 'T' else False

    #what data are we looking at:
    hierObj.data = ConfigSectionMap(Config, "dataParams")["data"]

    #start date and end date for the code run: for train set
    hierObj.startTime = datetime.strptime(ConfigSectionMap(Config, "dataParams")["startdatetrain"], '%b %d %Y')
    hierObj.endTime = datetime.strptime(ConfigSectionMap(Config, "dataParams")["enddatetrain"], '%b %d %Y')
    #start date and end date for the code run: the test set
    hierObj.startTimeTest = datetime.strptime(ConfigSectionMap(Config, "dataParams")["startdatetest"], '%b %d %Y')
    hierObj.endTimeTest = datetime.strptime(ConfigSectionMap(Config, "dataParams")["enddatetest"], '%b %d %Y')
    hierObj.lenTimePeriod = int(ConfigSectionMap(Config, "dataParams")["lentimeperiod"]) * 3600

    getCodePurpose(hierObj)

    #get number of simulations to run:
    hierObj.numSimulations = int(ConfigSectionMap(Config, "codeRun")["numsimulations"])
    #get maximum number of parallel processes to run
    #free cores:
    if 'Linux' in platform.platform():
        freeCores = 4
    else:
        freeCores = 1
    hierObj.maxThreads = multiprocessing.cpu_count() - freeCores




def getCodePurpose(hierObj):
    #gets the code purpose string from config and separates into
    #a bunch of binary flags in a dictionary
    allPurpose = ConfigSectionMap(Config, "codeRun")["allpurpose"]
    allPurpose = allPurpose.split(",")
    tempPurpose = ConfigSectionMap(Config, "codeRun")["purpose"]
    tempPurpose = tempPurpose.split(",")
    #purposeKeys = ["runHierarchical","predict","hrocq","simulate"]
    hierObj.purpose = {}
    for key in allPurpose:
        if key in tempPurpose:
            hierObj.purpose[key] = True
        else:
            hierObj.purpose[key] = False
