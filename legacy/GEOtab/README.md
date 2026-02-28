# Playing around with Geotab

Getting familiar with the API. Tossing together a quick CLI version of the app so I can more easily identify a good approach to integrate with my backend.

Need to set the following environment variables:

```bash
export GEOUSER=""
export GEOPASS=""
```


## First, to find a vehicles information by Truck #:

```javascript
const callParams = {
    typeName: 'Device',
    search : {
        name: vName,
    },
    sort: {
        sortBy: 'name',
        sortDirection: 'asc',
    },
    propertySelector: {
       fields: ["device", "driver", 'isDriving', 'latitude', 'longitude', 'speed', 'bearing']
    },
}

const myCall = api.call('Get', callParams);

myCall.then( 
    data => {
        console.log(JSON.stringify(callParams, null, 2));
        console.log(JSON.stringify(data, null, 2));
    }
)
```

The above data will have the id of the go device (more than one possible)  Now!

### Get the device status and driver information
We could also do this from driver to vehicle.. Which may be interesting.... But for today we are going to do a fleet capture for the fleet table.

```javascript
const callParams = {
    typeName: 'DeviceStatusInfo',
    search: { isDriving: true },
    propertySelector: {
       fields: ["device", "driver", 'isDriving', 'latitude', 'longitude', 'speed', 'bearing', 'id' ]
    },
}

const myCall = api.call('Get', callParams);

```

The isDriving can be removed to get all devices even those not logged in?


## Now find the driver assigned to the truck?


From the DeviceStatusInfo we can pull the driver.id (if driver is an object and id exists).  That will allow us to pull the driver?

```javascript
const callParams = {
    typeName: 'User',
    propertySelector: {
       fields: ['firstName', 'lastName', 'name', 'employeeNo', 'id']
    },

}

if (dID && dID.length) {
    if (!callParams.hasOwnProperty('search')) {
        callParams.search = {}
    }
    callParams.search['id'] = dID 
}

if (dLogin && dLogin.length) {
    if (!callParams.hasOwnProperty('search')) {
        callParams.search = {}
    }
    callParams.search['name'] = dLogin 
}

const myCall = api.call('Get', callParams);
```