const GeotabApi = require('mg-api-js');

const authentication = {
    credentials: {
        database: 'las2018',
        userName: 'IT@westmorecarriers.com',
        password: 'welcome123'
    },
    path: 'https://my.geotab.com'
}


const options = {
    rememberMe: true,
    timeout: 10,
}

const api = new GeotabApi(authentication, options);

api.authenticate( success => {
    console.log('Successful authentication');
}, (message, error) => {
    console.log('Something went wrong');
});

var fromDate = new Date("09/10/2025");
// var toDate = new Date("08/11/2025");


// let myCall = api.call("Get", {
//     typeName: "StatusData",
//     search: {
//         deviceSearch: {
//             id: '9010265'
//         },
//         diagnosticSearch: {
//             id: "DiagnosticOdometerId"
//         },
//         fromDate: fromDate,
//         toDate: toDate
//     }
// });


// let myCall = api.call('GetFeed', {
//     typeName: 'Trip',
//     search: {
//         fromDate: fromDate,
//     },
// });

// let myCall = api.call('Get', {
//     typeName: 'Device',
// });

// let myCall = api.call('Get', {
//     typeName: 'Group',
// });

// let myCall = api.call('Get', {
//     typeName: 'User',
//     search: {
//         name: 'npemba'
//     },
//     resultsLimit: 5,
// });

// let myCall = api.call('GetFeed', {
//     typeName: 'DeviceStatusInfo',
//     resultLimit: 100,
//     fromVersion: '0000000000040fda'
// });


// let myCall = api.call('GetFeed', {
//     typeName: 'DriverChange',
//     search: {
//         fromDate: today,
//     },
// });

// let myCall = api.call('GetFeed', {
//     typeName: 'DutyStatusLog',
//     search: {
//         fromDate: today,
//     },
//     fromVersion: "0000000007424851"
// });

// let myCall = api.call('GetFeed', {
//     typeName: 'ExceptionEvent',
//     search: {
//         fromDate: today,
//     },
// });

const today = new Date("09/11/2025");


let myCall = api.call('Get', {
    typeName: 'Rule',
});

myCall.then(
    data => {
        console.log(`Server response data: ${JSON.stringify(data, null, 2)}`)
        // const fOut = fs.createWriteStream('deviceStatusInfo.json');
        // process.stdout.write = fOut.write.bind(fOut);
        // console.log(JSON.stringify(data, null, 2));
    }
)
      .catch( error => console.log(error));

