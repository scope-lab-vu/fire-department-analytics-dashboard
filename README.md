# Dashboard-vData

## Functionality

**> Historic mode**

- slider interval <= 14:
  - different markers indicating different types of incidents
  - select box, pie charts, bar charts of types
  - heat map toggle button
- slider interval > 14, markers will not display, only heat map will

**> Future mode**

- choose a department and a date to see predictions
- Click "retrain model" update model

**> Exploratory/Optimization mode**

- Display optimal placement of responders and depots
- Can customize depot locations


### Requirements
```
pymongo==3.5.0
flask-socketio==2.9.2
requests==2.18.4
pytz==2017.2
numpy==1.13.1
pyproj==1.9.5.1

gtfs-realtime-bindings==0.0.4
protobuf_to_dict==0.1.0
mongoengine==0.10.6
pykalman==0.9.5
numpydoc==0.5
scipy==0.16.1
scikit-learn==0.16.1
```