import numpy as np
from random import randint
import os
import pickle


def getPredictions(type="fire"):
    #type can either be fire or crime
    if type == "fire":
        if os.path.isfile('meanTraffic.txt'):
            exists = True
            with open('meanTraffic.txt','r+') as f:
                mean = float(f.readlines()[0])
        else:
            mean = 200

        if os.path.isfile('predictionsFireDashboard.pickle'):
            with open('predictionsFireDashboard.pickle','r+') as f:
                predictionsOutput = pickle.load(f)

            #sample poisson
            numSample = np.random.poisson(mean, 1)

            #return sampled values
            output = []
            for sampleCounter in range(0,numSample):
                indSample = randint(0,len(predictionsOutput))
                output.append(predictionsOutput[indSample])

            return output,"Successfully Generated Predictions"

        else:
            return []

getPredictions("fire")